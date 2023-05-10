import { detectPlatform } from './utils'

const online = (function () {
	const onlineSet = () => {
		return (props: { [key: string]: unknown }, callback?: Function) => {
			online.storage.sync.get(null, (data: { [key: string]: unknown }) => {
				if (typeof props === 'object') {
					Object.entries(props).forEach(([key, val]) => {
						data[key] = val
					})

					try {
						localStorage.bonjourr = JSON.stringify(data)
						if (callback) callback(data)
					} catch (error) {
						console.warn(error, "Bonjourr couldn't save this setting 😅 - Memory might be full")
					}

					window.dispatchEvent(new Event('storage'))
				}
			})
		}
	}

	const onlineGet = () => {
		return (_: unknown, callback?: Function) => {
			if (callback) callback(JSON.parse(localStorage.bonjourr ?? {}))
		}
	}

	const onlineRemove = () => {
		const sync = (key: string) => {
			online.storage.sync.get(null, (data: { [key: string]: unknown }) => {
				delete data[key]
				localStorage.bonjourr = JSON.stringify(data)
			})
		}

		return sync
	}

	const onlineClear = () => {
		localStorage.removeItem('bonjourr')
	}

	const onlineLog = () => {
		online.storage.sync.get(null, (data: any) => console.log(data))
	}

	return {
		storage: {
			sync: {
				get: onlineGet(),
				set: onlineSet(),
				remove: onlineRemove(),
				clear: onlineClear,
				log: onlineLog,
			},
		},
	}
})()

export default detectPlatform() === 'online' ? online.storage : chrome.storage
