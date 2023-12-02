import { PLATFORM, LOCAL_DEFAULT, SYNC_DEFAULT } from './defaults'
import parse from './utils/parse'

type Keyval = {
	[key: string]: unknown
}

type StartupStorage = {
	sync: Sync.Storage | null
	local: Local.Storage | null
}

declare global {
	interface Window {
		startupStorage?: StartupStorage
	}
}

type Storage = {
	sync: {
		get: (key?: string | string[]) => Promise<Sync.Storage>
		set: (val: Keyval) => void
		remove: (key: string) => void
		clear: () => void
	}
	local: {
		get: (key: string | string[]) => Promise<Local.Storage>
		set: (val: Keyval) => void
		remove: (key: string) => void
		clear: () => void
	}
	init: () => Promise<{ sync: Sync.Storage; local: Local.Storage }>
}

function verifyDataAsSync(data: Keyval) {
	data = data ?? {}

	for (const key in SYNC_DEFAULT) {
		if (!(key in data) && key !== 'move') {
			data[key] = SYNC_DEFAULT[key]
		}
	}

	return data as Sync.Storage
}

function online(): Storage {
	const sync = {
		set: function (value: Keyval) {
			const data = verifyDataAsSync(parse<Sync.Storage>(localStorage.bonjourr) ?? {})

			if (typeof value !== 'object') {
				return console.warn('Value is not an object: ', value)
			}

			for (const [key, val] of Object.entries(value)) {
				data[key] = val
			}

			localStorage.bonjourr = JSON.stringify(data ?? {})
			window.dispatchEvent(new Event('storage'))
		},

		get: async (_?: string | string[]) => {
			return verifyDataAsSync(parse<Sync.Storage>(localStorage.bonjourr) ?? {})
		},

		remove: (key: string) => {
			const data = verifyDataAsSync(parse<Sync.Storage>(localStorage.bonjourr) ?? {})
			delete data[key]
			localStorage.bonjourr = JSON.stringify(data ?? {})
		},

		clear: () => {
			localStorage.removeItem('bonjourr')
		},
	}

	const local = {
		set: (value: Keyval) => {
			const [key, val] = Object.entries(value)[0]
			return localStorage.setItem(key, JSON.stringify(val))
		},

		get: async (keys?: string | string[]) => {
			const res: Keyval = {}

			if (keys === undefined) {
				keys = [...Object.keys(localStorage).filter((k) => k !== 'bonjourr')]
			} //
			else if (typeof keys === 'string') {
				keys = [keys]
			}

			for (const key of keys) {
				const val = parse<Partial<Local.Storage>>(localStorage.getItem(key) ?? '')
				if (val) {
					res[key] = val
				}
			}

			return res as Local.Storage
		},

		remove: (key: string) => {
			return localStorage.removeItem(key)
		},

		clear: () => {
			for (const key of Object.keys(LOCAL_DEFAULT)) {
				localStorage.removeItem(key)
			}
		},
	}

	const init = async () => {
		return {
			sync: await sync.get(),
			local: await local.get(),
		}
	}

	return { sync, local, init }
}

function webext(): Storage {
	const sync = {
		set: (val: Keyval, cb = (): void => {}) => {
			chrome.storage.sync.set(val, cb)
		},

		get: async (key?: string | string[]): Promise<Sync.Storage> => {
			const data = await chrome.storage.sync.get(key ?? null)
			return verifyDataAsSync(data)
		},

		remove: (key: string) => {
			chrome.storage.sync.remove(key)
		},

		clear: () => {
			chrome.storage.sync.clear()
		},
	}

	const local = {
		set: (val: Keyval) => {
			chrome.storage.local.set(val)
		},

		get: async (key: string | string[]) => {
			return (await chrome.storage.local.get(key ?? null)) as Local.Storage
		},

		remove: (key: string) => {
			return chrome.storage.local.remove(key)
		},

		clear: () => {
			chrome.storage.local.clear()
		},
	}

	const init = async (): Promise<{ sync: Sync.Storage; local: Local.Storage }> => {
		if (window.startupStorage?.sync && window.startupStorage?.local) {
			const { sync, local } = window.startupStorage
			delete window.startupStorage
			return { sync: verifyDataAsSync(sync), local }
		}

		await new Promise((resolve) => {
			;(function cycle() {
				const { sync, local } = window.startupStorage ?? {}
				sync && local ? resolve(true) : setTimeout(cycle)
			})()
		})

		const { sync, local } = window.startupStorage as { sync: Sync.Storage; local: Local.Storage }
		delete window.startupStorage
		return { sync: verifyDataAsSync(sync), local }
	}

	return { sync, local, init }
}

export default PLATFORM === 'online' ? online() : webext()
