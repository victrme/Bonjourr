import { periodOfDay, turnRefreshButton, localDefaults, syncDefaults } from '../utils'
import { imgBackground, freqControl } from '..'
import { tradThis } from '../utils/translations'
import errorMessage from '../utils/errormessage'
import sunTime from '../utils/suntime'
import storage from '../storage'
import superinput from '../utils/superinput'

import { UnsplashCache, UnsplashImage } from '../types/local'
import { Unsplash, Sync } from '../types/sync'

type UnsplashInit = {
	unsplash: Unsplash
	cache: UnsplashCache
} | null

type UnsplashUpdate = {
	refresh?: HTMLElement
	collection?: string
	every?: string
}

const collectionInput = superinput('i_collection')

// https://unsplash.com/@bonjourr/collections
const bonjourrCollections = {
	noon: 'GD4aOSg4yQE',
	day: 'o8uX55RbBPs',
	evening: '3M2rKTckZaQ',
	night: 'bHDh4Ae7O8o',
}

export default function unsplashBackgrounds(init: UnsplashInit, event?: UnsplashUpdate) {
	if (event) {
		updateUnsplash(event)
	}

	if (init) {
		try {
			cacheControl(init.unsplash, init.cache)
		} catch (e) {
			errorMessage(e)
		}
	}
}

async function updateUnsplash({ refresh, every, collection }: UnsplashUpdate) {
	const { unsplash } = (await storage.sync.get('unsplash')) as Sync
	const unsplashCache = await getCache()

	if (!unsplash) {
		return
	}

	if (refresh) {
		if (sessionStorage.waitingForPreload) {
			turnRefreshButton(refresh, false)
			return
		}

		unsplash.time = 0
		storage.sync.set({ unsplash })
		turnRefreshButton(refresh, true)

		setTimeout(() => cacheControl(unsplash), 400)
	}

	if (every !== undefined) {
		// Todo: fix bad manual value check
		if (!every || !every.match(/tabs|hour|day|period|pause/g)) {
			return console.log('Not valid "every" value')
		}

		unsplash.every = every
		unsplash.time = freqControl.set()
		storage.sync.set({ unsplash })
	}

	if (collection === '') {
		unsplashCache.user = []
		unsplash.collection = ''
		unsplash.lastCollec = 'day'

		storage.sync.set({ unsplash })
		storage.local.set({ unsplashCache })
		collectionInput.toggle(false, '2nVzlQADDIE')

		unsplashBackgrounds({ unsplash, cache: unsplashCache })
		return
	}

	if (collection !== undefined) {
		if (!navigator.onLine) {
			return collectionInput.warn('No internet connection')
		}

		// add new collec
		unsplash.collection = collection.replaceAll(` `, '')
		unsplash.lastCollec = 'user'
		unsplash.time = freqControl.set()

		collectionInput.load()
		let list = await requestNewList(unsplash.collection)

		if (!list || list.length === 0) {
			collectionInput.warn(`Cannot get "${collection}"`)
			return
		}

		unsplashCache['user'] = list

		await preloadImage(unsplashCache['user'][0].url)
		preloadImage(unsplashCache['user'][1].url)
		loadBackground(unsplashCache['user'][0])

		collectionInput.toggle(false, unsplash.collection)

		storage.sync.set({ unsplash })
		storage.local.set({ unsplashCache })
	}
}

async function cacheControl(unsplash: Unsplash, cache?: UnsplashCache) {
	let { every, time, lastCollec, collection } = { ...syncDefaults.unsplash, ...unsplash }
	cache = cache ?? (await getCache())

	const needNewImage = freqControl.get(every, time)
	const needNewCollec = !every.match(/day|pause/) && periodOfDay(sunTime()) !== lastCollec

	if (needNewCollec && lastCollec !== 'user') {
		lastCollec = periodOfDay(sunTime())
	}

	let collectionId = lastCollec === 'user' ? collection : bonjourrCollections[lastCollec]
	let list = cache[lastCollec]

	if (list.length === 0) {
		const newlist = await requestNewList(collectionId)

		if (!newlist) {
			return
		}

		list = newlist
		await preloadImage(list[0].url)

		cache[lastCollec] = list
		storage.local.set({ unsplashCache: cache })
		sessionStorage.setItem('waitingForPreload', 'true')
	}

	if (sessionStorage.waitingForPreload === 'true') {
		loadBackground(list[0])
		await preloadImage(list[1].url)
		return
	}

	if (!needNewImage) {
		loadBackground(list[0])
		return
	}

	// Needs new image, Update time
	unsplash.lastCollec = lastCollec
	unsplash.time = freqControl.set()

	if (list.length > 1) {
		list.shift()
	}

	loadBackground(list[0])

	// If end of cache, get & save new list
	if (list.length === 1 && navigator.onLine) {
		const newList = await requestNewList(collectionId)

		if (newList) {
			cache[unsplash.lastCollec] = list.concat(newList)
			await preloadImage(newList[0].url)
			storage.local.set({ unsplashCache: cache })
		}

		return
	}

	// Or preload next
	else if (list.length > 1) {
		await preloadImage(list[1].url)
	}

	storage.sync.set({ unsplash })
	storage.local.set({ unsplashCache: cache })
}

async function requestNewList(collection: string): Promise<UnsplashImage[] | null> {
	const header = new Headers()
	const url = `https://api.unsplash.com/photos/random?collections=${collection}&count=8`
	header.append('Authorization', `Client-ID ${atob('@@UNSPLASH_API')}`)
	header.append('Accept-Version', 'v1')

	let resp: Response
	let json: JSON[]

	resp = await fetch(url, { headers: header })

	if (resp.status === 404) {
		return null
	}

	json = await resp.json()

	if (json.length === 1) {
		return null
	}

	const filteredList: UnsplashImage[] = []
	const { width, height } = screen
	const dpr = window.devicePixelRatio

	// Increase compression with pixel density
	// https://docs.imgix.com/tutorials/responsive-images-srcset-imgix#use-variable-quality
	const quality = Math.min(100 - dpr * 20, 75)

	json.forEach((img: any) => {
		filteredList.push({
			url: `${img.urls.raw}&w=${width}&h=${height}&dpr=${dpr}&auto=format&q=${quality}&fit=crop`,
			link: img.links.html,
			username: img.user.username,
			name: img.user.name,
			city: img.location.city,
			country: img.location.country,
			color: img.color,
			exif: img.exif,
			desc: img.description,
		})
	})

	return filteredList
}

function imgCredits(image: UnsplashImage) {
	const domcredit = document.getElementById('credit')
	let needsSpacer = false
	let artist = ''
	let photoLocation = ''
	let exifDescription = ''
	const referral = '?utm_source=Bonjourr&utm_medium=referral'
	const { city, country, name, username, link, exif } = image

	if (!city && !country) {
		photoLocation = tradThis('Photo by ')
	} else {
		if (city) photoLocation = city + ', '
		if (country) {
			photoLocation += country
			needsSpacer = true
		}
	}

	if (exif) {
		const orderedExifData = [
			{ key: 'model', format: `%val% - ` },
			{ key: 'aperture', format: `f/%val% ` },
			{ key: 'exposure_time', format: `%val%s ` },
			{ key: 'iso', format: `ISO %val% ` },
			{ key: 'focal_length', format: `%val%mm` },
		]

		orderedExifData.forEach(({ key, format }) => {
			if (Object.keys(exif).includes(key)) {
				const exifVal = exif[key as keyof typeof exif]

				if (exifVal) {
					exifDescription += key === 'iso' ? exifVal.toString() : format.replace('%val%', exifVal.toString())
				}
			}
		})
	}

	// Force Capitalization
	artist = name
		.split(' ')
		.map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLocaleLowerCase())
		.join(' ')

	const locationDOM = document.createElement('a')
	const spacerDOM = document.createElement('span')
	const artistDOM = document.createElement('a')
	const exifDOM = document.createElement('p')

	exifDOM.className = 'exif'
	exifDOM.textContent = exifDescription
	locationDOM.textContent = photoLocation
	artistDOM.textContent = artist
	spacerDOM.textContent = ` - `

	locationDOM.href = link + referral
	artistDOM.href = 'https://unsplash.com/@' + username + referral

	if (domcredit) {
		domcredit.textContent = ''

		domcredit.appendChild(exifDOM)
		domcredit.appendChild(locationDOM)
		if (needsSpacer) domcredit.appendChild(spacerDOM)
		domcredit.appendChild(artistDOM)

		document.getElementById('creditContainer')?.classList.toggle('shown', true)
	}
}

async function getCache(): Promise<UnsplashCache> {
	const cache = (await storage.local.get('unsplashCache'))?.unsplashCache ?? { ...localDefaults.unsplashCache }
	return cache
}

function loadBackground(props: UnsplashImage) {
	imgBackground(props.url, props.color)
	imgCredits(props)
}

async function preloadImage(src: string) {
	const img = new Image()

	sessionStorage.setItem('waitingForPreload', 'true')

	try {
		img.src = src
		await img.decode()
		img.remove()
		sessionStorage.removeItem('waitingForPreload')
	} catch (error) {
		console.warn('Could not decode image: ', src)
	}
}
