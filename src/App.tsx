import { KVStore } from "@dumpstate/ixdb-kv-store"
import Editor from "@monaco-editor/react"
import { ReactNode, useEffect, useState } from "react"

import ActionButton from "./components/ActionButton"
import Split, { Orientation } from "./components/Split"
import EntityList from "./components/EntityList"
import Modal from "./components/Modal"
import ImportForm from "./components/ImportForm"
import Spreadsheet from "./components/Spreadsheet"
import { Table } from "./models/Table"
import SqlStore from "./stores/SqlStore"
import { LOCAL_STORE_NAME, LOCAL_STORE_QUERY_KEY } from "./constants"

interface AppProps {
	readonly sqlStore: SqlStore
}

interface ActionBarProps {
	children: ReactNode | ReactNode[]
}

function ActionBar(props: ActionBarProps) {
	return (
		<div className="flex flex-row items-center gap-1 bg-base-200 px-2 py-1 border-b border-base-300">
			{props.children}
		</div>
	)
}

export default function App(props: AppProps) {
	const { sqlStore } = props

	const [query, setQuery] = useState<string>("")
	const [queryError, setQueryError] = useState<string>()
	const [result, setResult] = useState<any[] | null>()
	const [tables, setTables] = useState<Table[]>([])
	const [showImportModal, setShowImportModal] = useState<boolean>(false)
	const [localStore, setLocalStore] = useState<KVStore | null>()

	useEffect(() => {
		const init = async () => {
			await loadTables()

			const localStore = await KVStore.tryCreate(LOCAL_STORE_NAME)
			const cachedQuery = await localStore?.get<string>(
				LOCAL_STORE_QUERY_KEY,
			)
			cachedQuery && setQuery(cachedQuery)
			setLocalStore(localStore)
		}

		init()
	}, [])

	async function onEditorChange(query: string | null | undefined) {
		if (query !== null && query !== undefined) {
			await localStore?.set(LOCAL_STORE_QUERY_KEY, query)

			setQuery(query)
		}
	}

	async function loadTables() {
		const tableNames = await sqlStore.getAllTables()
		const tables = await Promise.all(
			tableNames.map(async (table) => ({
				name: table,
				columns: await sqlStore.getColumns(table),
			})),
		)

		setTables(tables)
	}

	async function runQuery() {
		try {
			const res = await sqlStore.exec(query)
			await loadTables()
			setResult(res)
		} catch (err: any) {
			console.error(err)
			setQueryError(err.message)
			setResult(null)
		}
	}

	async function save() {
		await sqlStore.save()
	}

	return (
		<div className="h-full flex flex-col bg-base-100">
			<div className="navbar bg-base-200 border-b border-base-300 px-4 min-h-0 py-1">
				<div className="flex-1">
					<span className="text-lg font-semibold">CSV Explorer</span>
				</div>
				<div className="flex-none flex gap-1">
					<ActionButton
						id="importCsvButton"
						label="Import File"
						variant="outline"
						action={() => setShowImportModal(true)}
					/>
					<ActionButton
						id="saveButton"
						label="Save"
						variant="ghost"
						action={save}
					/>
				</div>
			</div>
			<div className="flex-1 overflow-hidden">
				<Split>
					<div className="flex flex-col h-full">
						<div className="px-2 py-2 text-sm font-medium text-base-content/70 bg-base-200 border-b border-base-300">
							Tables
						</div>
						<EntityList
							tables={tables}
							sqlStore={sqlStore}
							onSchemaChange={loadTables}
						/>
					</div>
					<Split orientation={Orientation.Vertical}>
						<div
							id="editorPane"
							className="w-full h-full flex flex-col"
						>
							<ActionBar>
								<ActionButton
									id="runButton"
									label="Run"
									variant="primary"
									action={runQuery}
								/>
							</ActionBar>
							<div id="editor" className="grow overflow-auto">
								<Editor
									defaultLanguage="sql"
									defaultValue={query}
									value={query}
									onChange={(value) => onEditorChange(value)}
								/>
							</div>
						</div>
						<Spreadsheet data={result} error={queryError} />
					</Split>
				</Split>
			</div>
			{showImportModal && (
				<Modal>
					<ImportForm
						sqlStore={sqlStore}
						onClose={() => setShowImportModal(false)}
						onDone={async () => {
							await loadTables()
							setShowImportModal(false)
						}}
					/>
				</Modal>
			)}
		</div>
	)
}
