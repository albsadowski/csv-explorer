import { ProxyType, workerProxy } from "@dumpstate/web-worker-proxy"
import { QueryExecResult } from "sql.js"
import { ExtDatabase } from "../models/ExtDatabase"

export default class SqlStore {
	private proxy: Promise<ProxyType<ExtDatabase>>

	constructor(dbWorkerScript: string) {
		this.proxy = workerProxy<ExtDatabase>(dbWorkerScript, {
			loadTimeout: 30000,
		})
	}

	public async getAllTables(): Promise<string[]> {
		const db = await this.proxy

		const res = await db.exec(`
            select name
            from sqlite_schema
            where type = 'table' and
                  name not like 'sqlite_%'
        `)

		return res.flatMap(({ values }) =>
			values.map((value) => value.toString()),
		)
	}

	public async dropTable(table: string): Promise<QueryExecResult[]> {
		const db = await this.proxy

		return db.exec(`drop table if exists ${table}`)
	}

	public async getColumns(table: string): Promise<string[]> {
		const db = await this.proxy
		const res = await db.exec(`pragma table_info(${table})`)

		return res.flatMap(({ values }) =>
			values.map((entry) => {
				const tableName = entry[1] as string
				const dataType = entry[2] as string

				if (dataType && dataType.length) {
					return `${tableName} (${dataType})`
				}

				return tableName
			}),
		)
	}

	public async getAllRows(table: string): Promise<[string[], any[]]> {
		const db = await this.proxy
		const res = await db.exec(`select * from ${table}`)

		if (!res || res.length === 0) {
			return [[], []]
		}

		const columns = res[0].columns
		const data: any[] = columns.reduce(
			(acc: any, col: string, cix: number) => {
				res[0].values.forEach((row, rix) => {
					acc[rix][col] = row[cix]
				})

				return acc
			},
			res[0].values.map(() => ({})),
		)

		return [columns, data]
	}

	public async save(): Promise<void> {
		const db = await this.proxy

		return db.save()
	}

	public async exec(stmt: string): Promise<QueryExecResult[]> {
		const db = await this.proxy

		return db.exec(stmt)
	}
}
