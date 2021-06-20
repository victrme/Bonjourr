// offlineStorage works exactly like chrome.storage
// Just need to replace every chrome.storage
// And maybe change import option

const offlineStorage = {
	get: (which, callback) => {
		const key = which === 'backgrounds' ? 'bonjourrBackgrounds' : 'bonjourr'
		const data = localStorage[key] ? JSON.parse(localStorage[key]) : {}
		callback(data)
	},
	set: (prop, which) => {
		offlineStorage.get(which, (data) => {
			if (typeof prop === 'object') {
				const [key, val] = Object.entries(prop)[0]

				if (key === 'import') {
					data = val
				} else data[key] = val

				if (which === 'backgrounds') localStorage.bonjourrBackgrounds = JSON.stringify(data)
				else localStorage.bonjourr = JSON.stringify(data)
			}
		})
	},
	log: (isbg) => offlineStorage.get(isbg, (data) => console.log(data)),
	del: () => localStorage.clear(),
}

// Compatibility with older local versions
// As it is now using "bonjourr" key
if (localStorage.data && !localStorage.bonjourr) {
	localStorage.bonjourr = atob(localStorage.data)
	localStorage.removeItem('data')
}

// Ne pas oublier de mettre le storage pour les custom backgrounds
