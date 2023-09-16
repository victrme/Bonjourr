const bonjourrCache = 'bonjourr-v1.17.4'

const filesToChache = [
	'/',
	'/settings.html',
	'/manifest.webmanifest',
	'/src/scripts/main.js',
	'/src/styles/style.css',
	'/src/assets/favicon.ico',
	'/src/assets/monochrome.png',
	'/src/assets/favicon-128x128.png',
	'/src/assets/favicon-512x512.png',
	'/src/assets/apple-touch-icon.png',
	'/src/assets/interface/gear.svg',
	'/src/assets/interface/loading.svg',
	'/src/assets/interface/magnifying-glass.svg',
	'/_locales/en/translations.json',
	'/_locales/fr/translations.json',
	'/_locales/sk/translations.json',
	'/_locales/sv/translations.json',
	'/_locales/pl/translations.json',
	'/_locales/pt_BR/translations.json',
	'/_locales/ro/translations.json',
	'/_locales/nl/translations.json',
	'/_locales/ru/translations.json',
	'/_locales/zh_CN/translations.json',
	'/_locales/zh_HK/translations.json',
	'/_locales/de/translations.json',
	'/_locales/it/translations.json',
	'/_locales/es_ES/translations.json',
	'/_locales/tr/translations.json',
	'/_locales/uk/translations.json',
	'/_locales/id/translations.json',
	'/_locales/da/translations.json',
	'/_locales/fi/translations.json',
	'/_locales/hu/translations.json',
	'/_locales/sr/translations.json',
	'/_locales/sr_YU/translations.json',
	'/_locales/gr/translations.json',
]

const weatherList = [
	'snow',
	'mist',
	'clearsky',
	'fewclouds',
	'lightrain',
	'showerrain',
	'thunderstorm',
	'brokenclouds',
	'lightdrizzle',
	'showerdrizzle',
	'overcastclouds',
]

weatherList.forEach((elem) => {
	filesToChache.push(`/src/assets/weather/day/${elem}.png`)
	filesToChache.push(`/src/assets/weather/night/${elem}.png`)
})

//
//
// EVENTS
//
//

self.addEventListener('install', async () => {
	const cache = await caches.open(bonjourrCache)
	cache.addAll(filesToChache)
})

self.addEventListener('activate', async () => {
	const keys = await caches.keys()

	for (const key of keys) {
		if (bonjourrCache.indexOf(key) === -1) {
			await caches.delete(key)
		}
	}
})

self.addEventListener('fetch', async function (event) {
	const apis = /unsplash.com|weathermap.org|gstatic.com|googleapis.com/
	const isFetchingApis = !!event.request.url.match(apis)

	if (isFetchingApis) {
		return
	}

	event.respondWith(
		(async () => {
			const cachedResponse = await caches.match(event.request)
			return cachedResponse ?? fetch(event.request)
		})()
	)
})
