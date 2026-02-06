const rechk = /^([<>])?(([1-9]\d*)?([xcbB?hHiIfdsp]))*$/
const refmt = /([1-9]\d*)?([xcbB?hHiIfdsp])/g
const str = (v: DataView, o: number, c: number) =>
	String.fromCharCode(...new Uint8Array(v.buffer, v.byteOffset + o, c))
const rts = (v: DataView, o: number, c: number, s: string) =>
	new Uint8Array(v.buffer, v.byteOffset + o, c).set(
		s.split("").map((str) => str.charCodeAt(0)),
	)

const lut = (
	le: boolean,
): Record<
	string,
	(c: number) => [
		number,
		number,
		((o: number) => {
			u: (v: DataView) => any
			p: (v: DataView, val: any) => void
		})?,
	]
> => ({
	x: (c) => [1, c, undefined],
	c: (c) => [
		c,
		1,
		(o) => ({ u: (v) => str(v, o, 1), p: (v, c) => rts(v, o, 1, c) }),
	],
	"?": (c) => [
		c,
		1,
		(o) => ({
			u: (v) => Boolean(v.getUint8(o)),
			p: (v, B) => v.setUint8(o, B),
		}),
	],
	b: (c) => [
		c,
		1,
		(o) => ({ u: (v) => v.getInt8(o), p: (v, b) => v.setInt8(o, b) }),
	],
	B: (c) => [
		c,
		1,
		(o) => ({ u: (v) => v.getUint8(o), p: (v, B) => v.setUint8(o, B) }),
	],
	h: (c) => [
		c,
		2,
		(o) => ({
			u: (v) => v.getInt16(o, le),
			p: (v, h) => v.setInt16(o, h, le),
		}),
	],
	H: (c) => [
		c,
		2,
		(o) => ({
			u: (v) => v.getUint16(o, le),
			p: (v, H) => v.setUint16(o, H, le),
		}),
	],
	i: (c) => [
		c,
		4,
		(o) => ({
			u: (v) => v.getInt32(o, le),
			p: (v, i) => v.setInt32(o, i, le),
		}),
	],
	I: (c) => [
		c,
		4,
		(o) => ({
			u: (v) => v.getUint32(o, le),
			p: (v, I) => v.setUint32(o, I, le),
		}),
	],
	f: (c) => [
		c,
		4,
		(o) => ({
			u: (v) => v.getFloat32(o, le),
			p: (v, f) => v.setFloat32(o, f, le),
		}),
	],
	d: (c) => [
		c,
		8,
		(o) => ({
			u: (v) => v.getFloat64(o, le),
			p: (v, d) => v.setFloat64(o, d, le),
		}),
	],
	s: (c) => [
		1,
		c,
		(o) => ({
			u: (v) => str(v, o, c),
			p: (v, s) => rts(v, o, c, s.slice(0, c)),
		}),
	],
})

function struct(format: string) {
	const fns: {
		u: (v: DataView) => any
		p: (v: DataView, val: any) => void
	}[] = []
	let size = 0
	let m = rechk.exec(format)
	if (!m) {
		throw new RangeError("Invalid format string")
	}
	const t = lut(m[1] === "<")
	const lu = (n: string, c: string) => t[c](n ? parseInt(n, 10) : 1)
	let match
	while ((match = refmt.exec(format))) {
		const [r, s, f] = lu(match[1], match[2])
		for (let i = 0; i < r; ++i, size += s) {
			if (f) {
				fns.push(f(size))
			}
		}
	}
	return {
		unpack: (arrb: ArrayBuffer) => {
			const v = new DataView(arrb)
			return fns.map((f) => f.u(v))
		},
		size,
	}
}

const ibm2ieee = (buffer: Uint8Array) => {
	const isMissingValue = (buf: Uint8Array) => {
		const firstByte = buf[0]
		if (
			firstByte === 0x5f ||
			firstByte === 0x2e ||
			(firstByte >= 0x41 && firstByte <= 0x5a)
		) {
			for (let i = 1; i < buf.length; i++) {
				if (buf[i] !== 0x00) return false
			}
			return true
		}
		return false
	}

	if (isMissingValue(buffer)) {
		return null
	}

	const bit = (buf: Uint8Array, b: number) => {
		return (buf[Math.floor(b / 8)] >> (7 - (b % 8))) & 1
	}

	const sign = buffer[0] >> 7
	const exponent = buffer[0] & 0x7f
	let fraction = 0
	let denom = 1
	const totalBit = (buffer.length - 1) * 8
	for (let i = 0; i < totalBit; i++) {
		denom = denom * 2
		fraction += bit(buffer, 8 + i) / denom
	}
	return (1 - 2 * sign) * Math.pow(16.0, exponent - 64) * fraction
}

class Variable {
	name: string = ""
	type: "Num" | "Char" = "Num"
	length: number = 0
	varNum: number = 0

	constructor(raw: Uint8Array, fmt: string) {
		const varStruct = struct(fmt)
		const arrBuf = raw.buffer.slice(
			raw.byteOffset,
			raw.byteOffset + raw.byteLength,
		)
		const varMeta = varStruct.unpack(arrBuf as ArrayBuffer)
		this.type = varMeta[0] === 1 ? "Num" : "Char"
		this.length = varMeta[2]
		this.varNum = varMeta[3]
		this.name = (varMeta[4] as string).trim()
	}
}

export async function parseXpt(buffer: ArrayBuffer): Promise<any[][]> {
	const data = new Uint8Array(buffer)
	const textDecoder = new TextDecoder("ascii")

	// Simple helper to find a string in Uint8Array
	function findString(
		data: Uint8Array,
		str: string,
		startPos: number = 0,
	): number {
		const strData = new TextEncoder().encode(str)
		for (let i = startPos; i <= data.length - strData.length; i++) {
			let match = true
			for (let j = 0; j < strData.length; j++) {
				if (data[i + j] !== strData[j]) {
					match = false
					break
				}
			}
			if (match) return i
		}
		return -1
	}

	// Find member header
	const obsString = "HEADER RECORD*******OBS"
	const obsIndex = findString(data, obsString)
	if (obsIndex === -1) {
		throw new Error("Invalid XPT file: OBS header not found")
	}
	const obsStart = obsIndex + 80

	// Parse member metadata
	const memberHeaderString = "HEADER RECORD*******MEMBER"
	const memberHeaderIndex = findString(data, memberHeaderString)
	if (memberHeaderIndex === -1) {
		throw new Error("Invalid XPT file: MEMBER header not found")
	}

	// Descriptor size can be 140 or 136
	const descriptorMetaStr = textDecoder.decode(
		data.subarray(memberHeaderIndex, memberHeaderIndex + 160),
	)
	const descriptorMatch = /160{8}(?<descriptorSize>140|136) {2}/.exec(
		descriptorMetaStr,
	)
	const descriptorSize = parseInt(
		descriptorMatch?.groups?.descriptorSize || "140",
	)

	let format
	if (descriptorSize === 140) {
		format = ">hhhh8s40s8shhh2s8shhi52s"
	} else {
		format = ">hhhh8s40s8shhh2s8shhi48s"
	}

	const namestrHeaderString = "HEADER RECORD*******NAMESTR"
	const namestrHeaderIndex = findString(data, namestrHeaderString)
	if (namestrHeaderIndex === -1) {
		throw new Error("Invalid XPT file: NAMESTR header not found")
	}

	const namestrMetaStr = textDecoder.decode(
		data.subarray(namestrHeaderIndex, namestrHeaderIndex + 80),
	)
	const numVarsMatch =
		/HEADER RECORD\*{7}NAMESTR HEADER RECORD!{7}0{6}(?<numVars>.{4})0{20}/.exec(
			namestrMetaStr,
		)
	const numVars = parseInt(numVarsMatch?.groups?.numVars || "0")

	const variables: Variable[] = []
	let currentMetaPos = namestrHeaderIndex + 80
	for (let i = 0; i < numVars; i++) {
		variables.push(
			new Variable(
				data.subarray(currentMetaPos, currentMetaPos + descriptorSize),
				format,
			),
		)
		currentMetaPos += descriptorSize
	}

	variables.sort((a, b) => a.varNum - b.varNum)

	// Read data
	const result: any[][] = []
	result.push(variables.map((v) => v.name))

	const obsSize = variables.reduce((sum, v) => sum + v.length, 0)
	if (obsSize === 0) {
		return result
	}

	let currentPos = obsStart
	while (currentPos + obsSize <= data.length) {
		const row: any[] = []
		for (const variable of variables) {
			const valBuffer = data.subarray(
				currentPos,
				currentPos + variable.length,
			)
			if (variable.type === "Num") {
				row.push(ibm2ieee(valBuffer))
			} else {
				row.push(textDecoder.decode(valBuffer).trim())
			}
			currentPos += variable.length
		}
		result.push(row)
	}

	return result
}
