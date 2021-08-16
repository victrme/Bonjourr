//
const version = '1.10.0'
const bonjourrCache = 'bonjourr-v' + version
const backgroundCache = 'background-v' + version

const filesToChache = [
	'index.html',
	'settings.html',
	'manifest.webmanifest',
	'src/scripts/main.js',
	'src/styles/style.css',
	'src/assets/favicon-128x128.png',
	'src/assets/favicon-512x512.png',
	'src/assets/apple-touch-icon.jpg',
	'src/assets/interface/gear.svg',
	'src/assets/interface/loading.gif',
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

const addWeatherIcons = (time) => weatherList.forEach((elem) => filesToChache.push(`src/assets/weather/${time}/${elem}.png`))

addWeatherIcons('day')
addWeatherIcons('night')

//
//
// EVENTS
//
//

self.addEventListener('install', function (event) {
	event.waitUntil(
		caches.open(bonjourrCache).then(function (cache) {
			return cache.addAll(filesToChache)
		})
	)
})

self.addEventListener('fetch', (event) => {
	event.respondWith(
		caches.open(bonjourrCache).then(function (cache) {
			return caches.match(event.request).then(function (response) {
				if (response) return response

				return fetch(event.request).then(function (fetched) {
					const isntUnsplash = event.request.url.includes('unsplash.com')
					const isntWeather = event.request.url.includes('api.openweathermap.org')

					if (isntUnsplash && isntWeather) cache.put(event.request, fetched.clone())
					return fetched
				})
			})
		})
	)
})

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
