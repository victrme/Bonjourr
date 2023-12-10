import { PLATFORM, LOCAL_DEFAULT, SYNC_DEFAULT } from './defaults'
import parse from './utils/parse'

import type { Sync } from './types/sync'
import type { Local } from './types/local'

type Keyval = {
	[key: string]: unknown
}

type AllStorage = { sync: Sync; local: Local }

type Storage = {
	sync: {
		get: (key?: string | string[]) => Promise<Sync>
		set: (val: Keyval) => void
		remove: (key: string) => void
		clear: () => void
	}
	local: {
		get: (key: string | string[]) => Promise<Local>
		set: (val: Keyval) => void
		remove: (key: string) => void
		clear: () => void
	}
	init: () => Promise<AllStorage>
}

function verifyDataAsSync(data: Keyval) {
	data = data ?? {}

	for (const key in SYNC_DEFAULT) {
		if (!(key in data) && key !== 'move') {
			data[key] = SYNC_DEFAULT[key]
		}
	}

	return data as Sync
}

function online(): Storage {
	const sync = {
		set: function (value: Keyval) {
			const data = verifyDataAsSync(parse<Sync>(localStorage.bonjourr) ?? {})

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
			return verifyDataAsSync(parse<Sync>(localStorage.bonjourr) ?? {})
		},

		remove: (key: string) => {
			const data = verifyDataAsSync(parse<Sync>(localStorage.bonjourr) ?? {})
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
				const val = parse<Partial<Local>>(localStorage.getItem(key) ?? '')
				if (val) {
					res[key] = val
				}
			}

			return res as Local
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

	return {
		sync,
		local,
		init,
	}
}

function webext(): Storage {
	const sync = {
		set: (val: Keyval, cb = (): void => {}) => {
			chrome.storage.sync.set(val, cb)
		},

		get: async (key?: string | string[]): Promise<Sync> => {
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
			return (await chrome.storage.local.get(key ?? null)) as Local
		},

		remove: (key: string) => {
			return chrome.storage.local.remove(key)
		},

		clear: () => {
			chrome.storage.local.clear()
		},
	}

	const init = async (): Promise<AllStorage> => {
		// This waits for chrome.storage to be stored in a global variable
		// that is created in file `webext-storage.js`

		//@ts-ignore
		const store = startupStorage
		const isReady = (): boolean => 'sync' in store && 'local' in store

		if (!isReady()) {
			await new Promise((resolve) => {
				document.addEventListener('webextstorage', function () {
					isReady() ? resolve(true) : ''
				})
			})
		}

		const sync = store.sync
		const local = store.local

		//@ts-ignore
		startupStorage = undefined

		return { sync: verifyDataAsSync(sync), local }
	}

	return {
		sync,
		local,
		init,
	}
}

export default PLATFORM === 'online' ? online() : webext()
