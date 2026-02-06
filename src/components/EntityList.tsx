import { Table } from "src/models/Table"
import { toCsv } from "src/services/csv"
import { downloadFile } from "src/services/files"
import SqlStore from "src/stores/SqlStore"
import ActionButton from "./ActionButton"

interface EntityListProps {
	readonly tables: Table[]
	readonly sqlStore: SqlStore
	readonly onSchemaChange: () => void
}

export default function EntityList(props: EntityListProps) {
	const { tables, sqlStore, onSchemaChange } = props

	async function download(tableName: string) {
		const [columns, data] = await sqlStore.getAllRows(tableName)
		const csv = await toCsv(columns, data)

		downloadFile(`${tableName}.csv`, csv)
	}

	async function drop(tableName: string) {
		await sqlStore.dropTable(tableName)

		onSchemaChange()
	}

	if (tables.length === 0) {
		return (
			<div className="flex-1 flex items-center justify-center p-4 text-base-content/40 text-sm">
				No tables imported
			</div>
		)
	}

	return (
		<ul className="menu menu-sm bg-base-100 flex-1 overflow-auto p-1">
			{tables.map((table, ix) => (
				<li key={ix}>
					<details id={`entityList-${table.name}`}>
						<summary className="flex flex-row justify-between">
							<span className="font-medium text-sm">
								{table.name}
							</span>
							<span className="flex gap-1">
								<ActionButton
									id={`downloadButton-${table.name}`}
									label="Download"
									variant="ghost"
									action={() => download(table.name)}
								/>
								<ActionButton
									id={`dropButton-${table.name}`}
									label="Drop"
									variant="error"
									action={() => drop(table.name)}
								/>
							</span>
						</summary>
						<ul className="ml-2 border-l border-base-300">
							{table.columns.map(
								(col: string, ic: number) => (
									<li key={ic}>
										<span className="text-xs text-base-content/60 py-0.5">
											{col}
										</span>
									</li>
								),
							)}
						</ul>
					</details>
				</li>
			))}
		</ul>
	)
}
