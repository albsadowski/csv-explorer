import { Database } from "sql.js"

export interface ExtDatabase extends Database {
	save: () => Promise<void>
	importRows: (table: string, columns: string[], rows: string[][]) => void
}
