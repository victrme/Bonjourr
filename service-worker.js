//

const cacheName = 'bonjourrOffline-v1'

const filesToChache = [
	'index.html',
	'settings.html',
	'src/scripts/main.js',
	'src/styles/style.css',
	'src/assets/manifest.webmanifest',
	'src/assets/images/favicon-128x128.png',
	'src/assets/images/favicon-512x512.png',
	'src/assets/images/interface/gear.svg',
	'src/assets/images/interface/loading.gif',
]

const addWeatherIcons = (time) => {
	let result = []
	const list = [
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

	list.forEach((elem) => result.push(`src/assets/images/weather/${time}/${elem}.png`))
	filesToChache.concat(result)
}

addWeatherIcons('day')
addWeatherIcons('night')

self.addEventListener('install', function (event) {
	event.waitUntil(
		caches.open(cacheName).then(function (cache) {
			return cache.addAll(filesToChache)
		})
	)
})

self.addEventListener('fetch', (e) => {
	e.respondWith(
		caches.match(e.request).then((r) => {
			return (
				r ||
				fetch(e.request).then((response) => {
					return caches.open(cacheName).then((cache) => {
						cache.put(e.request, response.clone())
						return response
					})
				})
			)
		})
	)
})

// Deletes old
self.addEventListener('activate', (e) => {
	e.waitUntil(
		caches.keys().then((keyList) => {
			return Promise.all(
				keyList.map((key) => {
					if (cacheName.indexOf(key) === -1) {
						return caches.delete(key)
					}
				})
			)
		})
	)
})
