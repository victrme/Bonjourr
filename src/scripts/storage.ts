import { PLATFORM, syncDefaults } from './utils'
import parse from './utils/JSONparse'
import { Sync } from './types/sync'
import { Local } from './types/local'

type Keyval = {
	[key: string]: unknown
}

type Storage = {
	sync: {
		get: (key?: string | string[]) => Promise<Sync>
		set: (val: Keyval) => void
		remove: (key: string) => void
		clear: () => void
	}
	local: {
		get: (key: string) => Partial<Local> | null
		set: (val: Keyval) => void
		remove: (key: string) => void
		init: (key?: string | string[]) => Promise<void>
	}
}

let webextLocalCache: any

function verifyDataAsSync(data: Keyval) {
	data = data ?? {}

	for (const key in syncDefaults) {
		if (!(key in data) && key !== 'move') {
			data[key] = syncDefaults[key]
		}
	}

	return data as Sync
}

function online(): Storage {
	const sync = {
		set: function (value: Keyval) {
			const data = verifyDataAsSync(parse(localStorage.bonjourr) ?? {})

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
			return verifyDataAsSync(parse(localStorage.bonjourr) ?? {})
		},

		remove: (key: string) => {
			const data = verifyDataAsSync(parse(localStorage.bonjourr) ?? {})
			delete data[key]
			localStorage.bonjourr = JSON.stringify(data ?? {})
		},

		clear: () => {
			localStorage.removeItem('bonjourr')
		},
	}

	const local = {
		init: async (_?: string | string[]) => {
			return
		},

		get: (key: string) => {
			const val = parse(localStorage.getItem(key) ?? '')
			const res: Keyval = {}
			res[key] = val
			return val ? (res as Partial<Local>) : null
		},

		remove: (key: string) => {
			return localStorage.removeItem(key)
		},

		set: (value: Keyval) => {
			const [key, val] = Object.entries(value)[0]
			return localStorage.setItem(key, JSON.stringify(val))
		},
	}

	return { sync, local }
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
		init: async (key?: string | string[]) => {
			webextLocalCache = await chrome.storage.local.get(key ?? null)
			return
		},

		get: (key: string) => {
			if (key in webextLocalCache) {
				const res: Keyval = {}
				res[key] = webextLocalCache[key]
				return res as Partial<Local>
			}

			return null
		},

		remove: (key: string) => {
			return chrome.storage.local.remove(key)
		},

		set: (val: Keyval) => {
			webextLocalCache = { ...webextLocalCache, val }
			chrome.storage.local.set(val)
		},
	}

	return { sync, local }
}

export default PLATFORM === 'online' ? online() : webext()
