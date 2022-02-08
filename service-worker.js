//
const version = '1.12.0'
const bonjourrCache = 'bonjourr-v' + version

const filesToChache = [
	'release/',
	'release/settings.html',
	'release/manifest.webmanifest',
	'release/src/scripts/main.js',
	'release/src/styles/style.css',
	'release/src/assets/favicon-128x128.png',
	'release/src/assets/favicon-512x512.png',
	'release/src/assets/apple-touch-icon.png',
	'release/src/assets/interface/gear.svg',
	'release/src/assets/interface/loading.gif',
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

const addWeatherIcons = (time) =>
	weatherList.forEach((elem) => filesToChache.push(`release/src/assets/weather/${time}/${elem}.png`))

addWeatherIcons('day')
addWeatherIcons('night')

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
