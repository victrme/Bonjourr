import { getFilesAsCollection, initThumbnailEvents, handleFilesSettingsOptions } from './local'
import { applyUrls, getUrlsAsCollection, initUrlsEditor } from './urls'
import { TEXTURE_RANGES } from './textures'
import { PROVIDERS } from './providers'
import { credits } from './credits'

import { userDate, daylightPeriod, needsChange } from '../../shared/time'
import { turnRefreshButton } from '../../shared/dom'
import { onSettingsLoad } from '../../utils/onsettingsload'
import { rgbToHex } from '../../shared/generic'
import { debounce } from '../../utils/debounce'
import { BROWSER } from '../../defaults'
import { storage } from '../../storage'

interface BackgroundUpdate {
	freq?: string
	type?: string
	blur?: string
	color?: string
	query?: string
	bright?: string
	fadein?: string
	refresh?: HTMLSpanElement
	urlsapply?: true
	texture?: string
	provider?: string
	texturesize?: string
	textureopacity?: string
}

interface ApplyBackgroundOptions {
	image?: Backgrounds.Image
	video?: Backgrounds.Video
	solid?: string
}

const propertiesUpdateDebounce = debounce(filtersUpdate, 600)
const colorUpdateDebounce = debounce(solidUpdate, 600)

export function backgroundsInit(sync: Sync.Storage, local: Local.Storage, init?: true): void {
	if (init) {
		onSettingsLoad(() => {
			initThumbnailEvents()
			handleFilesSettingsOptions(local)
			initUrlsEditor(sync.backgrounds, local)
			createProviderSelect(sync.backgrounds)
			handleBackgroundOptions(sync.backgrounds)
		})
	}

	applyFilters(sync.backgrounds)
	applyTexture(sync.backgrounds.texture)
	document.getElementById('background-overlay')?.setAttribute('data-type', sync.backgrounds.type)

	if (sync.backgrounds.type === 'color') {
		applyBackground({ solid: sync.backgrounds.color })
	} else {
		backgroundCacheControl(sync.backgrounds, local)
	}
}

// 	Storage update

export async function backgroundUpdate(update: BackgroundUpdate): Promise<void> {
	if (update.blur !== undefined) {
		applyFilters({ blur: Number.parseFloat(update.blur) })
		propertiesUpdateDebounce({ blur: Number.parseFloat(update.blur) })
		return
	}

	if (update.bright !== undefined) {
		applyFilters({ bright: Number.parseFloat(update.bright) })
		propertiesUpdateDebounce({ bright: Number.parseFloat(update.bright) })
		return
	}

	if (update.fadein !== undefined) {
		applyFilters({ fadein: Number.parseInt(update.fadein) })
		propertiesUpdateDebounce({ fadein: Number.parseFloat(update.fadein) })
		return
	}

	const data = await storage.sync.get('backgrounds')
	const local = await storage.local.get()

	if (isBackgroundType(update.type)) {
		data.backgrounds.type = update.type
		storage.sync.set({ backgrounds: data.backgrounds })
		createProviderSelect(data.backgrounds)
		handleBackgroundOptions(data.backgrounds)
		backgroundsInit(data, local)
	}

	if (isFrequency(update.freq)) {
		data.backgrounds.frequency = update.freq
		storage.sync.set({ backgrounds: data.backgrounds })
	}

	if (update.refresh) {
		local.backgroundLastChange = new Date(0).toString()
		backgroundsInit(data, local)
		turnRefreshButton(update.refresh, true)
	}

	if (update.color) {
		applyBackground({ solid: update.color })
		colorUpdateDebounce(update.color)
	}

	if (update.urlsapply) {
		applyUrls(data.backgrounds)
	}

	// Textures

	if (update.textureopacity !== undefined) {
		data.backgrounds.texture.opacity = Number.parseFloat(update.textureopacity)
		propertiesUpdateDebounce({ texture: data.backgrounds.texture })
		applyTexture(data.backgrounds.texture)
	}

	if (update.texturesize !== undefined) {
		data.backgrounds.texture.size = Number.parseInt(update.texturesize)
		propertiesUpdateDebounce({ texture: data.backgrounds.texture })
		applyTexture(data.backgrounds.texture)
	}

	if (isBackgroundTexture(update.texture)) {
		data.backgrounds.texture = { type: update.texture }
		storage.sync.set({ backgrounds: data.backgrounds })
		handleBackgroundOptions(data.backgrounds)
		applyTexture(data.backgrounds.texture)
	}

	// Images & Videos only

	switch (data.backgrounds.type) {
		case 'files':
		case 'urls':
		case 'color': {
			return
		}

		default:
	}

	if (update.provider) {
		data.backgrounds[data.backgrounds.type].collection = update.provider
		storage.sync.set({ backgrounds: data.backgrounds })
		handleBackgroundOptions(data.backgrounds)
		backgroundCacheControl(data.backgrounds, local)
	}

	if (update.query !== undefined) {
		data.backgrounds[data.backgrounds.type].query = update.query
		storage.sync.set({ backgrounds: data.backgrounds })
		handleBackgroundOptions(data.backgrounds)
		backgroundCacheControl(data.backgrounds, local)
	}
}

export async function filtersUpdate({ blur, bright, fadein, texture }: Partial<Sync.Backgrounds>) {
	const data = await storage.sync.get('backgrounds')

	if (blur !== undefined) {
		data.backgrounds.blur = blur
	}
	if (bright !== undefined) {
		data.backgrounds.bright = bright
	}
	if (fadein !== undefined) {
		data.backgrounds.fadein = fadein
	}
	if (texture !== undefined) {
		data.backgrounds.texture = texture
	}

	storage.sync.set({ backgrounds: data.backgrounds })
}

async function solidUpdate(value: string) {
	const data = await storage.sync.get('backgrounds')
	data.backgrounds.color = value
	storage.sync.set({ backgrounds: data.backgrounds })
}

//	Cache & network

async function backgroundCacheControl(backgrounds: Sync.Backgrounds, local: Local.Storage): Promise<void> {
	if (backgrounds.type === 'color') {
		return
	}

	const isImagesOrVideos = backgrounds.type === 'images' || backgrounds.type === 'videos'
	const isFilesOrUrls = backgrounds.type === 'files' || backgrounds.type === 'urls'

	// 1. Find correct list to use

	let list: Backgrounds.Video[] | Backgrounds.Image[] = []
	let keys: string[] = []

	switch (backgrounds.type) {
		case 'files': {
			const [k, l] = await getFilesAsCollection(local)
			keys = k
			list = l
			break
		}

		case 'urls': {
			const [k, l] = getUrlsAsCollection(local)
			keys = k
			list = l
			break
		}

		case 'images':
			list = getCollection(backgrounds, local).images()
			break

		case 'videos':
			list = getCollection(backgrounds, local).videos()
			break

		default:
	}

	// 2. Control change for specified list

	const lastTime = new Date(local.backgroundLastChange ?? '01/01/1971').getTime()
	const needNew = needsChange(backgrounds.frequency, lastTime)
	const isPaused = backgrounds.frequency === 'pause'

	if (list.length === 0) {
		if (isFilesOrUrls) {
			removeBackgrounds()
			return
		}

		const json = await fetchNewBackgrounds(backgrounds)

		if (json) {
			const newlocal = setCollection(backgrounds, local).fromApi(json)
			newlocal.backgroundLastChange = userDate().toString()
			storage.local.set(newlocal)

			if (backgrounds.type === 'images') {
				list = getCollection(backgrounds, newlocal).images()
			}
			if (backgrounds.type === 'videos') {
				list = getCollection(backgrounds, newlocal).videos()
			}

			if (isVideo(list[1])) {
				preloadBackground({ video: list[1] })
			}
			if (isImage(list[1])) {
				preloadBackground({ image: list[1] })
			}
		}
	}

	if (isImagesOrVideos && local.backgroundPreloading) {
		if (isVideo(list[0])) {
			applyBackground({ video: list[0] })
		}
		if (isImage(list[0])) {
			applyBackground({ image: list[0] })
		}
		if (isVideo(list[1])) {
			preloadBackground({ video: list[1] })
		}
		if (isImage(list[1])) {
			preloadBackground({ image: list[1] })
		}
		return
	}

	if (isImagesOrVideos && !needNew && isPaused) {
		if (backgrounds.images?.paused) {
			applyBackground({ image: backgrounds.images.paused })
		}
		if (backgrounds.videos?.paused) {
			applyBackground({ video: backgrounds.videos.paused })
		}
		return
	}

	if (!needNew) {
		if (isVideo(list[0])) {
			applyBackground({ video: list[0] })
		}
		if (isImage(list[0])) {
			applyBackground({ image: list[0] })
		}
		return
	}

	if (list.length > 1) {
		list.shift()
	}

	if (isImagesOrVideos && backgrounds.frequency === 'pause') {
		if (backgrounds.type === 'images') {
			backgrounds.images.paused = list[0] as Backgrounds.Image
		}
		if (backgrounds.type === 'videos') {
			backgrounds.videos.paused = list[0] as Backgrounds.Video
		}
		storage.sync.set({ backgrounds })
	}

	if (list.length > 1) {
		let newlocal = local

		if (isVideo(list[1])) {
			preloadBackground({ video: list[1] })
		}
		if (isImage(list[1])) {
			preloadBackground({ image: list[1] })
		}

		if (isImagesOrVideos) {
			newlocal = setCollection(backgrounds, local).fromList(list)
		}
		if (isFilesOrUrls) {
			newlocal = setLastUsed(backgrounds, local, keys)
		}

		newlocal.backgroundLastChange = userDate().toString()
		storage.local.set(newlocal)
	}

	// 3. Get a new set of images if needed

	if (isImagesOrVideos && list.length === 1 && navigator.onLine) {
		const json = await fetchNewBackgrounds(backgrounds)

		if (json) {
			const newlocal = setCollection(backgrounds, local).fromApi(json)
			newlocal.backgroundLastChange = userDate().toString()
			storage.local.set(newlocal)

			if (backgrounds.type === 'images') {
				list = getCollection(backgrounds, local).images()
			}
			if (backgrounds.type === 'videos') {
				list = getCollection(backgrounds, local).videos()
			}

			if (isVideo(list[1])) {
				preloadBackground({ video: list[1] })
			}
			if (isImage(list[1])) {
				preloadBackground({ image: list[1] })
			}
		}
	}

	if (isVideo(list[0])) {
		applyBackground({ video: list[0] })
	}
	if (isImage(list[0])) {
		applyBackground({ image: list[0] })
	}
}

async function fetchNewBackgrounds(backgrounds: Sync.Backgrounds): Promise<Backgrounds.Api> {
	switch (backgrounds.type) {
		case 'files':
		case 'urls':
		case 'color': {
			throw new Error('Can only fetch with "images" or "videos" type')
		}

		default:
	}

	const data = backgrounds[backgrounds.type]
	const [provider, type, category] = data.collection.split('-')

	const base = 'https://services.bonjourr.fr/backgrounds'
	const path = `/${provider}/${type}/${category}`
	let search = ''

	if (data.query) {
		search = `?query=${data.query}`
	}

	const url = base + path + search
	const resp = await fetch(url)
	const json = (await resp.json()) as Backgrounds.Api

	const areImages = type === 'images' && Object.keys(json)?.every(key => key.includes('images'))
	const areVideos = type === 'videos' && Object.keys(json)?.every(key => key.includes('videos'))

	if (areImages || areVideos) {
		return json
	}

	throw new Error('Received JSON is bad')
}

function findCollectionName(backgrounds: Sync.Backgrounds): string {
	const type = backgrounds.type === 'images' ? 'images' : 'videos'
	const collection = backgrounds[type].collection
	const isDaylight = collection.includes('daylight')

	if (isDaylight) {
		const period = daylightPeriod(userDate().getTime())
		return `${collection}-${period}`
	}

	return collection
}

function getCollection(backgrounds: Sync.Backgrounds, local: Local.Storage) {
	switch (backgrounds.type) {
		case 'files':
		case 'urls':
		case 'color': {
			throw new Error('Can only fetch with "images" or "videos" type')
		}

		default:
	}

	// Check collection storage

	const collectionName = findCollectionName(backgrounds)
	const collection = local.backgroundCollections[collectionName] ?? []

	if (collection.length === 0) {
	}

	// Check collection format

	const images = () => {
		if (areOnlyImages(collection)) {
			return collection
		}
		throw new Error('Wrong background format')
	}

	const videos = () => {
		if (areOnlyVideos(collection)) {
			return collection
		}
		throw new Error('Wrong background format')
	}

	return { images, videos }
}

function setCollection(backgrounds: Sync.Backgrounds, local: Local.Storage) {
	switch (backgrounds.type) {
		case 'files':
		case 'urls':
		case 'color': {
			throw new Error('Cannot update with this type')
		}

		default:
	}

	function fromApi(json: Backgrounds.Api): Local.Storage {
		for (const [key, list] of Object.entries(json)) {
			local.backgroundCollections[key] = list
		}

		return local
	}

	function fromList(list: Backgrounds.Item[]): Local.Storage {
		const collectionName = findCollectionName(backgrounds)
		local.backgroundCollections[collectionName] = list

		return local
	}

	return { fromList, fromApi }
}

function setLastUsed(backgrounds: Sync.Backgrounds, local: Local.Storage, keys: string[]): Local.Storage {
	switch (backgrounds.type) {
		case 'images':
		case 'videos':
		case 'color': {
			throw new Error('Cannot update with this type')
		}

		default:
	}

	if (backgrounds.type === 'urls') {
		local.backgroundUrls[keys[0]].lastUsed = userDate().toString()
	}
	if (backgrounds.type === 'files') {
		local.backgroundFiles[keys[0]].lastUsed = userDate().toString()
	}

	return local
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
				const fadein = Number.parseInt(document.documentElement.style.getPropertyValue('--fade-in'))
				document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color)

				setTimeout(() => {
					document.documentElement.style.setProperty('--average-color', color)
				}, fadein)
			}
		}

		const applyLoadedImage = () => {
			imageWrapper?.append(div)

			setTimeout(() => {
				div.style.removeProperty('opacity')
			}, 1)

			if (imageWrapper.childElementCount > 1) {
				setTimeout(() => {
					imageWrapper.firstChild?.remove()
				}, 1300)
			}
		}

		const src = blurred ? image.urls.small : image.urls.full
		const div = document.createElement('div')
		const img = new Image()

		img.addEventListener('load', () => {
			applyLoadedImage()
			applySafariThemeColor(image.color)
		})

		img.src = src
		img.remove()

		div.style.backgroundImage = `url(${src})`
		div.style.opacity = '0'

		if (image.size) {
			div.style.backgroundSize = image.size
		}
		if (image.x) {
			div.style.backgroundPositionX = image.x
		}
		if (image.y) {
			div.style.backgroundPositionY = image.y
		}
	}

	if (video) {
		const opacity = 4 //s
		const duration = 1000 * (video.duration - opacity)
		const src = blurred ? video.urls.small : video.urls.full

		const createVideo = () => {
			const vid = document.createElement('video')
			vid.addEventListener('progress', () => overlay.classList.remove('hidden'))
			vid.src = src
			vid.muted = true
			vid.autoplay = true
			videoWrapper?.prepend(vid)
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
	}
}

function preloadBackground({ image, video }: ApplyBackgroundOptions) {
	const blurred = document.body.className.includes('blurred')
	const img = document.createElement('img')

	if (image) {
		img.addEventListener('load', () => {
			storage.local.remove('backgroundPreloading')
			img.remove()
		})
		img.src = blurred ? image.urls.small : image.urls.full
		storage.local.set({ backgroundPreloading: true })
	}

	if (video) {
		const vid = document.createElement('video')

		vid.addEventListener('progress', _ => {
			setTimeout(() => {
				storage.local.remove('backgroundPreloading')
				vid.remove()
			}, 200)
		})

		vid.src = blurred ? video.urls.small : video.urls.full
		storage.local.set({ backgroundPreloading: true })
	}
}

export function removeBackgrounds(): void {
	const imageWrapper = document.getElementById('image-background-wrapper') as HTMLDivElement
	const videoWrapper = document.getElementById('video-background-wrapper') as HTMLDivElement
	setTimeout(() => imageWrapper.querySelector('div')?.setAttribute('style', 'opacity: 0'))
	setTimeout(() => videoWrapper.querySelector('video')?.setAttribute('style', 'opacity: 0'))
	setTimeout(() => imageWrapper.firstChild?.remove(), 1300)
	setTimeout(() => videoWrapper.firstChild?.remove(), 1300)
}

function applyFilters({ blur, bright, fadein }: Partial<Sync.Backgrounds>) {
	if (blur !== undefined) {
		document.documentElement.style.setProperty('--blur', `${blur}px`)
		document.body.classList.toggle('blurred', blur >= 15)
	}

	if (bright !== undefined) {
		document.documentElement.style.setProperty('--brightness', `${bright}`)
	}

	if (fadein !== undefined) {
		document.documentElement.style.setProperty('--fade-in', `${fadein}ms`)
	}
}

function applyTexture(texture: Sync.Backgrounds['texture']): void {
	const domtexture = document.getElementById('background-texture')

	if (!domtexture) {
		return
	}

	const ranges = TEXTURE_RANGES[texture.type]
	const size = texture.size ?? ranges.size.value
	const opacity = texture.opacity ?? ranges.opacity.value

	domtexture.dataset.texture = texture.type
	document.documentElement.style.setProperty('--texture-opacity', `${opacity}`)
	document.documentElement.style.setProperty('--texture-size', `${size}px`)
}

// 	Settings options

function handleBackgroundOptions(backgrounds: Sync.Backgrounds) {
	const type = backgrounds.type

	document.getElementById('local_options')?.classList.toggle('shown', type === 'files')
	document.getElementById('solid_options')?.classList.toggle('shown', type === 'color')
	document.getElementById('unsplash_options')?.classList.toggle('shown', type === 'images')
	document.getElementById('background-urls-option')?.classList.toggle('shown', type === 'urls')
	document.getElementById('background-freq-option')?.classList.toggle('shown', type !== 'color')
	document.getElementById('background-filters-options')?.classList.toggle('shown', type !== 'color')

	handleTextureOptions(backgrounds)
	handleProviderOptions(backgrounds)
}

function handleTextureOptions(backgrounds: Sync.Backgrounds) {
	const hasTexture = backgrounds.texture.type !== 'none'

	document.getElementById('background-texture-options')?.classList.toggle('shown', hasTexture)

	if (hasTexture) {
		const iOpacity = document.querySelector<HTMLInputElement>('#i_texture-opacity')
		const iSize = document.querySelector<HTMLInputElement>('#i_texture-size')
		const ranges = TEXTURE_RANGES[backgrounds.texture.type]
		const { opacity, size } = backgrounds.texture

		if (iOpacity) {
			iOpacity.min = ranges.opacity.min
			iOpacity.max = ranges.opacity.max
			iOpacity.step = ranges.opacity.step
			iOpacity.value = opacity === undefined ? ranges.opacity.value : opacity.toString()
		}

		if (iSize) {
			iSize.min = ranges.size.min
			iSize.max = ranges.size.max
			iSize.step = ranges.size.step
			iSize.value = size === undefined ? ranges.size.value : size.toString()
		}
	}
}

function handleProviderOptions(backgrounds: Sync.Backgrounds) {
	switch (backgrounds.type) {
		case 'files':
		case 'urls':
		case 'color': {
			document.getElementById('background-provider-option')?.classList.remove('shown')
			return
		}

		default:
	}

	document.getElementById('background-provider-option')?.classList.add('shown')

	const data = backgrounds[backgrounds.type]
	const hasCollections = data.collection.includes('coll')
	const hasTags = data.collection.includes('tags')

	const domusercoll = document.querySelector<HTMLInputElement>('#i_background-user-coll')
	const domusertags = document.querySelector<HTMLInputElement>('#i_background-user-tags')
	const domusercolloption = document.querySelector<HTMLElement>('#background-user-coll-option')
	const domusertagsoption = document.querySelector<HTMLElement>('#background-user-tags-option')
	const optionsExist = domusercoll && domusertags && domusercolloption && domusertagsoption

	if (optionsExist) {
		domusercolloption.classList.toggle('shown', hasCollections)
		domusertagsoption.classList.toggle('shown', hasTags)
		domusercoll.value = backgrounds[backgrounds.type].query ?? ''
		domusertags.value = backgrounds[backgrounds.type].query ?? ''
	}
}

function createProviderSelect(backgrounds: Sync.Backgrounds) {
	const backgroundProvider = document.querySelector<HTMLSelectElement>('#i_background-provider')
	const providersType = backgrounds.type === 'images' ? 'IMAGES' : 'VIDEOS'
	const providersList = PROVIDERS[providersType]

	if (!backgroundProvider) {
		throw new Error('Cannot find #i_background-provider')
	}

	for (const node of Object.values(backgroundProvider.children)) {
		node.remove()
	}

	for (const provider of providersList) {
		const optgroup = document.createElement('optgroup')
		optgroup.label = provider.optgroup
		backgroundProvider?.appendChild(optgroup)

		for (const option of provider.options) {
			const opt = document.createElement('option')
			opt.textContent = option.name
			opt.value = option.value
			optgroup.appendChild(opt)
		}
	}

	switch (backgrounds.type) {
		case 'images':
		case 'videos':
			backgroundProvider.value = backgrounds[backgrounds.type].collection
			break

		default:
	}
}

//  Helpers

function getAverageColor(img: HTMLImageElement) {
	try {
		// Create a canvas element
		const canvas = document.createElement('canvas')
		const ctx = canvas.getContext('2d')

		const maxDimension = 100 // resizing the image for better performance

		// Calculate the scaling factor to maintain aspect ratio
		const scale = Math.min(maxDimension / img.width, maxDimension / img.height)

		// Set canvas dimensions to the scaled image dimensions
		canvas.width = img.width * scale
		canvas.height = img.height * scale

		// Draw the image onto the canvas
		ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)

		// Get the image data from the canvas
		const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height)
		const data = imageData?.data

		let r = 0
		let g = 0
		let b = 0
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
	} catch (_error) {}
}

function isBackgroundType(str = ''): str is Sync.Storage['backgrounds']['type'] {
	return ['files', 'urls', 'images', 'videos', 'color'].includes(str)
}
function isBackgroundTexture(str = ''): str is Sync.Storage['backgrounds']['texture']['type'] {
	return ['none', 'grain', 'dots', 'topographic'].includes(str)
}
function isFrequency(str = ''): str is Frequency {
	return ['tabs', 'hour', 'day', 'period', 'pause'].includes(str)
}

function isVideo(item: Backgrounds.Video | Backgrounds.Image): item is Backgrounds.Video {
	return item.format === 'video'
}
function isImage(item: Backgrounds.Video | Backgrounds.Image): item is Backgrounds.Image {
	return item.format === 'image'
}
function areOnlyImages(list: Backgrounds.Item[]): list is Backgrounds.Image[] {
	return list?.every(item => item.format === 'image')
}
function areOnlyVideos(list: Backgrounds.Item[]): list is Backgrounds.Video[] {
	return list?.every(item => item.format === 'video')
}
