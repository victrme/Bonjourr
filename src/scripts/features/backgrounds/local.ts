import { applyBackground, removeBackgrounds } from './index.ts'
import { IS_MOBILE, PLATFORM } from '../../defaults.ts'
import { compressMedia } from '../../shared/compress.ts'
import { needsChange } from '../../shared/time.ts'
import { onclickdown } from 'clickdown/mod'
import { IDBCache } from '../../dependencies/idbcache.ts'
import { hashcode } from '../../utils/hash.ts'
import { storage } from '../../storage.ts'

import type { Background, BackgroundImage, BackgroundVideo } from '../../../types/shared.ts'
import type { BackgroundFile, Local } from '../../../types/local.ts'
import type { Backgrounds } from '../../../types/sync.ts'

type LocalFileData = {
	raw: File
	full: Blob
	medium: Blob
	small: Blob
}

let thumbnailVisibilityObserver: IntersectionObserver
let thumbnailSelectionObserver: MutationObserver

async function getLoadedVideo(file: File): Promise<HTMLVideoElement> {
	const video = document.createElement('video')

	const url = URL.createObjectURL(file)
	video.src = url

	video.load()

	await new Promise((r) => {
		video.addEventListener('loadeddata', () => r(true))
	})

	// URL.revokeObjectURL(url)

	return video
}

async function createThumbnailFromVideo(file: File): Promise<Blob | null> {
	const video = await getLoadedVideo(file)
	const canvas = document.createElement('canvas')
	const ctx = canvas.getContext('2d')

	document.body.append(video)

	video.play()
	video.pause()

	const blob = await new Promise<Blob>((res, rej) => {
		const callback: BlobCallback = (blob) => blob ? res(blob) : rej(true)

		setTimeout(() => {
			if (ctx) {
				ctx?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight)
				ctx.canvas.toBlob(callback, 'image/jpeg', 0.75)
			} else {
				rej(true)
			}
		}, 100)
	})

	return blob
}

export async function localFilesCacheControl(backgrounds: Backgrounds, local: Local, needNew?: boolean) {
	local = await sanitizeMetadatas(local)

	const ids = lastUsedBackgroundFiles(local.backgroundFiles)

	if (ids.length === 0) {
		removeBackgrounds()
		return
	}

	const freq = backgrounds.frequency
	const metadata = local.backgroundFiles[ids[0]]
	const lastUsed = new Date(metadata.lastUsed).getTime()

	needNew ??= needsChange(freq, lastUsed)

	if (ids.length > 1 && needNew) {
		ids.shift()

		const rand = Math.floor(Math.random() * ids.length)
		const id = ids[rand]

		applyBackground(await mediaFromBackgroundFiles(id, local))
		local.backgroundFiles[id].lastUsed = new Date().toString()
		storage.local.set(local)
	} else {
		applyBackground(await mediaFromBackgroundFiles(ids[0], local))
	}
}

// Update

export async function addLocalBackgrounds(filelist: FileList | File[], local: Local) {
	try {
		const thumbnailsContainer = document.getElementById('thumbnails-container')
		const filesData: Record<string, LocalFileData> = {}
		const newids: string[] = []

		if (filelist.length === 0) {
			return
		}

		// 1. Add empty thumbnails

		for (const file of filelist) {
			const infosString = file.size.toString() + file.name + file.lastModified.toString()
			const hashString = hashcode(infosString).toString()

			if (Object.keys(local.backgroundFiles).includes(hashString)) {
				continue
			}

			newids.push(hashString)

			const thumbnail = createThumbnail(hashString)
			thumbnailsContainer?.appendChild(thumbnail)
		}

		if (thumbnailsContainer) {
			const idsAmount = Object.keys(local.backgroundFiles).length + newids.length
			const columnsAmount = Math.min(idsAmount, 5).toString()
			thumbnailsContainer.style.setProperty('--thumbnails-columns', columnsAmount)
		}

		// 2. Compress files for background & thumbnail use

		for (let i = 0; i < newids.length; i++) {
			const file = filelist[i]
			const id = newids[i]

			// 2a. This finds a reasonable resolution for compression

			const isLandscape = globalThis.screen.orientation.type === 'landscape-primary'
			const long = isLandscape ? globalThis.screen.width : globalThis.screen.height
			const short = isLandscape ? globalThis.screen.height : globalThis.screen.width
			const density = Math.min(2, globalThis.devicePixelRatio)
			const ratio = Math.min(1.8, long / short)
			const averagePixelHeight = short * ratio * density

			let raw: File
			let full: Blob
			let medium: Blob
			let small: Blob

			if (file.type === 'image/gif') {
				raw = file
				full = file
				medium = file
				small = await compressMedia(file, { size: 360, q: 0.4 })
			} //
			else if (file.type.includes('image/')) {
				raw = file
				full = await compressMedia(file, { size: averagePixelHeight, q: 0.8 })
				medium = await compressMedia(full, { size: averagePixelHeight / 3, q: 0.6 })
				small = await compressMedia(medium, { size: 360, q: 0.4 })
			} else {
				const thumb = await createThumbnailFromVideo(file)
				raw = file
				full = file
				medium = file
				small = thumb!

				console.log(thumb)
			}

			// const exif = await getExif(file)

			local.backgroundFiles[id] = {
				lastUsed: new Date().toString(),
				position: {
					size: 'cover',
					x: '50%',
					y: '50%',
				},
			}

			filesData[id] = { raw, full, medium, small }

			saveFileToCache(id, filesData[id])
			addThumbnailImage(id, local, filesData[id])
			storage.local.set({ backgroundFiles: local.backgroundFiles })
		}

		// 3. Apply background

		if (newids.length > 0) {
			const id = newids[0]
			const media = await mediaFromBackgroundFiles(id, local, filesData[id])

			unselectAll()
			applyBackground(media)
			handleFilesSettingsOptions(local)
		}

		// 4. Allow same file to be uploaded

		const uploadInput = document.querySelector<HTMLInputElement>('#i_background-upload')

		if (uploadInput) {
			uploadInput.value = ''
		}
	} catch (e) {
		console.info(e)
		return
	}
}

async function removeLocalBackgrounds() {
	try {
		const local = await storage.local.get()
		const selectedIds = getSelection()

		if (selectedIds.length === 0 || !local.backgroundFiles) {
			return
		}

		for (const id of selectedIds) {
			removeFilesFromCache([id])
			delete local.backgroundFiles[id]

			const thumbnail = document.querySelector<HTMLElement>(`#${id}`)
			thumbnail?.classList.toggle('hiding', true)
			setTimeout(() => {
				thumbnail?.remove()
				toggleLocalFileButtons()
			}, 100)
		}

		const filesIds = lastUsedBackgroundFiles(local.backgroundFiles)

		if (filesIds.length > 0) {
			applyBackground(await mediaFromBackgroundFiles(filesIds[0], local))
		} else {
			removeBackgrounds()
		}

		handleFilesSettingsOptions(local)

		storage.local.remove('backgroundFiles')
		storage.local.set({ backgroundFiles: local.backgroundFiles })
	} catch (err) {
		console.info(err)
		return
	}
}

async function updateBackgroundPosition(type: 'size' | 'vertical' | 'horizontal', value: string) {
	const img = document.querySelector<HTMLElement>('#background-media div')
	const selection = getSelection()[0]
	const local = await storage.local.get('backgroundFiles')
	const file = local.backgroundFiles[selection]

	if (!(img && file)) {
		return
	}

	if (type === 'size') {
		file.position.size = value === '100' ? 'cover' : `${value}%`
		img.style.backgroundSize = file.position.size
	}

	if (type === 'vertical') {
		file.position.y = `${value}%`
		img.style.backgroundPositionY = file.position.y
	}

	if (type === 'horizontal') {
		file.position.x = `${value}%`
		img.style.backgroundPositionX = file.position.x
	}

	local.backgroundFiles[selection] = file
	storage.local.set({ backgroundFiles: local.backgroundFiles })
}

//	Settings options

export function initFilesSettingsOptions(local: Local) {
	thumbnailSelectionObserver = new MutationObserver(toggleLocalFileButtons)
	thumbnailVisibilityObserver = new IntersectionObserver(intersectionEvent)

	if (IS_MOBILE) {
		const container = document.getElementById('thumbnails-container')
		container?.style.setProperty('--thumbnails-columns', '2')
	}

	sanitizeMetadatas(local).then((newlocal) => {
		handleFilesSettingsOptions(newlocal)
	})

	onclickdown(document.getElementById('b_thumbnail-remove'), removeLocalBackgrounds)
	onclickdown(document.getElementById('b_thumbnail-position'), () => handlePositionOption())
	document.getElementById('b_thumbnail-zoom')?.addEventListener('click', handleGridView)
	document.getElementById('i_background-size')?.addEventListener('input', handleFilePosition)
	document.getElementById('i_background-vertical')?.addEventListener('input', handleFilePosition)
	document.getElementById('i_background-horizontal')?.addEventListener('input', handleFilePosition)
}

function handleFilesSettingsOptions(local: Local) {
	const backgroundFiles = local.backgroundFiles

	const thumbnailsContainer = document.getElementById('thumbnails-container')

	const thumbs = document.querySelectorAll<HTMLElement>('.thumbnail')
	const thumbIds = Object.values(thumbs).map((el) => el.id)
	const fileIds = Object.keys(backgroundFiles) ?? []
	const lastUsed = lastUsedBackgroundFiles(local.backgroundFiles)
	const missingThumbnails = fileIds.filter((id) => !thumbIds.includes(id))

	if (missingThumbnails.length > 0) {
		for (const id of missingThumbnails) {
			const thumbnail = createThumbnail(id)
			thumbnailsContainer?.appendChild(thumbnail)
			thumbnailVisibilityObserver?.observe(thumbnail)
			thumbnailSelectionObserver?.observe(thumbnail, { attributes: true })

			if (id === lastUsed[0]) {
				thumbnail.classList.add('selected')
			}
		}
	}

	toggleLocalFileButtons()
}

function handleFilesMoveOptions(file: BackgroundFile) {
	const backgroundSize = document.querySelector<HTMLInputElement>('#i_background-size')
	const backgroundVertical = document.querySelector<HTMLInputElement>('#i_background-vertical')
	const backgroundHorizontal = document.querySelector<HTMLInputElement>('#i_background-horizontal')
	const rangesExist = backgroundSize && backgroundVertical && backgroundHorizontal

	if (rangesExist) {
		backgroundSize.value = (file.position.size === 'cover' ? '100' : file.position.size).replace('%', '')
		backgroundVertical.value = file.position.y.replace('%', '')
		backgroundHorizontal.value = file.position.x.replace('%', '')
	}
}

function handlePositionOption(force?: boolean) {
	const domoptions = document.getElementById('background-position-options')

	if (domoptions) {
		domoptions.classList.toggle('shown', force)
	}
}

function handleGridView() {
	const container = document.getElementById('thumbnails-container')

	if (container) {
		const currentZoom = globalThis.getComputedStyle(container).getPropertyValue('--thumbnails-columns')
		const newZoom = Math.max((Number.parseInt(currentZoom) + 1) % 6, 1)
		container.style.setProperty('--thumbnails-columns', newZoom.toString())
	}
}

function handleFilePosition(this: HTMLInputElement) {
	const { id, value } = this

	if (id === 'i_background-size') {
		updateBackgroundPosition('size', value)
	}
	if (id === 'i_background-vertical') {
		updateBackgroundPosition('vertical', value)
	}
	if (id === 'i_background-horizontal') {
		updateBackgroundPosition('horizontal', value)
	}
}

function intersectionEvent(entries: IntersectionObserverEntry[]) {
	for (const { target, isIntersecting } of entries) {
		const id = target.id ?? ''

		if (isIntersecting && target.classList.contains('loading')) {
			getFileFromCache(id).then((data) => {
				storage.local.get('backgroundFiles').then((local) => {
					if (data) {
						addThumbnailImage(id, local, data)
						thumbnailVisibilityObserver.unobserve(target)
					}
				})
			})
		}
	}
}

function toggleLocalFileButtons(_?: MutationRecord[]) {
	const thmbRemove = document.getElementById('b_thumbnail-remove')
	const thmbMove = document.getElementById('b_thumbnail-position')
	const selected = document.querySelectorAll('.thumbnail.selected').length
	const domoptions = document.getElementById('background-position-options')

	selected === 0 ? thmbRemove?.setAttribute('disabled', '') : thmbRemove?.removeAttribute('disabled')
	selected !== 1 ? thmbMove?.setAttribute('disabled', '') : thmbMove?.removeAttribute('disabled')

	// hides move options when no selection or more than one
	if (selected === 0 || selected > 1) {
		handlePositionOption(false)
	}

	if (selected === 1 && domoptions?.classList.contains('shown')) {
		domoptions?.classList.remove('shown')
	}
}

// Thumbnails

function createThumbnail(id: string): HTMLButtonElement {
	const thb = document.createElement('button')
	const thbimg = document.createElement('img')

	thb.id = id
	thbimg.src = 'src/assets/interface/loading.svg'
	thb.className = 'thumbnail loading'
	thbimg.setAttribute('alt', '')
	thbimg.setAttribute('draggable', 'false')
	thb.setAttribute('aria-label', 'Select this background')

	thb.appendChild(thbimg)
	thb.addEventListener('click', handleThumbnailClick)

	return thb
}

function addThumbnailImage(id: string, local: Local, data: LocalFileData): void {
	const btn = document.querySelector<HTMLButtonElement>(`#${id}`)
	const img = document.querySelector<HTMLImageElement>(`#${id} img`)

	if (!(img && btn)) {
		console.warn('?')
		return
	}

	img.addEventListener('load', () => {
		btn.classList.replace('loading', 'loaded')
		setTimeout(() => btn.classList.remove('loaded'), 2)
	})

	mediaFromBackgroundFiles(id, local, data).then((image) => {
		if (image.format === 'image') {
			img.src = image.urls.small
		}
		if (image.format === 'video' && image.thumbnail) {
			img.src = image.thumbnail
		}
	})
}

async function handleThumbnailClick(this: HTMLButtonElement, mouseEvent: MouseEvent) {
	const hasCtrl = mouseEvent.ctrlKey || mouseEvent.metaKey
	const isLeftClick = mouseEvent.button === 0
	const id = this?.id ?? ''

	if (isLeftClick && hasCtrl) {
		if (!this.classList.contains('selected')) {
			document.getElementById('b_thumbnail-remove')?.removeAttribute('disabled')
		}

		document.getElementById(id)?.classList?.toggle('selected')
		return
	}

	if (this.classList.contains('selected') && isLeftClick) {
		unselectAll()
		document.getElementById(id)?.classList?.toggle('selected')
		return
	}

	if (this.classList.contains('selected')) {
		return
	}

	if (isLeftClick) {
		const local = await storage.local.get()
		const metadata = local.backgroundFiles[id]
		const image = await mediaFromBackgroundFiles(id, local)

		if (!metadata || !image) {
			console.warn('metadata: ', metadata)
			console.warn('image: ', image)
			return
		}

		unselectAll()
		document.getElementById(id)?.classList?.add('selected')

		local.backgroundFiles[id].lastUsed = new Date().toString()
		storage.local.set({ backgroundFiles: local.backgroundFiles })

		handleFilesSettingsOptions(local)
		handleFilesMoveOptions(metadata)
		applyBackground(image)
	}
}

// Local to Background conversions

export function lastUsedBackgroundFiles(metadatas: Local['backgroundFiles']): string[] {
	const sortedMetadata = Object.entries(metadatas).toSorted((a, b) => {
		return new Date(b[1].lastUsed).getTime() - new Date(a[1].lastUsed).getTime()
	})

	return sortedMetadata.map(([id, _]) => id)
}

export async function mediaFromBackgroundFiles(
	id: string,
	local: Local,
	data?: LocalFileData,
): Promise<Background> {
	const isRaw = local.backgroundCompressFiles === false
	const metadata = local.backgroundFiles[id]
	data = data ?? (await getFileFromCache(id))

	const isVideo = data.raw.type.includes('video/')

	if (isVideo) {
		const htmlvideo = await getLoadedVideo(data.raw)
		const duration = htmlvideo.duration

		htmlvideo.remove()

		const videoUrl = URL.createObjectURL(data.raw)
		const thumbnailUrl = URL.createObjectURL(data.small)

		const video: BackgroundVideo = {
			format: 'video',
			duration: duration,
			mimetype: data.raw.type,
			thumbnail: thumbnailUrl,
			urls: {
				full: videoUrl,
				medium: videoUrl,
				small: videoUrl,
			},
		}

		return video
	} //
	else {
		const urls = {
			raw: URL.createObjectURL(data.raw),
			full: URL.createObjectURL(data.full),
			medium: URL.createObjectURL(data.medium),
			small: URL.createObjectURL(data.small),
		}

		const image: BackgroundImage = {
			format: 'image',
			mimetype: data.raw.type,
			size: metadata?.position.size ?? 'cover',
			x: metadata?.position.x ?? '50%',
			y: metadata?.position.y ?? '50%',
			urls: {
				full: isRaw ? urls.raw : urls.full,
				medium: urls.medium,
				small: urls.small,
			},
		}

		return image
	}
}

//	Helpers

function unselectAll() {
	for (const node of document.querySelectorAll('.thumbnail.selected')) {
		node?.classList?.remove('selected')
	}
}

function getSelection(): string[] {
	const thmbs = document.querySelectorAll<HTMLElement>('.thumbnail.selected')
	const ids = Object.values(thmbs).map((thmb) => thmb?.id ?? '')
	return ids
}

//  Storage

async function saveFileToCache(id: string, filedata: LocalFileData) {
	const cache = await getCache('local-files')

	for (const [size, blob] of Object.entries(filedata)) {
		const request = new Request(`http://127.0.0.1:8888/${id}/${size}`)

		const response = new Response(blob, {
			headers: {
				'content-type': blob.type,
				'Cache-Control': 'max-age=604800',
			},
		})

		cache.put(request, response)
	}
}

export async function getFileFromCache(id: string): Promise<LocalFileData> {
	const cache = await getCache('local-files')

	const raw = (await (await cache?.match(`http://127.0.0.1:8888/${id}/raw`))?.blob()) as File | undefined
	const full = await (await cache?.match(`http://127.0.0.1:8888/${id}/full`))?.blob()
	const medium = await (await cache?.match(`http://127.0.0.1:8888/${id}/medium`))?.blob()
	const small = await (await cache?.match(`http://127.0.0.1:8888/${id}/small`))?.blob()

	if (!full || !medium || !small || !raw) {
		throw new Error(`${id} is undefined`)
	}

	return {
		raw,
		full,
		medium,
		small,
	}
}

async function removeFilesFromCache(ids: string[]) {
	const cache = await getCache('local-files')

	for (const id of ids) {
		sessionStorage.removeItem(id)
		cache.delete(`http://127.0.0.1:8888/${id}/raw`)
		cache.delete(`http://127.0.0.1:8888/${id}/full`)
		cache.delete(`http://127.0.0.1:8888/${id}/medium`)
		cache.delete(`http://127.0.0.1:8888/${id}/small`)
	}

	return true
}

/**
 * Removes metadata in local storage or add default based on files
 * found in CacheStorage "local-files"
 */
async function sanitizeMetadatas(local: Local): Promise<Local> {
	const newMetadataList: Record<string, BackgroundFile> = {}
	const cache = await getCache('local-files')
	const cacheKeys = await cache.keys()

	for (const request of cacheKeys) {
		try {
			const key = new URL(request.url).pathname.split('/')[1]
			let metadata = local.backgroundFiles[key]

			if (!metadata) {
				metadata = {
					lastUsed: new Date('01/01/1971').toString(),
					position: {
						size: 'cover',
						x: '50%',
						y: '50%',
					},
				}
			}

			newMetadataList[key] = metadata
		} catch (err) {
			console.info(err)
		}
	}

	const oldKeys = Object.keys(local.backgroundFiles)
	const newKeys = Object.keys(newMetadataList)

	if (oldKeys.length !== newKeys.length) {
		storage.local.set({ backgroundFiles: newMetadataList })
	}

	local.backgroundFiles = newMetadataList

	return local
}

function getCache(name: string): Promise<Cache | IDBCache> {
	if (PLATFORM === 'safari') {
		// CacheStorage doesn't work on Safari extensions, need indexedDB
		return Promise.resolve(new IDBCache(name))
	}

	return caches.open(name)
}
