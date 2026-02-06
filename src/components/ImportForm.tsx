import { useState } from "react"
import { parseCsv } from "src/services/csv"
import { parseXpt } from "src/services/xpt"
import SqlStore from "src/stores/SqlStore"
import ActionButton from "./ActionButton"

interface ImportFormProps {
	readonly sqlStore: SqlStore
	readonly onClose: () => void
	readonly onDone: () => void
}

function normalize(name: string): string {
	return name
		.split(/\s+/)
		.map((part) => part.replace(/\W/g, "").toLowerCase())
		.join("_")
}

function normalizeEntry(entry: any): string {
	if (entry === null || entry === undefined) {
		return ""
	}
	return String(entry).replace(/"/g, "").trim()
}

export default function ImportForm(props: ImportFormProps) {
	const { sqlStore, onClose, onDone } = props

	const [name, setName] = useState<string>("")
	const [file, setFile] = useState<File>()

	async function onImport() {
		if (!file || !name) {
			return
		}

		const isXpt = file.name.toLowerCase().endsWith(".xpt")
		const reader = new FileReader()

		if (isXpt) {
			reader.readAsArrayBuffer(file)
		} else {
			reader.readAsText(file, "utf-8")
		}

		reader.onload = async (evt) => {
			try {
				let data: any[][]
				if (isXpt) {
					data = await parseXpt(evt.target?.result as ArrayBuffer)
				} else {
					data = await parseCsv(evt.target?.result as string)
				}

				if (data.length === 0) {
					throw new Error("Parsed data is empty")
				}

				const header = data[0].map(normalize)
				await sqlStore.exec(
					`CREATE TABLE ${name} (${header.join(", ")})`,
				)

				for (const row of data.slice(1)) {
					const values = row
						.map(normalizeEntry)
						.map((entry) => `"${entry}"`)
						.join(", ")
					const stmt = `INSERT INTO ${name} VALUES (${values})`
					try {
						await sqlStore.exec(stmt)
					} catch (e) {}
				}
				onDone()
			} catch (e) {
				console.error("Import failed:", e)
			}
		}
		reader.onerror = (err) => {
			console.error(err)
			onDone()
		}
	}

	return (
		<div
			id="importForm"
			className="flex flex-col font-light text-sm p-2 space-y-4"
		>
			<div className="flex flex-row w-full space-x-4">
				<span className="self-center">Table name</span>
				<input
					className="grow p-1 border border-neutral-400 rounded text-black bg-white"
					type="text"
					value={name}
					onChange={(evt) => setName(evt.target.value)}
				/>
			</div>
			<input
				type="file"
				accept=".csv,.xpt"
				onChange={(evt) => {
					const selectedFile = evt.target.files?.[0]
					setFile(selectedFile)
					if (selectedFile && !name) {
						const baseName = selectedFile.name
							.split(".")[0]
							.replace(/\W/g, "_")
							.toLowerCase()
						setName(baseName)
					}
				}}
			/>
			<div className="flex flex-row justify-center">
				<ActionButton
					id="importForm-importButton"
					disabled={!name || !file}
					label="Import"
					action={onImport}
				/>
				<ActionButton
					id="importForm-cancelButton"
					label="Cancel"
					action={onClose}
				/>
			</div>
		</div>
	)
}
