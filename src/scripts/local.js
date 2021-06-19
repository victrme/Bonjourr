// offlineStorage works exactly like chrome.storage
// Just need to replace every chrome.storage
// And maybe change import option

const offlineStorage = {
	get: (useless, callback) => {
		const data = localStorage.bonjourr ? JSON.parse(localStorage.bonjourr) : {}
		callback(data)
	},
	set: (prop) => {
		offlineStorage.get(null, (data) => {
			if (typeof prop === 'object') {
				const [key, val] = Object.entries(prop)[0]

				if (key === 'import') {
					console.log(true)
					data = val
				} else data[key] = val

				localStorage.bonjourr = JSON.stringify(data)
			}
		})
	},
	log: () => offlineStorage.get(null, (data) => console.log(data)),
	del: () => localStorage.removeItem('bonjourr'),
}

// Compatibility with older local versions
// As it is now using "bonjourr" key
if (localStorage.data && !localStorage.bonjourr) {
	localStorage.bonjourr = atob(localStorage.data)
	localStorage.removeItem('data')
}

// Ne pas oublier de mettre le storage pour les custom backgrounds
