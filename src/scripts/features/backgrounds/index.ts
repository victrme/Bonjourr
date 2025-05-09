import { addLocalBackgrounds, getFilesAsCollection, initFilesSettingsOptions } from './local.ts'
import { initCreditEvents, toggleCredits, updateCredits } from './credits.ts'
import { applyUrls, getUrlsAsCollection, initUrlsEditor } from './urls.ts'
import { TEXTURE_RANGES } from './textures.ts'
import { PROVIDERS } from './providers.ts'

import { daylightPeriod, needsChange, userDate } from '../../shared/time.ts'
import { turnRefreshButton } from '../../shared/dom.ts'
import { rgbToHex } from '../../shared/generic.ts'
import { debounce } from '../../utils/debounce.ts'
import { BROWSER } from '../../defaults.ts'
import { storage } from '../../storage.ts'

import type { Background, BackgroundImage, BackgroundVideo, Frequency } from '../../../types/shared.ts'
import type { Backgrounds, Sync } from '../../../types/sync.ts'
import type { Local } from '../../../types/local.ts'
import { networkForm } from '../../shared/form.ts'

interface BackgroundUpdate {
	freq?: string
	type?: string
	blur?: string
	blurfocus?: true
	color?: string
	query?: SubmitEvent
	files?: FileList | null
	compress?: boolean
	bright?: string
	fadein?: string
	refresh?: Element
	urlsapply?: true
	texture?: string
	provider?: string
	texturesize?: string
	textureopacity?: string
}

interface ApplyOptions {
	action?: 'startup' | 'settings-open' | 'remove-blur'
}

const propertiesUpdateDebounce = debounce(filtersUpdate, 600)
const colorUpdateDebounce = debounce(solidUpdate, 600)
const fadeinPreviewDebounce = debounce(previewFadein, 200)
let fadeinTimeout = 0

const formBackgroundUserColl = networkForm('f_background-user-coll')
const formBackgroundUserSearch = networkForm('f_background-user-search')

export function backgroundsInit(sync: Sync, local: Local, init?: true): void {
	if (init) {
		// Rush background opacity to reduce black frames
		const type = sync.backgrounds.type
		const isColor = type === 'color'
		const noFadeIn = sync.backgrounds.fadein === 0
		const wrapper = document.getElementById('background-wrapper')

		if (isColor || noFadeIn) {
			wrapper?.classList.remove('hidden')
		}

		// <!> To clean up
		const pauseButton = document.getElementById('b_interface-background-pause')
		const isPaused = sync.backgrounds.frequency === 'pause'
		pauseButton?.classList.toggle('paused', isPaused)

		initCreditEvents()
	}

	toggleCredits(sync.backgrounds)
	applyFilters(sync.backgrounds)
	applyTexture(sync.backgrounds.texture)
	handleBackgroundActions(sync.backgrounds)
	document.getElementById('background-wrapper')?.setAttribute('data-type', sync.backgrounds.type)

	if (sync.backgrounds.type === 'color') {
		applyBackground(sync.backgrounds.color)
	} else {
		backgroundCacheControl(sync.backgrounds, local)
	}
}

// 	Storage update

export async function backgroundUpdate(update: BackgroundUpdate): Promise<void> {
	const data = await storage.sync.get('backgrounds')
	const local = await storage.local.get()

	if (update.blurfocus) {
		fullResolutionOnBlurFocus()
		return
	}

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
		fadeinPreviewDebounce(Number.parseFloat(update.fadein))
		return
	}

	if (isBackgroundType(update.type)) {
		data.backgrounds.type = update.type
		storage.sync.set({ backgrounds: data.backgrounds })
		createProviderSelect(data.backgrounds)
		handleBackgroundOptions(data.backgrounds)
		backgroundsInit(data, local)
	}

	if (isFrequency(update.freq)) {
		data.backgrounds.frequency = update.freq

		if (update.freq === 'pause') {
			const type = data.backgrounds.type

			if (type === 'images') {
				const collection = getCollection(data.backgrounds, local).images()
				data.backgrounds.pausedImage = collection[0]
			}
			if (type === 'videos') {
				const collection = getCollection(data.backgrounds, local).videos()
				data.backgrounds.pausedVideo = collection[0]
			}
			if (type === 'urls') {
				const [_, list] = getUrlsAsCollection(local)
				data.backgrounds.pausedUrl = list[0].urls.full
			}
		}

		storage.sync.set({ backgrounds: data.backgrounds })
		handleBackgroundOptions(data.backgrounds)
	}

	if (update.refresh) {
		local.backgroundLastChange = new Date(0).toString()
		backgroundsInit(data, local)
		turnRefreshButton(update.refresh, true)
	}

	if (update.color) {
		applyBackground(update.color)
		colorUpdateDebounce(update.color)
	}

	if (update.urlsapply) {
		applyUrls(data.backgrounds)
	}

	if (update.files) {
		addLocalBackgrounds(update.files, local)
	}

	if (update.compress !== undefined) {
		local.backgroundCompressFiles = update.compress
		storage.local.set({ backgroundCompressFiles: update.compress })

		const [_ids, files] = await getFilesAsCollection(local)
		const image = files[0]
		applyBackground(image)
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
		data.backgrounds[data.backgrounds.type] = update.provider
		storage.sync.set({ backgrounds: data.backgrounds })
		handleBackgroundOptions(data.backgrounds)

		const isNotEmpty = local.backgroundCollections[update.provider]?.length > 0
		const isDefault = update.provider.includes('bonjourr')

		if (isNotEmpty || isDefault) {
			backgroundCacheControl(data.backgrounds, local)
		}
	}

	if (update.query !== undefined) {
		const collectionName = data.backgrounds[data.backgrounds.type]
		const target = update.query.target as HTMLElement
		const input = target.querySelector<HTMLInputElement>('input')
		let query = input?.value ?? ''

		// 0. extract unsplash collection from URL

		const isCorrectCollection = collectionName === 'unsplash-images-collections'
		const startsWithUrl = query.startsWith('https://unsplash.com/collections/')
		if (isCorrectCollection && startsWithUrl) {
			query = query.replace('https://unsplash.com/collections/', '').slice(0, query.indexOf('/'))
		}

		// 1. Save query

		local.backgroundCollections[collectionName] = []
		data.backgrounds.queries[collectionName] = query
		storage.sync.set({ backgrounds: data.backgrounds })

		// 2. Handle empty query

		if (query === '') {
			storage.local.set({ backgroundCollections: local.backgroundCollections })

			formBackgroundUserColl.accept('')
			formBackgroundUserSearch.accept('')
			removeBackgrounds()

			return
		}

		formBackgroundUserColl.load()
		formBackgroundUserSearch.load()

		handleBackgroundOptions(data.backgrounds)
		await backgroundCacheControl(data.backgrounds, local)

		formBackgroundUserColl.accept(collectionName)
		formBackgroundUserSearch.accept(collectionName)
	}
}

export async function filtersUpdate({ blur, bright, fadein, texture }: Partial<Backgrounds>) {
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

function previewFadein(ms: number) {
	const wrapper = document.getElementById('background-wrapper')
	const setOpacity = (val: number) => wrapper?.setAttribute('style', `opacity: ${val}`)

	clearTimeout(fadeinTimeout)
	fadeinTimeout = setTimeout(() => setOpacity(1), ms)
	setOpacity(0)
}

async function fullResolutionOnBlurFocus() {
	const [current, next] = await getCurrentBackgrounds()

	preloadBackground(current, { action: 'remove-blur' }).then(() => {
		applyBackground(current, { action: 'remove-blur' })
		preloadBackground(next, { action: 'remove-blur' })
	})
}

//	Cache & network

async function backgroundCacheControl(backgrounds: Backgrounds, local: Local): Promise<void> {
	if (backgrounds.type === 'color') {
		return
	}

	const isImagesOrVideos = backgrounds.type === 'images' || backgrounds.type === 'videos'
	const isFilesOrUrls = backgrounds.type === 'files' || backgrounds.type === 'urls'

	// 1. Find correct list to use

	let list: BackgroundVideo[] | BackgroundImage[] = []
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
			const newcoll = getCollection(backgrounds, newlocal)
			const isImage = backgrounds.type === 'images'
			newlocal.backgroundLastChange = userDate().toString()
			storage.local.set(newlocal)

			list = isImage ? newcoll.images() : newcoll.videos()

			preloadBackground(list[1])
		}
	}

	if (isImagesOrVideos && local.backgroundPreloading) {
		applyBackground(list[0])
		preloadBackground(list[1])
		return
	}

	if (isImagesOrVideos && !needNew && isPaused) {
		if (backgrounds.pausedImage) {
			applyBackground(backgrounds.pausedImage)
			return
		}
		if (backgrounds.pausedVideo) {
			applyBackground(backgrounds.pausedVideo)
			return
		}
		if (backgrounds.pausedUrl) {
			const url = backgrounds.pausedUrl
			const urls = { full: url, medium: url, small: url }
			applyBackground({ format: 'image', urls: urls })
		}
	}

	if (!needNew) {
		applyBackground(list[0])
		return
	}

	if (list.length > 1) {
		list.shift()
	}

	if (isImagesOrVideos && backgrounds.frequency === 'pause') {
		if (backgrounds.type === 'images') {
			backgrounds.pausedImage = list[0] as BackgroundImage
		}
		if (backgrounds.type === 'videos') {
			backgrounds.pausedVideo = list[0] as BackgroundVideo
		}
		if (backgrounds.type === 'videos') {
			backgrounds.pausedUrl = list[0].urls.full
		}
		storage.sync.set({ backgrounds })
	}

	if (list.length > 1) {
		let newlocal = local

		preloadBackground(list[1])

		if (isImagesOrVideos) {
			newlocal = setCollection(backgrounds, local).fromList(list)
		}
		if (isFilesOrUrls) {
			newlocal = setLastUsed(backgrounds, local, keys)
		}

		newlocal.backgroundLastChange = userDate().toString()
		storage.local.set(newlocal)
	}

	// 3. Apply image and get a new set of images if needed

	applyBackground(list[0])

	if (isImagesOrVideos && list.length === 1 && navigator.onLine) {
		const json = await fetchNewBackgrounds(backgrounds)

		if (json) {
			const newlocal = setCollection(backgrounds, local).fromApi(json)
			const newcoll = getCollection(backgrounds, newlocal)
			const newlist = backgrounds.type === 'images' ? newcoll.images() : newcoll.videos()

			preloadBackground(newlist[0])
			preloadBackground(newlist[1])

			storage.local.set(newlocal)
		}
	}
}

async function fetchNewBackgrounds(backgrounds: Backgrounds): Promise<Record<string, Background[]>> {
	switch (backgrounds.type) {
		case 'files':
		case 'urls':
		case 'color': {
			throw new Error('Can only fetch with "images" or "videos" type')
		}

		default:
	}

	const collectionName = backgrounds[backgrounds.type]
	const [provider, type, category] = collectionName.split('-')

	const base = 'https://services.bonjourr.fr/backgrounds'
	const path = `/${provider}/${type}/${category}`

	const density = Math.max(2, globalThis.devicePixelRatio)
	const ratio = globalThis.screen.width / globalThis.screen.height
	let height = globalThis.screen.height * density
	let width = globalThis.screen.width * density

	if (ratio >= 2) {
		width = height * 2
	}
	if (ratio <= 0.5) {
		height = width * 2
	}

	const screen = `?h=${height}&w=${width}`
	const query = backgrounds.queries[collectionName] ?? ''
	const search = query ? `&query=${query}` : ''

	const url = base + path + screen + search
	const resp = await fetch(url)
	const json = await resp.json()

	const areImages = type === 'images' && Object.keys(json)?.every((key) => key.includes('images'))
	const areVideos = type === 'videos' && Object.keys(json)?.every((key) => key.includes('videos'))

	if (areImages || areVideos) {
		return json
	}

	throw new Error('Received JSON is bad')
}

function findCollectionName(backgrounds: Backgrounds): string {
	switch (backgrounds.type) {
		case 'files':
		case 'urls':
		case 'color': {
			throw new Error('Only collection names with "images" or "videos" type')
		}

		default:
	}

	const collectionName = backgrounds[backgrounds.type]
	const isDaylight = collectionName.includes('daylight')

	if (isDaylight) {
		const period = daylightPeriod(userDate().getTime())
		return `${collectionName}-${period}`
	}

	return collectionName
}

function getCollection(backgrounds: Backgrounds, local: Local) {
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

function setCollection(backgrounds: Backgrounds, local: Local) {
	switch (backgrounds.type) {
		case 'files':
		case 'urls':
		case 'color': {
			throw new Error('Cannot update with this type')
		}

		default:
	}

	function fromApi(json: Record<string, Background[]>): Local {
		for (const [key, list] of Object.entries(json)) {
			local.backgroundCollections[key] = list
		}

		return local
	}

	function fromList(list: Background[]): Local {
		const collectionName = findCollectionName(backgrounds)
		local.backgroundCollections[collectionName] = list

		return local
	}

	return { fromList, fromApi }
}

function setLastUsed(backgrounds: Backgrounds, local: Local, keys: string[]): Local {
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

export function applyBackground(media: string | Background, options?: ApplyOptions): void {
	if (typeof media === 'string') {
		document.documentElement.style.setProperty('--solid-background', media)
		return
	}

	const mediaWrapper = document.getElementById('background-media') as HTMLDivElement
	const size = detectBackgroundSize(options?.action)
	let item: HTMLDivElement

	if (media.format === 'image') {
		const src = media.urls[size]
		item = createImageItem(src, media)
	} else {
		const opacity = 4 //s
		const duration = 1000 * (media.duration - opacity)
		const src = media.urls[size]
		item = createVideoItem(src, duration)
	}

	item.dataset.res = size
	mediaWrapper.prepend(item)

	if (mediaWrapper?.childElementCount > 1) {
		const children = Object.values(mediaWrapper?.children)
		const notHiding = children.filter((child) => !child.className.includes('hiding'))
		const lastVisible = notHiding.at(-1)

		lastVisible?.classList.add('hiding')
		setTimeout(() => mediaWrapper?.lastElementChild?.remove(), 1200)
	}
}

function createImageItem(src: string, media: BackgroundImage): HTMLDivElement {
	const backgroundsWrapper = document.getElementById('background-wrapper')
	const div = document.createElement('div')
	const img = new Image()

	img.addEventListener('load', () => {
		backgroundsWrapper?.classList.remove('hidden')
		applySafariThemeColor(media, img)
		updateCredits(media)
	})

	img.src = src
	img.remove()

	div.style.backgroundImage = `url(${src})`

	if (media.size) {
		div.style.backgroundSize = media.size
	}
	if (media.x) {
		div.style.backgroundPositionX = media.x
	}
	if (media.y) {
		div.style.backgroundPositionY = media.y
	}

	return div
}

function createVideoItem(src: string, duration: number): HTMLDivElement {
	const backgroundsWrapper = document.getElementById('background-wrapper')
	const div = document.createElement('div')
	let videoInterval = 0

	const prependVideo = () => {
		return new Promise((resolve) => {
			const vid = document.createElement('video')

			vid.addEventListener('progress', () => {
				backgroundsWrapper?.classList.remove('hidden')
				resolve(true)
			})

			vid.src = src
			vid.muted = true
			vid.autoplay = true
			div.prepend(vid)
		})
	}

	const removeVideo = () => {
		div?.lastElementChild?.classList.add('hiding')
		setTimeout(() => div?.lastElementChild?.remove(), 4000)
	}

	const loopVideo = async () => {
		if (div) {
			await prependVideo()
			removeVideo()
			return
		}

		clearInterval(videoInterval)
	}

	prependVideo().then(() => {
		videoInterval = setInterval(loopVideo, duration)
	})

	return div
}

function preloadBackground(media: Background, options?: ApplyOptions): Promise<true> {
	const size = detectBackgroundSize(options?.action)

	if (media.format === 'image') {
		const img = document.createElement('img')
		const src = media.urls[size]

		return new Promise((resolve) => {
			img.addEventListener('load', () => {
				storage.local.remove('backgroundPreloading')
				img.remove()
				resolve(true)
			})

			img.src = src
			storage.local.set({ backgroundPreloading: true })
		})
	}

	const vid = document.createElement('video')
	const src = media.urls[size]

	return new Promise((resolve) => {
		vid.addEventListener('progress', (_) => {
			setTimeout(() => {
				storage.local.remove('backgroundPreloading')
				vid.remove()
				resolve(true)
			}, 200)
		})

		vid.src = src
		storage.local.set({ backgroundPreloading: true })
	})
}

export function removeBackgrounds(): void {
	const mediaWrapper = document.getElementById('background-media') as HTMLDivElement
	setTimeout(() => document.querySelector('#background-media div')?.classList.add('hiding'))
	setTimeout(() => mediaWrapper.firstChild?.remove(), 2000)
}

function applyFilters({ blur, bright, fadein }: Partial<Backgrounds>) {
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

function applyTexture(texture: Backgrounds['texture']): void {
	const wrapper = document.getElementById('background-wrapper')
	const domtexture = document.getElementById('background-texture')

	if (!(domtexture && wrapper)) {
		return
	}

	const ranges = TEXTURE_RANGES[texture.type]
	const size = texture.size ?? ranges.size.value
	const opacity = texture.opacity ?? ranges.opacity.value

	wrapper.dataset.texture = texture.type
	document.documentElement.style.setProperty('--texture-opacity', `${opacity}`)
	document.documentElement.style.setProperty('--texture-size', `${size}px`)
}

// 	Settings options

export function initBackgroundOptions(sync: Sync, local: Local) {
	changeBackgroundResolution(sync, local)
	initFilesSettingsOptions(local)
	initUrlsEditor(sync.backgrounds, local)
	createProviderSelect(sync.backgrounds)
	handleBackgroundOptions(sync.backgrounds)
}

function handleBackgroundOptions(backgrounds: Backgrounds) {
	const type = backgrounds.type

	document.getElementById('local_options')?.classList.toggle('shown', type === 'files')
	document.getElementById('solid_options')?.classList.toggle('shown', type === 'color')
	document.getElementById('unsplash_options')?.classList.toggle('shown', type === 'images')
	document.getElementById('background-urls-option')?.classList.toggle('shown', type === 'urls')
	document.getElementById('background-freq-option')?.classList.toggle('shown', type !== 'color')
	document.getElementById('background-filters-options')?.classList.toggle('shown', type !== 'color')

	handleTextureOptions(backgrounds)
	handleProviderOptions(backgrounds)
	handleBackgroundActions(backgrounds)
}

function handleTextureOptions(backgrounds: Backgrounds) {
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

function handleProviderOptions(backgrounds: Backgrounds) {
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

	const collectionName = backgrounds[backgrounds.type]
	const hasCollections = collectionName.includes('coll')
	const hasSearch = collectionName.includes('search')

	const domusercoll = document.querySelector<HTMLInputElement>('#i_background-user-coll')
	const domusersearch = document.querySelector<HTMLInputElement>('#i_background-user-search')
	const domusercolloption = document.querySelector<HTMLElement>('#background-user-coll-option')
	const domusersearchoption = document.querySelector<HTMLElement>('#background-user-search-option')
	const optionsExist = domusercoll && domusersearch && domusercolloption && domusersearchoption

	if (optionsExist) {
		domusercolloption.classList.toggle('shown', hasCollections)
		domusersearchoption.classList.toggle('shown', hasSearch)
		domusercoll.value = backgrounds.queries[collectionName] ?? ''
		domusersearch.value = backgrounds.queries[collectionName] ?? ''
	}
}

function createProviderSelect(backgrounds: Backgrounds) {
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
		case 'videos': {
			const collectionName = backgrounds[backgrounds.type]
			backgroundProvider.value = collectionName
			break
		}

		default:
	}
}

async function changeBackgroundResolution(sync: Sync, local: Local) {
	const currentBackground = document.querySelector<HTMLElement>('#background-media div')
	const currentNotFull = currentBackground?.dataset.res !== 'full'

	if (currentNotFull) {
		if (sync.backgrounds.type === 'images') {
			const collection = getCollection(sync.backgrounds, local)
			const [current] = collection.images()

			preloadBackground(current, { action: 'settings-open' }).then(() => {
				applyBackground(current, { action: 'settings-open' })
			})
		}

		if (sync.backgrounds.type === 'videos') {
			const collection = getCollection(sync.backgrounds, local)
			const [current] = collection.videos()

			preloadBackground(current, { action: 'settings-open' }).then(() => {
				applyBackground(current, { action: 'settings-open' })
			})
		}

		if (sync.backgrounds.type === 'files') {
			const collection = await getFilesAsCollection(local)
			const image = collection[1][0]
			applyBackground(image, { action: 'settings-open' })
		}
	}
}

function handleBackgroundActions(backgrounds: Backgrounds) {
	const type = backgrounds.type
	const freq = backgrounds.frequency
	document.getElementById('background-actions')?.classList.toggle('shown', type !== 'color')
	document.getElementById('b_interface-background-pause')?.classList.toggle('paused', freq === 'pause')
	document.getElementById('b_interface-background-download')?.classList.toggle('shown', type === 'images')
}

//  Helpers

async function getCurrentBackgrounds(sync?: Sync, local?: Local): Promise<[Background, Background]> {
	sync ??= await storage.sync.get('backgrounds')
	local ??= await storage.local.get()

	const isImage = sync.backgrounds.type === 'images'
	const lists = getCollection(sync.backgrounds, local)
	const list = isImage ? lists.images() : lists.videos()

	return [list[0], list[1]]
}

function detectBackgroundSize(action: ApplyOptions['action']): 'full' | 'medium' | 'small' {
	action ??= 'startup'

	const blurred = document.body.className.includes('blurred')
	const blurredStartup = blurred && action === 'startup'
	const crispStartup = !blurred && action === 'startup'
	const settingsOpen = action === 'settings-open'
	const removeBlur = action === 'remove-blur'

	let size: 'small' | 'medium' | 'full' = 'small'
	if (blurredStartup) size = 'small'
	if (crispStartup) size = 'full'
	if (settingsOpen) size = 'medium'
	if (removeBlur) size = 'full'

	return size
}

function applySafariThemeColor(image: BackgroundImage, img: HTMLImageElement) {
	let color = image.color

	if (BROWSER === 'safari' && !color) {
		color = getAverageColor(img)
	}

	if (BROWSER === 'safari' && color) {
		const fadein = Number.parseInt(document.documentElement.style.getPropertyValue('--fade-in'))
		document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color)

		setTimeout(() => {
			document.documentElement.style.setProperty('--average-color', color)
		}, fadein)
	}
}

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
	} catch (_error) {
		//...
	}
}

function isBackgroundType(str = ''): str is Sync['backgrounds']['type'] {
	return ['files', 'urls', 'images', 'videos', 'color'].includes(str)
}
function isBackgroundTexture(str = ''): str is Sync['backgrounds']['texture']['type'] {
	return ['none', 'grain', 'dots', 'topographic'].includes(str)
}
function isFrequency(str = ''): str is Frequency {
	return ['tabs', 'hour', 'day', 'period', 'pause'].includes(str)
}

function _isVideo(item: BackgroundVideo | BackgroundImage): item is BackgroundVideo {
	return item.format === 'video'
}
function _isImage(item: BackgroundVideo | BackgroundImage): item is BackgroundImage {
	return item.format === 'image'
}
function areOnlyImages(list: Background[]): list is BackgroundImage[] {
	return list?.every((item) => item.format === 'image')
}
function areOnlyVideos(list: Background[]): list is BackgroundVideo[] {
	return list?.every((item) => item.format === 'video')
}
