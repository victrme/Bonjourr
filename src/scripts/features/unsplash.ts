import { periodOfDay, turnRefreshButton, localDefaults } from '../utils'
import { imgBackground, freqControl } from '..'
import { tradThis } from '../utils/translations'
import errorMessage from '../utils/errorMessage'
import parse from '../utils/JSONparse'
import sunTime from '../utils/suntime'
import storage from '../storage'
import superinput from '../utils/superinput'

import { UnsplashImage } from '../types/local'
import { Unsplash, Sync } from '../types/sync'

// TODO: Separate Collection type with users string
type CollectionType = 'night' | 'noon' | 'day' | 'evening' | 'user'

type UnsplashUpdate = {
	refresh?: HTMLElement
	collection?: string
	every?: string
}

const collectionInput = superinput('i_collection')

// collections source: https://unsplash.com/@bonjourr/collections
const allCollectionType = {
	noon: 'GD4aOSg4yQE',
	day: 'o8uX55RbBPs',
	evening: '3M2rKTckZaQ',
	night: 'bHDh4Ae7O8o',
	user: '',
}

function getCache() {
	return parse(localStorage.unsplashCache) ?? { ...localDefaults.unsplashCache }
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

function loadBackground(props: UnsplashImage) {
	imgBackground(props.url, props.color)
	imgCredits(props)
}

function chooseCollection(customCollection?: string): CollectionType {
	if (customCollection) {
		customCollection = customCollection.replaceAll(` `, '')
		allCollectionType.user = customCollection
		return 'user'
	}

	return periodOfDay(sunTime())
}

function collectionUpdater(unsplash: Unsplash): CollectionType {
	const { every, lastCollec, collection } = unsplash
	const pause = every === 'pause'
	const day = every === 'day'

	if ((pause || day) && lastCollec) {
		return lastCollec // Keeps same collection on >day so that user gets same type of backgrounds
	}

	const collec = chooseCollection(collection) // Or updates collection with sunTime or user collec
	unsplash.lastCollec = collec

	if (collec !== lastCollec) {
		storage.set({ unsplash: unsplash }, () => console.warn('bad'))
	}

	return collec
}

async function requestNewList(collecType: CollectionType) {
	const header = new Headers()
	const collecString = allCollectionType[collecType] || allCollectionType.day
	const url = `https://api.unsplash.com/photos/random?collections=${collecString}&count=8`
	header.append('Authorization', `Client-ID ${atob('@@UNSPLASH_API')}`)
	header.append('Accept-Version', 'v1')

	let resp: Response
	let json: JSON[]

	resp = await fetch(url, { headers: header })

	if (resp.status === 404) {
		if (collecType === 'user') {
			const defaultCollectionList: UnsplashImage[] = await requestNewList(chooseCollection() || 'day')
			return defaultCollectionList
		} else {
			return []
		}
	}

	json = await resp.json()

	if (json.length === 1) {
		const defaultCollectionList: UnsplashImage[] = await requestNewList(chooseCollection() || 'day')
		return defaultCollectionList
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

async function cacheControl(unsplash: Unsplash, collecType: CollectionType) {
	const needNewImage = freqControl.get(unsplash.every, unsplash.time)
	const cache = getCache()
	let list = cache[collecType]

	if (cache[collecType].length === 0) {
		list = await requestNewList(collecType)
		if (!list) return

		await preloadImage(list[0].url)

		cache[collecType] = list
		localStorage.setItem('unsplashCache', JSON.stringify(cache))
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
	unsplash.lastCollec = collecType
	unsplash.time = freqControl.set()

	if (list.length > 1) {
		list.shift()
	}

	loadBackground(list[0])

	// If end of cache, get & save new list
	if (list.length === 1 && navigator.onLine) {
		const newList = await requestNewList(collecType)
		if (!newList) return

		cache[collecType] = list.concat(newList)
		await preloadImage(newList[0].url)
		localStorage.setItem('unsplashCache', JSON.stringify(cache))
		return
	}

	// Or preload next
	else if (list.length > 1) {
		await preloadImage(list[1].url)
	}

	storage.set({ unsplash })
	localStorage.setItem('unsplashCache', JSON.stringify(cache))
}

async function updateUnsplash({ refresh, every, collection }: UnsplashUpdate) {
	const { unsplash } = (await storage.get('unsplash')) as Sync
	const unsplashCache = getCache()

	if (!unsplash) {
		return
	}

	if (refresh) {
		if (sessionStorage.waitingForPreload) {
			turnRefreshButton(refresh, false)
			return
		}

		unsplash.time = 0
		storage.set({ unsplash })
		turnRefreshButton(refresh, true)

		setTimeout(() => cacheControl(unsplash, collectionUpdater(unsplash)), 400)
	}

	if (every !== undefined) {
		// Todo: fix bad manual value check
		if (!every || !every.match(/tabs|hour|day|period|pause/g)) {
			return console.log('Not valid "every" value')
		}

		unsplash.every = every
		unsplash.time = freqControl.set()
		storage.set({ unsplash })
	}

	if (collection !== undefined) {
		if (typeof collection !== 'string') {
			collectionInput.fail('No internet connection')
			return
		}

		// remove user collec
		if (collection === '') {
			const defaultColl = chooseCollection()
			unsplashCache.user = []
			unsplash.collection = ''
			unsplash.lastCollec = defaultColl

			storage.set({ unsplash })
			localStorage.setItem('unsplashCache', JSON.stringify(unsplashCache))
			collectionInput.toggle(false)

			unsplashBackgrounds(unsplash)
			return
		}

		if (!navigator.onLine) {
			collectionInput.warn('No internet connection')
			return
		}

		collectionInput.load()

		// add new collec
		chooseCollection(collection)
		unsplash.collection = collection
		unsplash.lastCollec = 'user'
		unsplash.time = freqControl.set()
		storage.set({ unsplash })

		let list = await requestNewList('user')

		list = []

		if (list.length === 0) {
			collectionInput.fail('Cannot get collection')
			return
		}

		unsplashCache['user'] = list
		localStorage.setItem('unsplashCache', JSON.stringify(unsplashCache))

		await preloadImage(unsplashCache['user'][0].url)

		cacheControl(unsplashCache, chooseCollection(collection))
		collectionInput.toggle(false)
	}
}

export default async function unsplashBackgrounds(init: Unsplash | null, event?: UnsplashUpdate) {
	if (event) {
		updateUnsplash(event)
	}

	if (init) {
		try {
			cacheControl(init, collectionUpdater(init))
		} catch (e) {
			errorMessage(e)
		}
	}
}
