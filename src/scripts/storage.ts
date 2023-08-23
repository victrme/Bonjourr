import { PLATFORM, syncDefaults } from './utils'
import parse from './utils/JSONparse'
import { Sync } from './types/sync'
import { Local } from './types/local'

type Keyval = {
	[key: string]: unknown
}

type StartupStorage = {
	sync: Sync | null
	local: Local | null
}

declare global {
	interface Window {
		startupStorage?: StartupStorage
	}
}

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
	}
	init: () => Promise<{ sync: Sync; local: Local }>
}

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
		get: async (keys: string | string[]) => {
			const res: Keyval = {}

			if (typeof keys === 'string') {
				keys = [keys]
			}

			for (const key of keys) {
				const val = parse(localStorage.getItem(key) ?? '')
				if (val) {
					res[key] = val
				}
			}

			return res as Local
		},

		remove: (key: string) => {
			return localStorage.removeItem(key)
		},

		set: (value: Keyval) => {
			const [key, val] = Object.entries(value)[0]
			return localStorage.setItem(key, JSON.stringify(val))
		},
	}

	const init = async () => {
		return {
			sync: await sync.get(),
			local: await local.get(['quotesCache', 'unsplashCache', 'translations', 'fontface', 'userQuoteSelection']),
		}
	}

	return { sync, local, init }
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
		get: async (key?: string | string[]) => {
			return (await chrome.storage.local.get(key ?? null)) as Local
		},

		remove: (key: string) => {
			return chrome.storage.local.remove(key)
		},

		set: (val: Keyval) => {
			chrome.storage.local.set(val)
		},
	}

	// todo:
	// add local storage to startup

	const init = async (): Promise<{ sync: Sync; local: Local }> => {
		if (window.startupStorage?.sync && window.startupStorage?.local) {
			const { sync, local } = window.startupStorage
			delete window.startupStorage
			return { sync, local }
		}

		return await new Promise((resolve) => {
			let interval = setInterval(() => {
				if (window.startupStorage?.sync && window.startupStorage?.local) {
					const { sync, local } = window.startupStorage
					delete window.startupStorage
					clearInterval(interval)
					resolve({ sync, local })
				}
			}, 1)
		})
	}

	return { sync, local, init }
}

export default PLATFORM === 'online' ? online() : webext()
