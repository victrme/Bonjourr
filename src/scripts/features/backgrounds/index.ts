import localBackgrounds from './local'
import textureRanges from './textures'
import { credits } from './credits'

import { freqControl, periodOfDay, rgbToHex } from '../../utils'
import onSettingsLoad from '../../utils/onsettingsload'
import { BROWSER } from '../../defaults'
import debounce from '../../utils/debounce'
import userDate from '../../utils/userdate'
import storage from '../../storage'

interface BackgroundUpdate {
	freq?: string
	type?: string
	blur?: string
	color?: string
	query?: string
	bright?: string
	fadein?: string
	refresh?: HTMLSpanElement
	collection?: string
	texture?: string
	texturesize?: string
	textureopacity?: string
}

interface ApplyBackgroundOptions {
	image?: Backgrounds.Image
	video?: Backgrounds.Video
	solid?: string
}

type BackgroundItem = Backgrounds.Video[] | Backgrounds.Image[]
type BackgroundDaylight = Local.DaylightCollection['images'] | Local.DaylightCollection['videos']
type BackgroundApiResponse = BackgroundItem | BackgroundDaylight

const propertiesUpdateDebounce = debounce(filtersUpdate, 600)
const colorUpdateDebounce = debounce(solidUpdate, 600)

export default function backgroundsInit(sync: Sync.Storage, local: Local.Storage, init?: true): void {
	if (init) {
		onSettingsLoad(() => {
			handleBackgroundOptions(sync.backgrounds)
		})
	}

	applyFilters(sync.backgrounds)
	applyTexture(sync.backgrounds.texture)
	document.getElementById('background-overlay')?.setAttribute('data-type', sync.backgrounds.type)

	switch (sync.backgrounds.type) {
		case 'urls':
			// not yet
			break

		case 'color':
			applyBackground({ solid: sync.backgrounds.color })
			break

		case 'files':
			localBackgrounds(local)
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
		handleBackgroundOptions(data.backgrounds)
		backgroundsInit(data, local)
	}

	if (isFrequency(update.freq)) {
		data.backgrounds.frequency = update.freq
		storage.sync.set({ backgrounds: data.backgrounds })
	}

	if (update.refresh) {
		local.backgroundLastChange = userDate().toISOString()
		storage.local.set({ backgroundLastChange: local.backgroundLastChange })
		backgroundsInit(data, local)
	}

	if (update.color) {
		applyBackground({ solid: update.color })
		colorUpdateDebounce(update.color)
	}

	if (isCollection(update.collection)) {
		const type = data.backgrounds.type === 'videos' ? 'videos' : 'images'
		data.backgrounds[type].collection = update.collection
		storage.sync.set({ backgrounds: data.backgrounds })
		handleBackgroundOptions(data.backgrounds)
	}

	if (update.query !== undefined) {
		const type = data.backgrounds.type
		const isImageOrVideos = type === 'images' || type === 'videos'

		if (isImageOrVideos) {
			const user = data.backgrounds[type]?.user ?? { coll: '', tags: '' }

			if (data.backgrounds[type].collection === 'usercoll') user.coll = update.query
			if (data.backgrounds[type].collection === 'usertags') user.tags = update.query

			data.backgrounds[type].user = user
			storage.sync.set({ backgrounds: data.backgrounds })
			handleBackgroundOptions(data.backgrounds)
		}
	}

	if (update.textureopacity !== undefined) {
		data.backgrounds.texture.opacity = parseFloat(update.textureopacity)
		propertiesUpdateDebounce({ texture: data.backgrounds.texture })
		applyTexture(data.backgrounds.texture)
	}

	if (update.texturesize !== undefined) {
		data.backgrounds.texture.size = parseInt(update.texturesize)
		propertiesUpdateDebounce({ texture: data.backgrounds.texture })
		applyTexture(data.backgrounds.texture)
	}

	if (isBackgroundTexture(update.texture)) {
		data.backgrounds.texture = { type: update.texture }
		storage.sync.set({ backgrounds: data.backgrounds })
		handleBackgroundOptions(data.backgrounds)
		applyTexture(data.backgrounds.texture)
	}
}

export async function filtersUpdate({ blur, bright, fadein, texture }: Partial<Sync.Backgrounds>) {
	const data = await storage.sync.get('backgrounds')

	if (blur !== undefined) data.backgrounds.blur = blur
	if (bright !== undefined) data.backgrounds.bright = bright
	if (fadein !== undefined) data.backgrounds.fadein = fadein
	if (texture !== undefined) data.backgrounds.texture = texture

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

	if (backgrounds.type === 'images') list = getCollection(backgrounds, local).images()
	if (backgrounds.type === 'videos') list = getCollection(backgrounds, local).videos()

	// 2. Control change for specified list

	const lastTime = new Date(local.backgroundLastChange ?? '').getTime()
	const needNew = freqControl.get(backgrounds.frequency, lastTime)

	if (list.length === 0) {
		const json = await fetchNewBackgrounds(backgrounds)

		if (json) {
			local = setCollection(backgrounds, local).fromApi(json)
			local.backgroundLastChange = userDate().toISOString()
			storage.local.set(local)

			if (backgrounds.type === 'images') list = getCollection(backgrounds, local).images()
			if (backgrounds.type === 'videos') list = getCollection(backgrounds, local).videos()

			if (isVideo(list[1])) preloadBackground({ video: list[1] })
			if (isImage(list[1])) preloadBackground({ image: list[1] })
		}
	}

	if (local.backgroundPreloading) {
		if (isVideo(list[0])) applyBackground({ video: list[0] })
		if (isImage(list[0])) applyBackground({ image: list[0] })
		if (isVideo(list[1])) preloadBackground({ video: list[1] })
		if (isImage(list[1])) preloadBackground({ image: list[1] })
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
		if (isVideo(list[1])) preloadBackground({ video: list[1] })
		if (isImage(list[1])) preloadBackground({ image: list[1] })

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

			if (backgrounds.type === 'images') list = getCollection(backgrounds, local).images()
			if (backgrounds.type === 'videos') list = getCollection(backgrounds, local).videos()

			if (isVideo(list[1])) preloadBackground({ video: list[1] })
			if (isImage(list[1])) preloadBackground({ image: list[1] })
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
	const user = backgrounds[type].user
	const infos = type === 'images' ? backgrounds.images : backgrounds.videos
	const category = infos.collection === 'daylight' ? 'daylight' : 'user'
	const provider = infos.provider

	const base = 'https://services.bonjourr.fr/backgrounds'
	const path = `/${category}/${type}/${provider}`
	let search = ''

	if (user?.coll) search += `?collections=${user.coll}`
	if (user?.tags) search += `?tags=${user.tags}`

	const url = base + path + search
	const resp = await fetch(url)
	const json = (await resp.json()) as BackgroundApiResponse

	const isDaylightImage = isResponseDaylightImages(json) && category === 'daylight' && type === 'images'
	const isDaylightVideo = isResponseDaylightVideos(json) && category === 'daylight' && type === 'videos'
	const isCustomImage = isResponseCustomImages(json) && category === 'user' && type === 'images'
	const isCustomVideo = isResponseCustomVideos(json) && category === 'user' && type === 'videos'

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

		return local.daylightCollection.images[period]
	}

	function daylightVideos(): Backgrounds.Video[] {
		if (!local.daylightCollection) {
			throw new Error('Empty daylight collection !')
		}
		if (backgrounds.type !== 'videos') {
			throw new Error('Selected background type is not "videos"')
		}

		return local.daylightCollection.videos[period]
	}

	function customImages(): Backgrounds.Image[] {
		if (!local.customCollection) {
			console.log(new Error('Empty custom collection storage !'))
			return daylightImages()
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
			console.log(new Error('Empty custom collection storage !'))
			return daylightVideos()
		}
		if (backgrounds.type !== 'videos') {
			throw new Error('Selected background type is not "videos"')
		}

		const provider = backgrounds.videos.provider
		const videos = local.customCollection.videos
		return videos[provider]
	}

	function images(): Backgrounds.Image[] {
		if (backgrounds.images.collection === 'daylight') {
			return daylightImages()
		} else {
			return customImages()
		}
	}

	function videos(): Backgrounds.Video[] {
		if (backgrounds.videos.collection === 'daylight') {
			return daylightVideos()
		} else {
			return customVideos()
		}
	}

	return { images, videos }
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
		if (isResponseDaylightImages(json) && local.daylightCollection) {
			local.daylightCollection.images = json
		}
		if (isResponseDaylightVideos(json) && local.daylightCollection) {
			local.daylightCollection.videos = json
		}
		if (isResponseCustomImages(json) && local.customCollection) {
			local.customCollection.images[imageProvider] = json
		}
		if (isResponseCustomVideos(json) && local.customCollection) {
			local.customCollection.videos[videoProvider] = json
		}

		return local
	}

	function fromList(list: Backgrounds.Image[] | Backgrounds.Video[]): Local.Storage {
		if (isImage(list[0]) && local.daylightCollection) {
			local.daylightCollection.images[period] = list as Backgrounds.Image[]
		}
		if (isVideo(list[0]) && local.daylightCollection) {
			local.daylightCollection.videos[period] = list as Backgrounds.Video[]
		}
		if (isImage(list[0]) && local.customCollection) {
			local.customCollection.images[imageProvider] = list as Backgrounds.Image[]
		}
		if (isVideo(list[0]) && local.customCollection) {
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
	const blurred = document.body.className.includes('blurred')

	solidBackground.style.display = solid ? 'block' : 'none'
	imageWrapper.style.display = image ? 'block' : 'none'
	videoWrapper.style.display = video ? 'block' : 'none'

	credits(image ? image : undefined)
	overlay.classList.remove('hidden')

	if (image) {
		const applySafariThemeColor = (color?: string) => {
			if (BROWSER === 'safari' && !color) {
				image.color = getAverageColor(img)
			}

			if (BROWSER === 'safari' && color) {
				const fadein = parseInt(document.documentElement.style.getPropertyValue('--fade-in'))
				document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color)
				setTimeout(() => document.documentElement.style.setProperty('--average-color', color!), fadein)
			}
		}

		const applyLoadedImage = () => {
			imageWrapper?.append(div)

			setTimeout(() => {
				div.style.removeProperty('opacity')
			}, 10)

			if (imageWrapper.childElementCount > 1) {
				setTimeout(() => {
					imageWrapper.firstChild?.remove()
				}, 1300)
			}
		}

		const src = blurred ? image.urls.small : image.urls.full
		const div = document.createElement('div')
		const img = new Image()

		img.addEventListener('load', function () {
			applyLoadedImage()
			applySafariThemeColor(image.color)
		})

		img.src = src
		img.remove()

		div.style.backgroundImage = `url(${src})`
		div.style.opacity = '0'
	}

	if (video) {
		const opacity = 4 //s
		const duration = 1000 * (video.duration - opacity)
		const src = blurred ? video.urls.small : video.urls.full

		const createVideo = () => {
			const vid = document.createElement('video')
			vid.src = src
			vid.muted = true
			vid.autoplay = true
			videoWrapper?.prepend(vid)
			setTimeout(() => overlay.classList.remove('hidden'))
		}

		const rerunVideo = () => {
			setTimeout(() => {
				createVideo()
				videoWrapper.lastElementChild?.setAttribute('style', 'opacity: 0')
				setTimeout(() => videoWrapper.lastElementChild?.remove(), 4000)
			})
		}

		createVideo()
		setInterval(rerunVideo, duration)
	}

	if (solid) {
		document.documentElement.style.setProperty('--solid-background', solid)
		overlay.classList.remove('hidden')
	}
}

export function preloadBackground({ image, video }: ApplyBackgroundOptions) {
	const blurred = document.body.className.includes('blurred')
	const img = document.createElement('img')

	if (image) {
		img.addEventListener('load', function () {
			storage.local.remove('backgroundPreloading')
			img.remove()
		})
		img.src = blurred ? image.urls.small : image.urls.full
		storage.local.set({ backgroundPreloading: true })
	}

	if (video) {
		const vid = document.createElement('video')

		vid.addEventListener('progress', function (e) {
			setTimeout(() => {
				storage.local.remove('backgroundPreloading')
				vid.remove()
			}, 200)
		})

		vid.src = blurred ? video.urls.small : video.urls.full
		storage.local.set({ backgroundPreloading: true })
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

function applyTexture(texture: Sync.Backgrounds['texture']): void {
	const domtexture = document.getElementById('background-texture')

	if (!domtexture) {
		console.log(new Error('?'))
		return
	}

	const ranges = textureRanges[texture.type]
	const size = texture.size ?? ranges.size.value
	const opacity = texture.opacity ?? ranges.opacity.value

	domtexture.dataset.texture = texture.type
	document.documentElement.style.setProperty('--texture-opacity', opacity + '')
	document.documentElement.style.setProperty('--texture-size', size + 'px')
}

// 	Settings options

async function handleBackgroundOptions(backgrounds: Sync.Backgrounds) {
	const type = backgrounds.type

	document.getElementById('local_options')?.classList.toggle('shown', type === 'files')
	document.getElementById('solid_options')?.classList.toggle('shown', type === 'color')
	document.getElementById('unsplash_options')?.classList.toggle('shown', type === 'images')
	document.getElementById('background-urls-option')?.classList.toggle('shown', type === 'urls')
	document.getElementById('background-freq-option')?.classList.toggle('shown', type !== 'color')
	document.getElementById('background-filters-options')?.classList.toggle('shown', type !== 'color')

	handleTextureOptions(backgrounds)
	handleCollectionOptions(backgrounds)
}

function handleTextureOptions(backgrounds: Sync.Backgrounds) {
	const hasTexture = backgrounds.texture.type !== 'none'

	document.getElementById('background-texture-options')?.classList.toggle('shown', hasTexture)

	if (hasTexture) {
		const i_opacity = document.querySelector<HTMLInputElement>('#i_texture-opacity')
		const i_size = document.querySelector<HTMLInputElement>('#i_texture-size')
		const ranges = textureRanges[backgrounds.texture.type]
		const { opacity, size } = backgrounds.texture

		if (i_opacity) {
			i_opacity.min = ranges.opacity.min
			i_opacity.max = ranges.opacity.max
			i_opacity.step = ranges.opacity.step
			i_opacity.value = opacity === undefined ? ranges.opacity.value : opacity.toString()
		}

		if (i_size) {
			i_size.min = ranges.size.min
			i_size.max = ranges.size.max
			i_size.step = ranges.size.step
			i_size.value = size === undefined ? ranges.size.value : size.toString()
		}
	}
}

function handleCollectionOptions(backgrounds: Sync.Backgrounds) {
	const type = backgrounds.type
	const isImageOrVideos = type === 'images' || type === 'videos'

	if (isImageOrVideos) {
		const hasColls = backgrounds[type].collection === 'usercoll'
		const hasTags = backgrounds[type].collection === 'usertags'

		document.getElementById('background-provider-option')?.classList.toggle('shown', hasColls || hasTags)
		document.getElementById('background-user-coll-option')?.classList.toggle('shown', hasColls)
		document.getElementById('background-user-tags-option')?.classList.toggle('shown', hasTags)

		const domcollection = document.querySelector<HTMLSelectElement>('#i_background-collection')!
		const domusercoll = document.querySelector<HTMLInputElement>('#i_background-user-coll')!
		const domusertags = document.querySelector<HTMLInputElement>('#i_background-user-tags')!

		domcollection.value = hasColls ? 'usercoll' : hasTags ? 'usertags' : 'daylight'
		domusercoll.value = backgrounds[type].user?.coll ?? ''
		domusertags.value = backgrounds[type].user?.tags ?? ''
	}

	document.getElementById('background-collection-option')?.classList.toggle('shown', isImageOrVideos)
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
function isBackgroundTexture(str = ''): str is Sync.Storage['backgrounds']['texture']['type'] {
	return ['none', 'grain', 'dots', 'topographic'].includes(str)
}
function isCollection(str = ''): str is Sync.Storage['backgrounds']['images']['collection'] {
	return ['daylight', 'usercoll', 'usertags'].includes(str)
}
function isFrequency(str = ''): str is Frequency {
	return ['tabs', 'hour', 'day', 'period', 'pause'].includes(str)
}

function isResponseDaylightImages(json: BackgroundApiResponse): json is Local.DaylightCollection['images'] {
	return 'day' in json ? isImage(json.day[0]) : false
}
function isResponseDaylightVideos(json: BackgroundApiResponse): json is Local.DaylightCollection['videos'] {
	return 'day' in json ? isVideo(json.day[0]) : false
}
function isResponseCustomImages(json: BackgroundApiResponse): json is Backgrounds.Image[] {
	return 'day' in json ? false : isImage(json[0])
}
function isResponseCustomVideos(json: BackgroundApiResponse): json is Backgrounds.Video[] {
	return 'day' in json ? false : isVideo(json[0])
}

function isVideo(item: Backgrounds.Video | Backgrounds.Image): item is Backgrounds.Video {
	return item.format === 'video'
}
function isImage(item: Backgrounds.Video | Backgrounds.Image): item is Backgrounds.Image {
	return item.format === 'image'
}
