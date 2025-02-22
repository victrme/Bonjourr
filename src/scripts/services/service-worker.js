if (globalThis.chrome) {
	if (chrome.storage) {
		chrome.action.onClicked.addListener(createNewTab)
		chrome.runtime.onInstalled.addListener(handleInstalled)
		chrome.runtime.setUninstallURL('https://bonjourr.fr/goodbye')
	}
} else {
	self.addEventListener('activate', updateCache)
	self.addEventListener('fetch', retrieveCache)
}

const CACHE_KEY = '20.4.2'
const API_URLS = ['unsplash.com', 'jsdelivr.net', 'api.bonjourr']

// Web Extension

function createNewTab() {
	const url = chrome.runtime.getURL('index.html')
	chrome.tabs.create({ url })
}

function handleInstalled(details) {
	if (details.reason === 'install') {
		createNewTab()
	}
}

// Progressive Web App

async function updateCache() {
	const keys = await caches.keys()

	for (const key of keys) {
		if (CACHE_KEY !== key) {
			await caches.delete(key)
		}
	}
}

function retrieveCache(event) {
	const url = event.request.url
	const isAPI = API_URLS.some((api) => url.includes(api))

	event.respondWith(
		(async () => {
			if (isAPI) {
				return fetch(event.request)
			}

			const cachedResponse = await caches.match(event.request)

			if (cachedResponse) {
				return cachedResponse
			}

			const cache = await caches.open(CACHE_KEY)
			cache.add(event.request.url)

			return fetch(event.request)
		})()
	)
}
