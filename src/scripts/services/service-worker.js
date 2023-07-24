const bonjourrCache = 'bonjourr-v1.17.0'

const filesToChache = [
	'/',
	'/settings.html',
	'/manifest.webmanifest',
	'/src/scripts/main.js',
	'/src/styles/style.css',
	'/src/assets/favicon-128x128.png',
	'/src/assets/favicon-512x512.png',
	'/src/assets/monochrome.png',
	'/src/assets/apple-touch-icon.png',
	'/src/assets/interface/gear.svg',
	'/src/assets/interface/loading.svg',
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

const langs = [
	'en',
	'fr',
	'sk',
	'sv',
	'pl',
	'pt_BR',
	'nl',
	'ru',
	'zh_CN',
	'zh_HK',
	'de',
	'it',
	'es_ES',
	'tr',
	'uk',
	'id',
	'da',
	'fi',
	'hu',
	'sr',
	'sr_YU',
	'gr',
]

langs.forEach((lang) => {
	filesToChache.push(`/_locales/${lang}/translations.json`)
})

weatherList.forEach((elem) => {
	filesToChache.push(`/src/assets/weather/day/${elem}.png`)
	filesToChache.push(`/src/assets/weather/night/${elem}.png`)
})

//
//
// EVENTS
//
//

self.addEventListener('install', (event) =>
	event.waitUntil(caches.open(bonjourrCache).then((cache) => cache.addAll(filesToChache)))
)

self.addEventListener('activate', (e) => {
	e.waitUntil(
		caches.keys().then((keyList) => {
			return Promise.all(
				keyList.map((key) => {
					if (bonjourrCache.indexOf(key) === -1) {
						return caches.delete(key)
					}
				})
			)
		})
	)
})

self.addEventListener('fetch', function (event) {
	event.respondWith(
		caches.match(event.request).then(function (response) {
			//
			if (response) return response
			else {
				const fetchRequest = event.request.clone()

				return fetch(fetchRequest).then(function (response) {
					if (!response || response.status !== 200 || response.type !== 'basic') return response

					const responseToCache = response.clone()

					// Don't save APIs
					// Todo: save latest unsplash image
					if (event.request.url.includes('unsplash.com') && event.request.url.includes('api.openweathermap.org'))
						caches.open(bonjourrCache).then(function (cache) {
							cache.put(event.request, responseToCache)
						})

					return response
				})
			}
		})
	)
})
