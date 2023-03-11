import { detectPlatform } from './utils'

const online = (function () {
	const onlineSet = (type: 'sync' | 'local') => {
		return (props: { [key: string]: unknown }, callback?: Function) => {
			online.storage[type].get(null, (data: { [key: string]: unknown }) => {
				if (typeof props === 'object') {
					Object.entries(props).forEach(([key, val]) => {
						data[key] = val
					})

					try {
						localStorage[type === 'sync' ? 'bonjourr' : 'bonjourrBackgrounds'] = JSON.stringify(data)
						if (callback) callback(data)
					} catch (error) {
						console.warn(error, "Bonjourr couldn't save this setting 😅 - Memory might be full")
					}

					window.dispatchEvent(new Event('storage'))
				}
			})
		}
	}

	const onlineGet = (type: 'sync' | 'local') => {
		return (props: unknown, callback?: Function) => {
			const key = type === 'sync' ? 'bonjourr' : 'bonjourrBackgrounds'
			if (callback) callback(localStorage[key] ? JSON.parse(localStorage[key]) : {})
		}
	}

	const onlineRemove = (type: 'sync' | 'local') => {
		const sync = (key: string) => {
			online.storage.sync.get(null, (data: { [key: string]: unknown }) => {
				delete data[key]
				localStorage.bonjourr = JSON.stringify(data)
			})
		}

		const local = (key: string) => {
			online.storage.local.get(null, (data: { [key: string]: unknown }) => {
				delete data[key]
				localStorage.bonjourrBackgrounds = JSON.stringify(data)
			})
		}

		return type === 'sync' ? sync : local
	}

	return {
		storage: {
			sync: {
				get: onlineGet('sync'),
				set: onlineSet('sync'),
				remove: onlineRemove('sync'),
				clear: () => localStorage.removeItem('bonjourr'),
				log: () => online.storage.sync.get(null, (data: any) => console.log(data)),
			},

			local: {
				get: onlineGet('local'),
				set: onlineSet('local'),
				remove: onlineRemove('local'),
				clear: () => localStorage.removeItem('bonjourrBackgrounds'),
				log: () => online.storage.local.get(null, (data: any) => console.log(data)),
			},
		},
	}
})()

export const storage = detectPlatform() === 'online' ? online.storage : chrome.storage

export default storage
