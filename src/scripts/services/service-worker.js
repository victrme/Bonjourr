const CACHE_KEY = '20.1.2'
const API_URLS = ['unsplash.com', 'jsdelivr.net', 'api.bonjourr']

//	Extensions

function createNewTab() {
	const url = chrome.runtime.getURL('index.html')
	chrome.tabs.create({ url })
}

function handleInstalled(details) {
	if (details.reason === 'install') createNewTab()
	console.log(details)
}

chrome.action.onClicked.addListener(createNewTab)
chrome.runtime.onInstalled.addListener(handleInstalled)
chrome.runtime.setUninstallURL('https://bonjourr.fr/goodbye')

// Web

if (!chrome) {
	self.addEventListener('activate', async () => {
		const keys = await caches.keys()

		for (const key of keys) {
			if (CACHE_KEY !== key) {
				await caches.delete(key)
			}
		}
	})

	self.addEventListener('fetch', function (event) {
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
	})
}
