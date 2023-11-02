import { PLATFORM, localDefaults, syncDefaults } from './utils'
import parse from './utils/parse'
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
		clear: () => void
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
			for (const key of Object.keys(localDefaults)) {
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

	const init = async (): Promise<{ sync: Sync; local: Local }> => {
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

		const { sync, local } = window.startupStorage as { sync: Sync; local: Local }
		delete window.startupStorage
		return { sync: verifyDataAsSync(sync), local }
	}

	return { sync, local, init }
}

export default PLATFORM === 'online' ? online() : webext()
