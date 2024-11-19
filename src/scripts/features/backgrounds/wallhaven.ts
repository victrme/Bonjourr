import { periodOfDay, turnRefreshButton, apiFetch, freqControl, isEvery } from '../../utils'
import { LOCAL_DEFAULT, SYNC_DEFAULT } from '../../defaults'
import { imgBackground } from '.'
import { tradThis } from '../../utils/translations'
import errorMessage from '../../utils/errormessage'
import networkForm from '../../utils/networkform'
import storage from '../../storage'

type wallhavenInit = {
	wallhaven: Wallhaven.Sync
	cache: Wallhaven.Local
}

type WallhavenUpdate = {
	refresh?: HTMLElement
	parameter?: string
	every?: string
}

const wallhavenForm = networkForm('f_parameters')

const search_settings = 'categories=110&purity=100&sorting=random&order=desc&ai_art_filter=1'

export const bonjourrParams = {
	noon: `sunrise`,
	day: `sunlight`,
	evening: `sunset`,
	night: `night`,
}

export default function wallhavenBackgrounds(init?: WallhavenInit, event?: WallhavenUpdate) {
	if (event) {
		updateWallhaven(event)
	}

	if (init) {
		try {
			if (init.wallhaven.time === undefined) {
				initWallhavenBackgrounds(init.wallhaven, init.cache)
			} else {
				cacheControl(init.wallhaven, init.cache)
			}
		} catch (e) {
			errorMessage(e)
		}
	}
}

async function updateWallhaven({ refresh, every, parameters }: WallhavenUpdate) {
	const { wallhaven } = await storage.sync.get('wallhaven')
	const wallhavenCache = await getCache()

	if (!wallhaven) {
		return
	}

	if (refresh) {
		if (sessionStorage.waitingForPreload) {
			turnRefreshButton(refresh, false)
			return
		}

		wallhaven.time = 0
		storage.sync.set({ wallhaven })
		turnRefreshButton(refresh, true)

		setTimeout(() => cacheControl(wallhaven), 400)
	}

	if (isEvery(every)) {
		const currentImage = wallhavenCache[wallhaven.lastParams][0]
		wallhaven.pausedImage = every === 'pause' ? currentImage : undefined
		wallhaven.every = every
		wallhaven.time = freqControl.set()
		storage.sync.set({ wallhaven })
	}

	if (parameters === '') {
		wallhavenCache.user = []
		wallhaven.parameters = ''
		wallhaven.lastParams = periodOfDay()

		wallhavenBackgrounds({ wallhaven, cache: wallhavenCache })
		wallhavenForm.accept('i_parameters', bonjourrParams[wallhaven.lastParams])
	}

	if (parameters !== undefined && parameters.length > 0) {
		if (!navigator.onLine) {
			return wallhavenForm.warn(tradThis('No internet connection'))
		}

		// add new parameters
		wallhaven.parameters = parameters
		wallhaven.lastParams = 'user'
		wallhaven.time = freqControl.set()

		wallhavenForm.load()

		const list = await requestNewList(parameters)

		if (!list || list.length === 0) {
			wallhavenForm.warn(`Cannot get "${parameters}"`)
			return
		}

		wallhavenCache['user'] = list

		await preloadImage(wallhavenCache['user'][0].path)
		preloadImage(wallhavenCache['user'][1].path)
		loadBackground(wallhavenCache['user'][0])

		wallhavenForm.accept('i_parameters', parameters)
	}

	storage.sync.set({ wallhaven })
	storage.local.set({ wallhavenCache })
}

async function cacheControl(wallhaven: Wallhaven.Sync, cache?: Wallhaven.Local) {
	wallhaven = { ...SYNC_DEFAULT.wallhaven, ...wallhaven }
	cache = cache ?? (await getCache())

	let { lastParams } = wallhaven 
	const { every, time, parameters, pausedImage } = wallhaven

	const needNewImage = freqControl.get(every, time ?? Date.now())
	const needNewParams = !every.match(/day|pause/) && periodOfDay() !== lastParams

	if (needNewParams && lastParams !== 'user') {
		lastParams = periodOfDay()
	}

	let params = lastParams === 'user' ? parameters : bonjourrParams[lastParams]
	let list = cache[lastParams]

	if (list.length === 0) {
		const newlist = await requestNewList(params)

		if (!newlist) {
			return
		}

		list = newlist
		await preloadImage(list[0].path)

		cache[lastParams] = list
		storage.local.set({ wallhavenCache: cache })
		sessionStorage.setItem('waitingForPreload', 'true')
	}

	if (sessionStorage.waitingForPreload === 'true') {
		loadBackground(list[0])
		await preloadImage(list[1].path)
		return
	}

	if (!needNewImage) {
		const hasPausedImage = every === 'pause' && pausedImage
		loadBackground(hasPausedImage ? pausedImage : list[0])
		return
	}

	// Needs new image, Update time
	wallhaven.lastParams = lastParams
	wallhaven.time = freqControl.set()

	if (list.length > 1) {
		list.shift()
	}

	loadBackground(list[0])

	if (every === 'pause') {
		wallhaven.pausedImage = list[0]
	}

	// If end of cache, get & save new list
	if (list.length === 1 && navigator.onLine) {
		const newList = await requestNewList(params)

		if (newList) {
			cache[wallhaven.lastParams] = list.concat(newList)
			await preloadImage(newList[0].path)
		}
	}

	// Or preload next
	else if (list.length > 1) {
		await preloadImage(list[1].path)
	}

	storage.sync.set({ wallhaven })
	storage.local.set({ wallhavenCache: cache })
}

async function initWallhavenBackgrounds(wallhaven: Wallhaven.Sync, cache: Wallhaven.Local) {
	wallhaven = { ...SYNC_DEFAULT.wallhaven, ...wallhaven }
	cache = cache ?? (await getCache())

	const lastParams = periodOfDay()
	let list = await requestNewList(bonjourrParams[lastParams])

	if (!list) {
		return
	}

	cache[lastParams] = list
	wallhaven.lastParams = lastParams
	wallhaven.time = new Date().getTime()
	preloadImage(list[0].path)

	// With weather loaded and different suntime
	// maybe use another collection ?

	await new Promise((sleep) => setTimeout(sleep, 200))

	const lastParamsAgain = periodOfDay()

	if (lastParams !== lastParamsAgain) {
		list = (await requestNewList(bonjourrParams[lastParamsAgain])) ?? []
		wallhaven.lastParams = lastParamsAgain
		cache[lastParamsAgain] = list
	}

	storage.sync.set({ wallhaven })
	storage.local.set({ wallhavenCache: cache })
	sessionStorage.setItem('waitingForPreload', 'true')

	loadBackground(list[0])
	await preloadImage(list[1].path)
}

async function requestNewList(parameters: string): Promise<Wallhaven.Image[] | null> {
	let json: Wallhaven.API[]

	const fullUrlParams = parameters.match(/(?<=wallhaven\.cc\/search\?).+/)
	const url = 'https://wallhaven.cc/api/v1/search?' +
	            (fullUrlParams ?? `${search_settings}&q=${parameters}`)

	const resp = await apiFetch(url)

	if (resp?.status === 404) {
		return null
	}

	json = await resp?.json()

	if (json.length === 1) {
		return null
	}

	const filteredList: Wallhaven.Image[] = []

	for (const img of json.data) {
		filteredList.push({
			id: img.id,
			url: img.url,
			path: img.path,
			colors: img.colors[0],
		})
	}

	return filteredList
}

function imgCredits(image: Wallhaven.Image) {
	const domcontainer = document.getElementById('credit-container')
	const domcredit = document.getElementById('credit')

	if (!domcontainer || !domcredit) return

	const domurl = document.createElement('a')
	domurl.textContent = tradThis('Photo from Wallhaven')
	domurl.href = image.url

	domcredit.textContent = ''
	domcredit.appendChild(domurl)
	appendSaveLink(domcredit, image)

	domcontainer.classList.toggle('shown', true)
}

async function getCache(): Promise<Wallhaven.Local> {
	const cache = (await storage.local.get('wallhavenCache'))?.wallhavenCache ?? { ...LOCAL_DEFAULT.wallhavenCache }
	return cache
}

function loadBackground(props: Wallhaven.Image) {
	imgBackground(props.path, props.colors)
	imgCredits(props)
}

async function preloadImage(src: string) {
	const img = new Image()
	img.referrerPolicy = 'no-referrer'

	sessionStorage.setItem('waitingForPreload', 'true')

	try {
		img.src = src
		await img.decode()
		img.remove()
		sessionStorage.removeItem('waitingForPreload')
	} catch (_) {
		console.warn('Could not decode image: ', src)
	}

}

function appendSaveLink(domcredit: HTMLElement, image: Wallhaven.Image) {
	const domsave = document.createElement('a')
	domsave.className = 'save'
	domsave.title = 'Download the current background to your computer'
	domsave.onclick = () => saveImage(domsave, image)

	domcredit.appendChild(domsave)
}

async function saveImage(domsave: HTMLAnchorElement, image: Wallhaven.Image) {
	domsave.classList.add('loading')
	try {
		const imageResponse = await fetch(image.path)

		if (!imageResponse.ok) return

		const blob = await imageResponse.blob()

		domsave.onclick = null
		domsave.href = URL.createObjectURL(blob)
		domsave.download = image.path

		domsave.click()
	} finally {
		domsave.classList.remove('loading')
	}
}

async function apiFetch(url: string): Promise<Response | undefined> {
	url = `https://api.bonjourr.fr/proxy?query=${url}`;
	try {
		return await fetch(url)
	} catch (error) {
		console.warn(error)
		await new Promise((r) => setTimeout(() => r(true), 200))
	}
}
