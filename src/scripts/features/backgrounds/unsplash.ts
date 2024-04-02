import { periodOfDay, turnRefreshButton, apiFetch, freqControl, isEvery } from '../../utils'
import { LOCAL_DEFAULT, SYNC_DEFAULT } from '../../defaults'
import { imgBackground } from '.'
import { tradThis } from '../../utils/translations'
import errorMessage from '../../utils/errormessage'
import networkForm from '../../utils/networkform'
import storage from '../../storage'

type UnsplashInit = {
	unsplash: Unsplash.Sync
	cache: Unsplash.Local
}

type UnsplashUpdate = {
	refresh?: HTMLElement
	collection?: string
	every?: string
}

const collectionForm = networkForm('f_collection')

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
			if (init.unsplash.time === undefined) {
				initUnsplashBackgrounds(init.unsplash, init.cache)
			} else {
				cacheControl(init.unsplash, init.cache)
			}
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

		unsplashBackgrounds({ unsplash, cache: unsplashCache })
		collectionForm.accept('i_collection', '2nVzlQADDIE')
	}

	if (collection !== undefined && collection.length > 0) {
		const isFullURL = collection.includes('https://unsplash.com/') && collection.includes('/collections/')

		if (!navigator.onLine) {
			return collectionForm.warn('No internet connection')
		}

		if (isFullURL) {
			const start = collection.indexOf('/collections/') + 13
			const end = collection.indexOf('/', start)
			collection = collection.slice(start, end)
		}

		// add new collec
		unsplash.collection = collection.replaceAll(` `, '')
		unsplash.lastCollec = 'user'
		unsplash.time = freqControl.set()

		collectionForm.load()

		let list = await requestNewList(unsplash.collection)

		if (!list || list.length === 0) {
			collectionForm.warn(`Cannot get "${collection}"`)
			return
		}

		unsplashCache['user'] = list

		await preloadImage(unsplashCache['user'][0].url)
		preloadImage(unsplashCache['user'][1].url)
		loadBackground(unsplashCache['user'][0])

		collectionForm.accept('i_collection', collection)
	}

	storage.sync.set({ unsplash })
	storage.local.set({ unsplashCache })
}

async function cacheControl(unsplash: Unsplash.Sync, cache?: Unsplash.Local) {
	unsplash = { ...SYNC_DEFAULT.unsplash, ...unsplash }
	cache = cache ?? (await getCache())

	let { lastCollec } = unsplash
	const { every, time, collection, pausedImage } = unsplash

	const needNewImage = freqControl.get(every, time ?? Date.now())
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

async function initUnsplashBackgrounds(unsplash: Unsplash.Sync, cache: Unsplash.Local) {
	const lastCollec = periodOfDay()
	let list = await requestNewList(bonjourrCollections[lastCollec])

	if (!list) {
		return
	}

	cache[lastCollec] = list
	unsplash.lastCollec = lastCollec
	unsplash.time = new Date().getTime()
	preloadImage(list[0].url)

	// With weather loaded and different suntime
	// maybe use another collection ?

	await new Promise((sleep) => setTimeout(sleep, 200))

	const lastCollecAgain = periodOfDay()

	if (lastCollec !== lastCollecAgain) {
		list = (await requestNewList(bonjourrCollections[lastCollecAgain])) ?? []
		unsplash.lastCollec = lastCollecAgain
		cache[lastCollecAgain] = list
	}

	storage.sync.set({ unsplash })
	storage.local.set({ unsplashCache: cache })
	sessionStorage.setItem('waitingForPreload', 'true')

	loadBackground(list[0])
	await preloadImage(list[1].url)
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
	const domcontainer = document.getElementById('creditContainer')
	const domcredit = document.getElementById('credit')
	const hasLocation = image.city || image.country
	let exif = ''
	let credits = ''

	if (image.exif) {
		const { iso, model, aperture, exposure_time, focal_length } = image.exif

		// ⚠️ In this order !
		if (model) exif += `${model} - `
		if (aperture) exif += `f/${aperture} `
		if (exposure_time) exif += `${aperture}s `
		if (iso) exif += `${iso}ISO `
		if (focal_length) exif += `${focal_length}mm`
	}

	if (hasLocation) {
		const city = image.city || ''
		const country = image.country || ''
		const comma = city && country ? ', ' : ''
		credits = `${city}${comma}${country} <name>`
	} else {
		credits = tradThis('Photo by <name>')
	}

	const [location, rest] = credits.split(' <name>')
	const domlocation = document.createElement('a')
	const domspacer = document.createElement('span')
	const domrest = document.createElement('span')
	const domartist = document.createElement('a')
	const domexif = document.createElement('p')

	domexif.className = 'exif'
	domexif.textContent = exif
	domlocation.textContent = location
	domartist.textContent = image.name.slice(0, 1).toUpperCase() + image.name.slice(1)
	domspacer.textContent = hasLocation ? ' - ' : ' '
	domrest.textContent = rest

	domlocation.href = `${image.link}?utm_source=Bonjourr&utm_medium=referral`
	domartist.href = `https://unsplash.com/@${image.username}?utm_source=Bonjourr&utm_medium=referral`

	if (domcredit) {
		domcredit.textContent = ''
	}

	domcredit?.appendChild(domexif)
	domcredit?.appendChild(domlocation)
	domcredit?.appendChild(domspacer)
	domcredit?.appendChild(domartist)
	domcredit?.appendChild(domrest)
	domcontainer?.classList.toggle('shown', true)
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
