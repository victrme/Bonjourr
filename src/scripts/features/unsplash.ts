import { periodOfDay, turnRefreshButton, apiFetch, freqControl, isEvery } from '../utils'
import { LOCAL_DEFAULT, SYNC_DEFAULT } from '../defaults'
import { imgBackground } from '..'
import { tradThis } from '../utils/translations'
import errorMessage from '../utils/errormessage'
import superinput from '../utils/superinput'
import storage from '../storage'

type UnsplashInit = {
	unsplash: Unsplash.Sync
	cache: Unsplash.Local
}

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

export default function unsplashBackgrounds(init?: UnsplashInit, event?: UnsplashUpdate) {
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
	const { unsplash } = await storage.sync.get('unsplash')
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

	if (isEvery(every)) {
		const currentImage = unsplashCache[unsplash.lastCollec][0]
		unsplash.pausedImage = every === 'pause' ? currentImage : undefined
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

	if (isCollection(collection)) {
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

async function cacheControl(unsplash: Unsplash.Sync, cache?: Unsplash.Local) {
	unsplash = { ...SYNC_DEFAULT.unsplash, ...unsplash }
	cache = cache ?? (await getCache())

	let { lastCollec } = unsplash
	const { every, time, collection, pausedImage } = unsplash

	const needNewImage = freqControl.get(every, time)
	const needNewCollec = !every.match(/day|pause/) && periodOfDay() !== lastCollec

	if (needNewCollec && lastCollec !== 'user') {
		lastCollec = periodOfDay()
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
		const hasPausedImage = every === 'pause' && pausedImage
		loadBackground(hasPausedImage ? pausedImage : list[0])
		return
	}

	// Needs new image, Update time
	unsplash.lastCollec = lastCollec
	unsplash.time = freqControl.set()

	if (list.length > 1) {
		list.shift()
	}

	loadBackground(list[0])

	if (every === 'pause') {
		unsplash.pausedImage = list[0]
	}

	// If end of cache, get & save new list
	if (list.length === 1 && navigator.onLine) {
		const newList = await requestNewList(collectionId)

		if (newList) {
			cache[unsplash.lastCollec] = list.concat(newList)
			await preloadImage(newList[0].url)
		}
	}

	// Or preload next
	else if (list.length > 1) {
		await preloadImage(list[1].url)
	}

	storage.sync.set({ unsplash })
	storage.local.set({ unsplashCache: cache })
}

async function requestNewList(collection: string): Promise<Unsplash.Image[] | null> {
	let json: Unsplash.API[]

	const resp = await apiFetch(`/unsplash/photos/random?collections=${collection}&count=8`)

	if (resp?.status === 404) {
		return null
	}

	json = await resp?.json()

	if (json.length === 1) {
		return null
	}

	const filteredList: Unsplash.Image[] = []
	const { width, height } = screen
	const dpr = window.devicePixelRatio

	// Increase compression with pixel density
	// https://docs.imgix.com/tutorials/responsive-images-srcset-imgix#use-variable-quality
	const quality = Math.min(100 - dpr * 20, 75)

	const isExifEmpty = (exif: Unsplash.API['exif']) => Object.values(exif).every((val) => !val)

	for (const img of json) {
		filteredList.push({
			url: `${img.urls.raw}&w=${width}&h=${height}&dpr=${dpr}&auto=format&q=${quality}&fit=crop`,
			link: img.links.html,
			username: img.user.username,
			name: img.user.name,
			city: img.location.city,
			country: img.location.country,
			color: img.color,
			exif: isExifEmpty(img.exif) ? undefined : img.exif,
		})
	}

	return filteredList
}

function imgCredits(image: Unsplash.Image) {
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
		const exiflist = [
			['model', '%val% - '],
			['aperture', 'f/%val% '],
			['exposure_time', '%val%s '],
			['iso', '%val%ISO '],
			['focal_length', '%val%mm'],
		]

		for (const [key, format] of exiflist) {
			if (key in exif) {
				const val = exif[key as keyof typeof exif]
				exifDescription += val ? format.replace('%val%', val.toString()) : ''
			}
		}
	}

	// Force Capitalization
	artist = name
		.split(' ')
		.map((s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLocaleLowerCase())
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

async function getCache(): Promise<Unsplash.Local> {
	const cache = (await storage.local.get('unsplashCache'))?.unsplashCache ?? { ...LOCAL_DEFAULT.unsplashCache }
	return cache
}

function loadBackground(props: Unsplash.Image) {
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

function isCollection(s = ''): s is Unsplash.CollectionTypes {
	const collections: Unsplash.CollectionTypes[] = ['noon', 'day', 'evening', 'night']
	return collections.includes(s as Unsplash.CollectionTypes)
}
