export interface Cache<T> {
	set(value: T): Promise<void>
	get(): Promise<T>
}

const APP_NAME = "CSVExplorer"

function ixdb() {
	if (typeof window != "undefined") {
		return window.indexedDB
	}

	if (typeof self != "undefined") {
		return self.indexedDB
	}

	throw Error("Unable to acquire IndexedDB")
}

function newCache(
	appName: string,
	version: number,
	name: string,
): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const req = ixdb().open(appName, version)

		req.onerror = (evt) => {
			reject(
				new Error(
					`IndexedDB error: ${(evt?.target as any)?.errorCode}`,
				),
			)
		}

		req.onsuccess = (evt) => {
			const db = (evt?.target as any)?.result

			if (!db) {
				reject(new Error(`Failed to instantiate IndexedDB`))
			} else {
				resolve(db)
			}
		}

		req.onupgradeneeded = (evt) => {
			const db = (evt?.target as any)?.result

			db.createObjectStore(name)
		}
	})
}

export async function cache<T>(name: string, version = 1): Promise<Cache<T>> {
	const db = await newCache(`${APP_NAME}.${name}`, version, name)
	const key = `${name}:1`

	return {
		set(value: T): Promise<void> {
			const store = db.transaction(name, "readwrite").objectStore(name)

			return new Promise<void>((resolve, reject) => {
				const req = store.put(value, key)

				req.onsuccess = () => resolve()
				req.onerror = (evt) => {
					reject(
						new Error(
							`Failed to persist in cache: ${
								(evt?.target as any)?.errorCode
							}`,
						),
					)
				}
			})
		},

		get(): Promise<T> {
			const store = db.transaction(name, "readonly").objectStore(name)

			return new Promise<T>((resolve, reject) => {
				const req = store.get(key)

				req.onsuccess = () => {
					resolve(req.result)
				}
				req.onerror = (evt) => {
					reject(
						new Error(
							`Failed to fetch from cache: ${
								(evt?.target as any)?.errorCode
							}`,
						),
					)
				}
			})
		},
	}
}
