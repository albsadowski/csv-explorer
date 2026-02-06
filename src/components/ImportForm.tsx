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
	const [importing, setImporting] = useState(false)
	const [progress, setProgress] = useState<number>(0)

	async function onImport() {
		if (!file || !name || importing) {
			return
		}

		setImporting(true)

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

				const rows = data
					.slice(1)
					.map((row: any[]) => row.map(normalizeEntry))

				const CHUNK_SIZE = 50000
				for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
					const chunk = rows.slice(i, i + CHUNK_SIZE)
					await sqlStore.importRows(name, header, chunk)
					setProgress(
						Math.min(
							100,
							Math.round(
								((i + chunk.length) / rows.length) * 100,
							),
						),
					)
				}

				onDone()
			} catch (e) {
				console.error("Import failed:", e)
				setImporting(false)
			}
		}
		reader.onerror = (err) => {
			console.error(err)
			setImporting(false)
		}
	}

	return (
		<div id="importForm" className="flex flex-col gap-4">
			<h3 className="text-lg font-semibold">Import File</h3>
			{importing ? (
				<div className="flex flex-col items-center gap-3 py-6">
					<span className="loading loading-spinner loading-lg"></span>
					<span className="text-sm text-base-content/70">
						Importing {file?.name}...{" "}
						{progress > 0 && `${progress}%`}
					</span>
				</div>
			) : (
				<>
					<label className="form-control w-full">
						<div className="label">
							<span className="label-text">Table name</span>
						</div>
						<input
							className="input input-bordered w-full"
							type="text"
							placeholder="e.g. my_table"
							value={name}
							onChange={(evt) => setName(evt.target.value)}
						/>
					</label>
					<label className="form-control w-full">
						<div className="label">
							<span className="label-text">
								File (.csv or .xpt)
							</span>
						</div>
						<input
							type="file"
							accept=".csv,.xpt"
							className="file-input file-input-bordered w-full"
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
					</label>
				</>
			)}
			<div className="flex flex-row justify-end gap-2 mt-2">
				<ActionButton
					id="importForm-cancelButton"
					label="Cancel"
					variant="ghost"
					disabled={importing}
					action={onClose}
				/>
				<ActionButton
					id="importForm-importButton"
					disabled={!name || !file || importing}
					label="Import"
					variant="primary"
					action={onImport}
				/>
			</div>
		</div>
	)
}
