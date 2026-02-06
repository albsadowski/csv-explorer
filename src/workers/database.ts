import { KVStore } from "@dumpstate/ixdb-kv-store"
import { run } from "@dumpstate/web-worker-proxy"
import initSqlJs from "sql.js"
import { LOCAL_STORE_NAME, LOCAL_STORE_SQLITE_KEY } from "../constants"
import { ExtDatabase } from "../models/ExtDatabase"

async function createDatabase(): Promise<ExtDatabase> {
	try {
		const wasmUrl = "../wasm/sql-wasm-v1.wasm"
		const response = await fetch(wasmUrl)
		const wasmBinary = await response.arrayBuffer()

		const SQL = await initSqlJs({
			wasmBinary,
		})

		const localStore = await KVStore.tryCreate(LOCAL_STORE_NAME)
		const data = await localStore?.get<Uint8Array>(LOCAL_STORE_SQLITE_KEY)

		class _Database extends SQL.Database {
			async save(): Promise<void> {
				return localStore?.set(LOCAL_STORE_SQLITE_KEY, this.export())
			}
		}

		return new _Database(data)
	} catch (err) {
		console.error("Worker Error:", err)
		throw err
	}
}

run(createDatabase)
