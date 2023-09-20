import { Sync } from './types/sync'
import parse from './utils/JSONparse'
import { PLATFORM, syncDefaults } from './utils'

function verifyDataAsSync(data: { [key: string]: unknown }) {
	data = data ?? {}

	for (const key in syncDefaults) {
		if (!(key in data) && key !== 'move') {
			data[key] = syncDefaults[key]
		}
	}

	return data as Sync
}

function onlineSet(props: { [key: string]: unknown }) {
	const data = onlineGet()

	if (typeof props === 'object') {
		Object.entries(props).forEach(([key, val]) => {
			data[key] = val
		})

		try {
			localStorage.bonjourr = JSON.stringify(data ?? {})
		} catch (error) {
			console.warn(error, "Bonjourr couldn't save this setting 😅 - Memory might be full")
		}

		window.dispatchEvent(new Event('storage'))
	}
}

function onlineGet(_?: unknown) {
	return verifyDataAsSync(parse(localStorage.bonjourr) ?? {})
}

function onlineRemove(key: string) {
	const data = onlineGet()
	delete data[key]
	localStorage.bonjourr = JSON.stringify(data ?? {})
}

function onlineClear() {
	localStorage.removeItem('bonjourr')
}

async function getChromeStorage(key?: string | string[]) {
	const res = await new Promise<{ [key: string]: unknown }>((resolve) => {
		window.location.protocol === 'moz-extension:'
			? browser.storage.sync.get(key ?? null).then(resolve)
			: chrome.storage.sync.get(key ?? null).then(resolve)
	})

	return verifyDataAsSync(res)
}

export default PLATFORM === 'online'
	? {
			get: onlineGet,
			set: onlineSet,
			remove: onlineRemove,
			clear: onlineClear,
	  }
	: {
			get: getChromeStorage as typeof getChromeStorage,
			set: (val: { [key: string]: unknown }, callback = () => {}) => chrome.storage.sync.set(val, callback),
			remove: (key: string) => chrome.storage.sync.remove(key),
			clear: () => chrome.storage.sync.clear(),
	  }
