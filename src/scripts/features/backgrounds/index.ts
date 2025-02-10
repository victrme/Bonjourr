import localBackgrounds from './local'
import { credits } from './credits'

import { freqControl, periodOfDay, rgbToHex } from '../../utils'
import onSettingsLoad from '../../utils/onsettingsload'
import { BROWSER } from '../../defaults'
import debounce from '../../utils/debounce'
import userDate from '../../utils/userdate'
import storage from '../../storage'

type BackgroundApiResponse = Backgrounds.Item[] & Local.DaylightImages & Local.DaylightVideos

interface BackgroundUpdate {
	freq?: string
	type?: string
	blur?: string
	color?: string
	bright?: string
	fadein?: string
	refresh?: HTMLSpanElement
}

interface ApplyBackgroundOptions {
	image?: Backgrounds.Image
	video?: Backgrounds.Video
	solid?: string
}

const propertiesUpdateDebounce = debounce(filtersUpdate, 600)
const colorUpdateDebounce = debounce(solidUpdate, 600)

export default function backgrounds(sync: Sync.Storage, local: Local.Storage, init?: true): void {
	if (init) {
		onSettingsLoad(() => handleBackgroundOptions(sync.backgrounds.type))
	}

	applyFilters(sync.backgrounds)

	switch (sync.backgrounds.type) {
		case 'urls':
			// not yet
			break

		case 'color':
			applyBackground({ solid: sync.backgrounds.color })
			break

		case 'files':
			localBackgrounds()
			break

		default:
			backgroundFrequencyControl(sync.backgrounds, local)
	}
}

// 	Storage update

export async function backgroundUpdate(update: BackgroundUpdate): Promise<void> {
	if (update.blur !== undefined) {
		applyFilters({ blur: parseFloat(update.blur) })
		propertiesUpdateDebounce({ blur: parseFloat(update.blur) })
		return
	}

	if (update.bright !== undefined) {
		applyFilters({ bright: parseFloat(update.bright) })
		propertiesUpdateDebounce({ bright: parseFloat(update.bright) })
		return
	}

	if (update.fadein !== undefined) {
		applyFilters({ fadein: parseInt(update.fadein) })
		propertiesUpdateDebounce({ fadein: parseFloat(update.fadein) })
		return
	}

	const data = await storage.sync.get('backgrounds')
	const local = await storage.local.get()

	if (isBackgroundType(update.type)) {
		data.backgrounds.type = update.type
		storage.sync.set({ backgrounds: data.backgrounds })
		handleBackgroundOptions(update.type)
		backgrounds(data, local)
	}

	if (isFrequency(update.freq)) {
		data.backgrounds.frequency = update.freq
		storage.sync.set({ backgrounds: data.backgrounds })
	}

	if (update.refresh) {
		local.backgroundLastChange = userDate().toISOString()
		storage.local.set({ backgroundLastChange: local.backgroundLastChange })
		backgrounds(data, local)
	}

	if (update.color) {
		applyBackground({ solid: update.color })
		colorUpdateDebounce(update.color)
	}
}

export async function filtersUpdate({ blur, bright, fadein }: Partial<Sync.Backgrounds>) {
	const data = await storage.sync.get('backgrounds')

	if (blur !== undefined) data.backgrounds.blur = blur
	if (bright !== undefined) data.backgrounds.bright = bright
	if (fadein !== undefined) data.backgrounds.fadein = fadein

	storage.sync.set({ backgrounds: data.backgrounds })
}

async function solidUpdate(value: string) {
	const data = await storage.sync.get('backgrounds')
	data.backgrounds.color = value
	storage.sync.set({ backgrounds: data.backgrounds })
}

//	Cache & network

async function backgroundFrequencyControl(backgrounds: Sync.Backgrounds, local: Local.Storage): Promise<void> {
	// 1. Find correct list to use

	let list: Backgrounds.Video[] | Backgrounds.Image[] = []

	if (backgrounds.type === 'images') {
		const images = backgrounds.images
		const isCustom = images.user

		if (isCustom && local.customCollection) {
			list = getCollection(backgrounds, local).customImages()
		}
		if (!isCustom && local.daylightCollection) {
			list = getCollection(backgrounds, local).daylightImages()
		}
	}

	if (backgrounds.type === 'videos') {
		const videos = backgrounds.videos
		const isCustom = videos.user

		if (isCustom && local.customCollection) {
			list = getCollection(backgrounds, local).customVideos()
		}
		if (!isCustom && local.daylightCollection) {
			list = getCollection(backgrounds, local).daylightVideos()
		}
	}

	// 2. Control change for specified list

	const lastTime = new Date(local.backgroundLastChange ?? '').getTime()
	const needNew = freqControl.get(backgrounds.frequency, lastTime)

	if (list.length === 0) {
		const json = await fetchNewBackgrounds(backgrounds)

		if (json) {
			local = setCollection(backgrounds, local).fromApi(json)
			local.backgroundLastChange = userDate().toISOString()
			storage.local.set(local)
			// preload image
		}
	}

	if (local.backgroundPreloading) {
		// Don't change
		// Keep preloading
		return
	}

	if (!needNew && backgrounds.frequency === 'pause') {
		if (backgrounds.images?.paused) applyBackground({ image: backgrounds.images.paused })
		if (backgrounds.videos?.paused) applyBackground({ video: backgrounds.videos.paused })
		return
	}

	if (!needNew && backgrounds.frequency !== 'pause') {
		if (isVideo(list[0])) applyBackground({ video: list[0] })
		if (isImage(list[0])) applyBackground({ image: list[0] })
		return
	}

	if (list.length > 1) {
		list.shift()
	}

	if (backgrounds.frequency === 'pause') {
		if (backgrounds.type === 'images') backgrounds.images.paused = list[0] as Backgrounds.Image
		if (backgrounds.type === 'videos') backgrounds.videos.paused = list[0] as Backgrounds.Video
	}

	if (list.length > 1 && navigator.onLine) {
		// preload next image
		local = setCollection(backgrounds, local).fromList(list)
		storage.local.set(local)
	}

	// End of cache, get & save new list
	if (list.length === 1 && navigator.onLine) {
		const json = await fetchNewBackgrounds(backgrounds)

		if (json) {
			local = setCollection(backgrounds, local).fromApi(json)
			local.backgroundLastChange = userDate().toISOString()
			storage.local.set(local)
			// preload image
		}
	}

	if (isVideo(list[0])) applyBackground({ video: list[0] })
	if (isImage(list[0])) applyBackground({ image: list[0] })

	storage.sync.set({ backgrounds })
}

async function fetchNewBackgrounds(backgrounds: Sync.Backgrounds): Promise<BackgroundApiResponse> {
	switch (backgrounds.type) {
		case 'files':
		case 'urls':
		case 'color': {
			throw new Error('Can only fetch with "images" or "videos" type')
		}
	}

	const type = backgrounds.type
	const infos = type === 'images' ? backgrounds.images : backgrounds.videos
	const category = infos.user ? 'user' : 'daylight'
	const provider = infos.provider

	const path = `https://services.bonjourr.fr/backgrounds/${category}/${type}/${provider}`
	const resp = await fetch(path)
	const json = (await resp.json()) as BackgroundApiResponse

	const isResponseDaylightImage = json?.day[0]?.url
	const isResponseDaylightVideo = json?.day[0]?.duration
	const isResponseCustomImage = json[0]?.url
	const isResponseCustomVideo = json[0]?.duration

	const isDaylightImage = isResponseDaylightImage && category === 'daylight' && type === 'images'
	const isDaylightVideo = isResponseDaylightVideo && category === 'daylight' && type === 'videos'
	const isCustomImage = isResponseCustomImage && category === 'user' && type === 'images'
	const isCustomVideo = isResponseCustomVideo && category === 'user' && type === 'videos'

	if (isDaylightImage || isDaylightVideo || isCustomImage || isCustomVideo) {
		return json
	}

	throw new Error('Received JSON is bad')
}

function getCollection(backgrounds: Sync.Backgrounds, local: Local.Storage) {
	const date = userDate()
	const period = periodOfDay(date.getTime())

	function daylightImages(): Backgrounds.Image[] {
		if (!local.daylightCollection) {
			throw new Error('Empty daylight collection !')
		}
		if (backgrounds.type !== 'images') {
			throw new Error('Selected background type is not "images"')
		}

		const provider = backgrounds.images.provider
		const images = local.daylightCollection.images

		return images[provider][period]
	}

	function daylightVideos(): Backgrounds.Video[] {
		if (!local.daylightCollection) {
			throw new Error('Empty daylight collection !')
		}
		if (backgrounds.type !== 'videos') {
			throw new Error('Selected background type is not "videos"')
		}

		const provider = backgrounds.videos.provider
		const videos = local.daylightCollection.videos

		return videos[provider][period]
	}

	function customImages(): Backgrounds.Image[] {
		if (!local.customCollection) {
			throw new Error('Empty custom collection !')
		}
		if (backgrounds.type !== 'images') {
			throw new Error('Selected background type is not "images"')
		}

		const provider = backgrounds.images.provider
		const images = local.customCollection.images

		return images[provider]
	}

	function customVideos(): Backgrounds.Video[] {
		if (!local.customCollection) {
			throw new Error('Empty custom collection !')
		}
		if (backgrounds.type !== 'videos') {
			throw new Error('Selected background type is not "videos"')
		}

		const provider = backgrounds.videos.provider
		const videos = local.customCollection.videos
		return videos[provider]
	}

	return {
		daylightImages,
		daylightVideos,
		customImages,
		customVideos,
	}
}

function setCollection(backgrounds: Sync.Backgrounds, local: Local.Storage) {
	switch (backgrounds.type) {
		case 'files':
		case 'urls':
		case 'color': {
			throw new Error('Can only update with "images" or "videos" type')
		}
	}

	const date = userDate()
	const period = periodOfDay(date.getTime())
	const imageProvider = backgrounds.images?.provider
	const videoProvider = backgrounds.videos?.provider

	function fromApi(json: BackgroundApiResponse): Local.Storage {
		const isDaylightImage = backgrounds.images && json?.day[0]?.url
		const isDaylightVideo = backgrounds.videos && json?.day[0]?.duration
		const isCustomImage = backgrounds.images?.user && json[0]?.url
		const isCustomVideo = backgrounds.videos?.user && json[0]?.duration

		if (isDaylightImage && local.daylightCollection) {
			local.daylightCollection.images[imageProvider] = json
		}
		if (isDaylightVideo && local.daylightCollection) {
			local.daylightCollection.videos[videoProvider] = json
		}
		if (isCustomImage && local.customCollection) {
			local.customCollection.images[imageProvider] = json
		}
		if (isCustomVideo && local.customCollection) {
			local.customCollection.videos[videoProvider] = json
		}

		return local
	}

	function fromList(list: Backgrounds.Image[] | Backgrounds.Video[]): Local.Storage {
		const isDaylightImage = backgrounds.images && (list[0] as Backgrounds.Image)?.url
		const isDaylightVideo = backgrounds.videos && (list[0] as Backgrounds.Video)?.duration
		const isCustomImage = backgrounds.images?.user !== undefined
		const isCustomVideo = backgrounds.videos?.user !== undefined

		if (isDaylightImage && local.daylightCollection && isImage(list[0])) {
			local.daylightCollection.images[imageProvider][period] = list as Backgrounds.Image[]
		}
		if (isDaylightVideo && local.daylightCollection && isVideo(list[0])) {
			local.daylightCollection.videos[videoProvider][period] = list as Backgrounds.Video[]
		}
		if (isCustomImage && local.customCollection && isImage(list[0])) {
			local.customCollection.images[imageProvider] = list as Backgrounds.Image[]
		}
		if (isCustomVideo && local.customCollection && isVideo(list[0])) {
			local.customCollection.videos[videoProvider] = list as Backgrounds.Video[]
		}

		return local
	}

	return { fromList, fromApi }
}

// 	Apply to DOM

export function applyBackground({ image, video, solid }: ApplyBackgroundOptions) {
	const overlay = document.getElementById('background-overlay') as HTMLDivElement
	const solidBackground = document.getElementById('solid-background') as HTMLDivElement
	const imageWrapper = document.getElementById('image-background-wrapper') as HTMLDivElement
	const videoWrapper = document.getElementById('video-background-wrapper') as HTMLDivElement

	solidBackground.style.display = solid ? 'block' : 'none'
	imageWrapper.style.display = image ? 'block' : 'none'
	videoWrapper.style.display = video ? 'block' : 'none'

	credits(image ? image : undefined)

	if (image) {
		const img = new Image()

		img.onload = () => {
			const bgfirst = document.getElementById('image-background') as HTMLDivElement
			const bgsecond = document.getElementById('image-background-bis') as HTMLDivElement
			const loadBis = bgfirst.style.opacity === '1'
			const bgToChange = loadBis ? bgsecond : bgfirst

			bgfirst.style.opacity = loadBis ? '0' : '1'
			bgToChange.style.backgroundImage = `url(${image.url})`
			overlay.classList.remove('hidden')

			if (BROWSER === 'safari') {
				if (!image.color) {
					image.color = getAverageColor(img)
				}

				if (image.color) {
					const fadein = parseInt(document.documentElement.style.getPropertyValue('--fade-in'))
					document.querySelector('meta[name="theme-color"]')?.setAttribute('content', image.color)
					setTimeout(() => document.documentElement.style.setProperty('--average-color', image.color!), fadein)
				}
			}
		}

		img.src = image.url
		img.remove()
	}

	if (video) {
		const domvideo = document.querySelector<HTMLMediaElement>('#video-background')
		const domvideobis = document.querySelector<HTMLMediaElement>('#video-background-bis')

		if (domvideo && domvideobis) {
			domvideo.src = video.urls.tiny
			setTimeout(() => overlay.classList.remove('hidden'))
			setTimeout(() => {
				domvideobis.style.opacity = '1'
				domvideobis.style.zIndex = '2'
				domvideobis.src = video.urls.tiny
			}, 1000 * video.duration - 4)
		}
	}

	if (solid) {
		document.documentElement.style.setProperty('--solid-background', solid)
		overlay.classList.remove('hidden')
	}
}

export function applyFilters({ blur, bright, fadein }: Partial<Sync.Backgrounds>) {
	if (blur !== undefined) {
		document.documentElement.style.setProperty('--blur', blur + 'px')
		document.body.classList.toggle('blurred', blur >= 15)
	}

	if (bright !== undefined) {
		document.documentElement.style.setProperty('--brightness', bright + '')
	}

	if (fadein !== undefined) {
		document.documentElement.style.setProperty('--fade-in', fadein + 'ms')
	}
}

// 	Settings options

async function handleBackgroundOptions(type: string) {
	if (isBackgroundType(type) === false) {
		return
	}

	const overlay = document.querySelector<HTMLElement>('#background-overlay')

	if (overlay) {
		overlay.dataset.type = type
	}

	document.getElementById('local_options')?.classList.toggle('shown', type === 'files')
	document.getElementById('solid_options')?.classList.toggle('shown', type === 'color')
	document.getElementById('unsplash_options')?.classList.toggle('shown', type === 'images')
	document.getElementById('background-urls-option')?.classList.toggle('shown', type === 'urls')
	document.getElementById('background-freq-option')?.classList.toggle('shown', type !== 'color')
	document.getElementById('background-filters-options')?.classList.toggle('shown', type !== 'color')
	// document.getElementById('background-provider-option')?.classList.toggle('shown', type === 'images')

	if (type === 'files') {
		localBackgrounds({ settings: document.getElementById('settings') as HTMLElement })
		setTimeout(() => localBackgrounds(), 100)
	}

	if (type === 'images') {
		const data = await storage.sync.get()
		const local = await storage.local.get()

		document.querySelector<HTMLSelectElement>('#i_freq')!.value = data.backgrounds.frequency
		document.getElementById('credit-container')?.classList.toggle('shown', true)
		backgrounds(data, local)
	}
}

//  Helpers

function getAverageColor(img: HTMLImageElement) {
	try {
		// Create a canvas element
		const canvas = document.createElement('canvas')
		const ctx = canvas.getContext('2d')

		const MAX_DIMENSION = 100 // resizing the image for better performance

		// Calculate the scaling factor to maintain aspect ratio
		const scale = Math.min(MAX_DIMENSION / img.width, MAX_DIMENSION / img.height)

		// Set canvas dimensions to the scaled image dimensions
		canvas.width = img.width * scale
		canvas.height = img.height * scale

		// Draw the image onto the canvas
		ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)

		// Get the image data from the canvas
		const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height)
		const data = imageData?.data

		let r = 0,
			g = 0,
			b = 0
		let count = 0

		// Loop through the image data and sum the color values
		if (data) {
			for (let i = 0; i < data.length; i += 4) {
				r += data[i]
				g += data[i + 1]
				b += data[i + 2]
				count++
			}
		}

		// Calculate the average color
		r = Math.floor(r / count)
		g = Math.floor(g / count)
		b = Math.floor(b / count)

		// Output the average color in RGB format
		return rgbToHex(r, g, b)
	} catch (error) {
		console.error('Error accessing image data:', error)
	}
}

function isBackgroundType(str = ''): str is Sync.Storage['backgrounds']['type'] {
	return ['files', 'urls', 'images', 'videos', 'color'].includes(str)
}
function isFrequency(str = ''): str is Frequency {
	return ['tabs', 'hour', 'day', 'period', 'pause'].includes(str)
}
function isVideo(item: Backgrounds.Video | Backgrounds.Image): item is Backgrounds.Video {
	return Object.keys(item).includes('duration')
}
function isImage(item: Backgrounds.Video | Backgrounds.Image): item is Backgrounds.Image {
	return Object.keys(item).includes('url')
}
