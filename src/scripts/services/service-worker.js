//	Extensions

function createNewTab() {
	const url = chrome.runtime.getURL('index.html')
	chrome.tabs.create({ url })
}

function handleInstalled(details) {
	if (details.reason === 'install') {
		createNewTab()
	}
}

chrome.action.onClicked.addListener(createNewTab)
chrome.runtime.onInstalled.addListener(handleInstalled)
chrome.runtime.setUninstallURL('https://bonjourr.fr/goodbye')

chrome.tabs.onCreated.addListener(async function () {
	const promises = await Promise.all([
		chrome.storage.sync.get(),
		chrome.storage.local.get(),
		chrome.bookmarks?.getTree(),
		chrome.topSites?.get(),
	])

	chrome.runtime.onMessage.addListener(function ({ type }) {
		if (type === 'PAGE_READY') {
			chrome.runtime.sendMessage({
				type: 'STARTUP_STORAGE',
				content: {
					sync: promises[0],
					local: promises[1],
					bookmarks: promises[2],
					topSites: promises[3],
				},
			})
		}
	})
})

chrome.runtime.onStartup.addListener(() => {
	chrome.runtime.onMessage.addListener(function ({ type }) {
		if (type === 'PAGE_READY') {
			chrome.runtime.sendMessage({ content: 'BROWSER_START' })
		}
	})
})

// Web

const CACHE_KEY = '20.1.2'
const API_URLS = ['unsplash.com', 'jsdelivr.net', 'api.bonjourr']

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
