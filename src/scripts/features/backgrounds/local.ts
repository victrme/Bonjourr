import { applyBackground, removeBackgrounds } from './index.ts'
import { compressAsBlob, imageDimensions } from '../../shared/compress.ts'
import { webkitRangeTrackColor } from '../../shared/dom.ts'
import { needsChange } from '../../shared/time.ts'
import { onclickdown } from 'clickdown/mod'
import { VideoLooper } from './VideoLooper.ts'
import { IS_MOBILE } from '../../defaults.ts'
import { getCache } from '../../shared/cache.ts'
import { hashcode } from '../../utils/hash.ts'
import { storage } from '../../storage.ts'

import type { Background, BackgroundImage, BackgroundVideo } from '../../../types/shared.ts'
import type { BackgroundFile, Local } from '../../../types/local.ts'
import type { Backgrounds } from '../../../types/sync.ts'

type LocalFileData = {
	full: Blob
	small: Blob
}

type LocalFileOption =
	| 'size'
	| 'vertical'
	| 'horizontal'
	| 'video-zoom'
	| 'playback-speed'
	| 'loop-fade'
	| 'use-compressed'

let thumbnailVisibilityObserver: IntersectionObserver
let thumbnailSelectionObserver: MutationObserver
let currentVideoLooper: VideoLooper

// Update

export async function addLocalBackgrounds(filelist: FileList | File[], local: Local) {
	try {
		const thumbnailsContainer = document.getElementById('thumbnails-container')
		const filesData: Record<string, LocalFileData> = {}
		const newids: string[] = []
		let thumbnail: HTMLElement | undefined

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

			thumbnail = createThumbnail(hashString)
			thumbnailsContainer?.appendChild(thumbnail)
			thumbnailSelectionObserver?.observe(thumbnail, { attributes: true })
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
			const format = file.type.includes('video') ? 'video' : 'image'

			// 2a. This finds a reasonable resolution for compression

			const isLandscape = globalThis.screen.orientation.type === 'landscape-primary'
			const long = isLandscape ? globalThis.screen.width : globalThis.screen.height
			const short = isLandscape ? globalThis.screen.height : globalThis.screen.width
			const density = Math.min(2, globalThis.devicePixelRatio)
			const ratio = Math.min(1.8, long / short)
			const averagePixelHeight = short * ratio * density

			const isGif = file.type.includes('image/gif')
			const isImage = file.type.includes('image/')
			const isVideo = file.type.includes('video/')
			const isThumbnailSize = file.size < 80000 // 80 kb
			const isResonablySized = file.size < 300000 // 300 kb

			let full: Blob = file
			let small: Blob = file

			if (isImage) {
				if (!isThumbnailSize) {
					const objectUrl = URL.createObjectURL(file)
					const dimensions = await imageDimensions(objectUrl)
					const width = dimensions.width
					const height = dimensions.height
					const isHighRes = averagePixelHeight * 2 < width + height
					const isCompressible = !isGif && !isResonablySized && isHighRes

					if (isCompressible) {
						full = await compressAsBlob(objectUrl, { size: averagePixelHeight, q: 0.8 })
					}

					small = await compressAsBlob(objectUrl, { size: 360, q: 0.4 })
				}
			}

			if (isVideo) {
				const thumb = await generateImageFromVideo(file)
				if (thumb) small = await compressAsBlob(thumb, { size: 360, q: 0.3 })
			}

			local.backgroundFiles[id] = {
				format: 'image',
				lastUsed: new Date().toString(),
			}

			if (format === 'video') {
				local.backgroundFiles[id].format = 'video'
				local.backgroundFiles[id].video = {
					playbackRate: 1,
					fade: 1,
					zoom: 1,
				}
			} else {
				local.backgroundFiles[id].format = 'image'
				local.backgroundFiles[id].position = {
					size: 'cover',
					x: '50%',
					y: '50%',
				}
			}

			filesData[id] = {
				full,
				small,
			}

			await saveFileToCache(id, filesData[id])
			addThumbnailImage(id, local, filesData[id])

			storage.local.set({ backgroundFiles: local.backgroundFiles })
		}

		// 3. Apply background

		if (newids.length > 0) {
			const id = newids[0]
			const media = await mediaFromFiles(id, local, filesData[id])

			applyBackground(media)
			unselectAll()

			thumbnail?.classList.add('selected')
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
				toggleFileButtons()
			}, 100)
		}

		const filesIds = lastUsedBackgroundFiles(local.backgroundFiles)

		if (filesIds.length > 0) {
			applyBackground(await mediaFromFiles(filesIds[0], local))
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

async function updateFileOptions(option: LocalFileOption, value: string) {
	const selection = getSelection()[0]
	const local = await storage.local.get('backgroundFiles')
	const file = local.backgroundFiles[selection]
	const isVideo = file.format === 'video'
	const isImage = !isVideo

	const backgroundImage = document.querySelector<HTMLElement>('#background-media div')
	const videoContainer = document.querySelector<HTMLElement>('#background-media .video-looper')

	if (!file) {
		console.error('Cannot find file')
		return
	}

	if (isImage && backgroundImage) {
		if (!file.position) {
			file.position = {
				size: 'cover',
				x: '50%',
				y: '50%',
			}
		}

		if (option === 'size') {
			file.position.size = value === '100' ? 'cover' : `${value}%`
			backgroundImage.style.backgroundSize = file.position.size
		}
		if (option === 'vertical') {
			file.position.y = `${value}%`
			backgroundImage.style.backgroundPositionY = file.position.y
		}
		if (option === 'horizontal') {
			file.position.x = `${value}%`
			backgroundImage.style.backgroundPositionX = file.position.x
		}
		if (option === 'use-compressed') {
			applyBackground(await mediaFromFiles(selection, local, undefined, file))
		}
	}

	if (isVideo && videoContainer) {
		const video = getCurrentVideo()

		if (!video) {
			return
		}

		if (!file.video) {
			file.video = {
				playbackRate: 1,
				fade: 4,
				zoom: 1,
			}
		}

		if (option === 'video-zoom') {
			file.video.zoom = parseFloat(value)
			videoContainer.style.transform = `scale(${file.video.zoom})`
		}
		if (option === 'playback-speed') {
			file.video.playbackRate = parseFloat(value)
			video.setPlaybackRate(parseFloat(value))
			video.stop()
			video.loop()
		}
		if (option === 'loop-fade') {
			file.video.fade = parseInt(value)
			video.setFadeTime(parseInt(value))
		}
	}

	local.backgroundFiles[selection] = file
	storage.local.set({ backgroundFiles: local.backgroundFiles })
}

//	Settings options

export function initFilesSettingsOptions(local: Local) {
	if (IS_MOBILE) {
		const container = document.getElementById('thumbnails-container')
		container?.style.setProperty('--thumbnails-columns', '2')
	}

	sanitizeMetadatas(local).then((newlocal) => {
		handleFilesSettingsOptions(newlocal)
	})

	onclickdown(document.getElementById('b_thumbnail-remove'), removeLocalBackgrounds)
	onclickdown(document.getElementById('b_thumbnail-options'), toggleFileOptions)
	document.getElementById('b_thumbnail-zoom')?.addEventListener('click', handleGridView)
	document.getElementById('i_background-size')?.addEventListener('input', fileOptionsEvent)
	document.getElementById('i_background-vertical')?.addEventListener('input', fileOptionsEvent)
	document.getElementById('i_background-horizontal')?.addEventListener('input', fileOptionsEvent)
	document.getElementById('i_background-compress')?.addEventListener('change', fileOptionsEvent)
	document.getElementById('i_background-loop-fade')?.addEventListener('input', fileOptionsEvent)
	document.getElementById('i_background-video-zoom')?.addEventListener('input', fileOptionsEvent)
	document.getElementById('i_background-playback-speed')?.addEventListener('input', fileOptionsEvent)

	thumbnailSelectionObserver = new MutationObserver(toggleFileButtons)
	thumbnailVisibilityObserver = new IntersectionObserver(renderThumbnailOnIntersection)

	// option functions

	function fileOptionsEvent(this: HTMLInputElement) {
		const { id, value, checked } = this

		if (id === 'i_background-size') {
			updateFileOptions('size', value)
		}
		if (id === 'i_background-vertical') {
			updateFileOptions('vertical', value)
		}
		if (id === 'i_background-horizontal') {
			updateFileOptions('horizontal', value)
		}
		if (id === 'i_background-compress') {
			updateFileOptions('use-compressed', checked.toString())
		}
		if (id === 'i_background-video-zoom') {
			updateFileOptions('video-zoom', value)
		}
		if (id === 'i_background-playback-speed') {
			updateFileOptions('playback-speed', value)
		}
		if (id === 'i_background-loop-fade') {
			updateFileOptions('loop-fade', value)
		}
	}

	function renderThumbnailOnIntersection(entries: IntersectionObserverEntry[]) {
		for (const { target, isIntersecting } of entries) {
			const isLoading = target.classList.contains('loading')
			const id = target.id ?? ''

			if (isIntersecting && isLoading) {
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

	function handleGridView() {
		const container = document.getElementById('thumbnails-container') as HTMLElement
		const currentZoom = globalThis.getComputedStyle(container).getPropertyValue('--thumbnails-columns')
		const newZoom = Math.max((Number.parseInt(currentZoom) + 1) % 6, 1)
		container.style.setProperty('--thumbnails-columns', newZoom.toString())
	}

	function toggleFileOptions() {
		document.getElementById('background-file-options')?.classList.toggle('shown')
	}
}

function handleFilesSettingsOptions(local: Local) {
	const backgroundFiles = local.backgroundFiles
	const thumbnailsContainer = document.getElementById('thumbnails-container')
	const thumbs = document.querySelectorAll<HTMLElement>('.thumbnail')
	const thumbIds = Object.values(thumbs).map((el) => el.id)
	const fileIds = Object.keys(backgroundFiles) ?? []
	const lastUsedIds = lastUsedBackgroundFiles(local.backgroundFiles)
	const missingThumbnails = fileIds.filter((id) => !thumbIds.includes(id))
	const file = local.backgroundFiles[lastUsedIds[0]]

	if (missingThumbnails.length > 0) {
		for (const id of missingThumbnails) {
			const thumbnail = createThumbnail(id)
			thumbnailsContainer?.appendChild(thumbnail)
			thumbnailVisibilityObserver?.observe(thumbnail)
			thumbnailSelectionObserver?.observe(thumbnail, { attributes: true })

			if (id === lastUsedIds[0]) {
				thumbnail.classList.add('selected')
			}
		}
	}

	if (!file) {
		toggleFileButtons()
		return
	}

	const domSize = document.querySelector<HTMLInputElement>('#i_background-size')
	const domVertical = document.querySelector<HTMLInputElement>('#i_background-vertical')
	const domHorizontal = document.querySelector<HTMLInputElement>('#i_background-horizontal')
	const domLoopFade = document.querySelector<HTMLInputElement>('#i_background-loop-fade')
	const domVideoZoom = document.querySelector<HTMLInputElement>('#i_background-video-zoom')
	const domPlaybackRate = document.querySelector<HTMLInputElement>('#i_background-playback-speed')
	const imageRangesExist = domSize && domVertical && domHorizontal
	const videoRangesExist = domLoopFade && domVideoZoom && domPlaybackRate

	const domFileImage = document.getElementById('background-file-image')
	const domFileVideo = document.getElementById('background-file-video')
	const groupsExist = domFileImage && domFileVideo
	const isVideo = file.format === 'video'
	const isImage = !isVideo

	const imageDefaults: BackgroundFile['position'] = { size: 'cover', x: '50%', y: '50%' }
	const videoDefaults: BackgroundFile['video'] = { playbackRate: 1, fade: 4, zoom: 1 }

	// 1. Toggle option groups based on file format

	if (groupsExist) {
		domFileImage.style.display = isVideo ? 'none' : 'block'
		domFileVideo.style.display = isVideo ? 'block' : 'none'
	}

	// 2. Add correct values to inputs

	if (imageRangesExist && isImage) {
		const pos = file.position ?? imageDefaults

		domSize.value = (pos.size === 'cover' ? '100' : pos.size).replace('%', '')
		domVertical.value = pos.y.replace('%', '')
		domHorizontal.value = pos.x.replace('%', '')

		webkitRangeTrackColor(domSize)
		webkitRangeTrackColor(domVertical)
		webkitRangeTrackColor(domHorizontal)
	}

	if (videoRangesExist && isVideo) {
		const video = file.video ?? videoDefaults

		domLoopFade.value = video.fade.toString()
		domVideoZoom.value = video.zoom.toString()
		domPlaybackRate.value = video.playbackRate.toString()

		webkitRangeTrackColor(domLoopFade)
		webkitRangeTrackColor(domVideoZoom)
		webkitRangeTrackColor(domPlaybackRate)
	}

	toggleFileButtons()
}

function toggleFileButtons() {
	const thmbRemove = document.getElementById('b_thumbnail-remove')
	const thmbOptions = document.getElementById('b_thumbnail-options')
	const selected = document.querySelectorAll('.thumbnail.selected').length
	const domoptions = document.getElementById('background-options-options')
	const areOptionsShown = domoptions?.classList.contains('shown')

	selected === 0 ? thmbRemove?.setAttribute('disabled', '') : thmbRemove?.removeAttribute('disabled')
	selected !== 1 ? thmbOptions?.setAttribute('disabled', '') : thmbOptions?.removeAttribute('disabled')

	if (selected !== 1) {
		document.getElementById('background-file-options')?.classList.remove('shown')
	}
	if (selected === 1 && areOptionsShown) {
		domoptions?.classList.remove('shown')
	}
}

// Thumbnails

function createThumbnail(id: string): HTMLButtonElement {
	const thb = document.createElement('button')
	const thbimg = document.createElement('img')
	const formatIcon = document.createElement('span')

	thb.id = id
	thb.className = 'thumbnail loading'
	thb.setAttribute('aria-label', 'Select this background')

	thbimg.src = 'src/assets/interface/loading.svg'
	thbimg.setAttribute('alt', '')
	thbimg.setAttribute('draggable', 'false')

	formatIcon.className = 'thumbnail-format-icon'

	thb.appendChild(thbimg)
	thb.appendChild(formatIcon)
	thb.addEventListener('click', handleThumbnailClick)

	return thb
}

function addThumbnailImage(id: string, local: Local, data: LocalFileData): void {
	const btn = document.querySelector<HTMLButtonElement>(`#${id}`)
	const img = document.querySelector<HTMLImageElement>(`#${id} img`)

	if (!img || !btn) {
		console.warn('Cannot find thumbnail or button for ' + id)
		return
	}

	img.addEventListener('load', () => {
		btn.classList.replace('loading', 'loaded')
		setTimeout(() => btn.classList.remove('loaded'), 2)
	})

	mediaFromFiles(id, local, data).then((image) => {
		const { format, urls } = image

		btn.dataset.format = format

		if (format === 'image') {
			img.src = urls.small
		}
		if (format === 'video') {
			if (image.thumbnail) {
				img.src = image.thumbnail
			}
		}
	})
}

async function handleThumbnailClick(this: HTMLButtonElement, mouseEvent: MouseEvent) {
	const hasCtrl = mouseEvent.ctrlKey || mouseEvent.metaKey
	const shiftKey = mouseEvent.shiftKey
	const isLeftClick = mouseEvent.button === 0
	const id = this?.id ?? ''

	if (isLeftClick && shiftKey) {
		const thumbnails = document.querySelectorAll('.thumbnail')

		let firstSelectionPos: number | undefined
		let lastSelectionPos: number | undefined
		let selectedPos: number | undefined

		// Find current selection range

		thumbnails.forEach((thumbnail, index) => {
			const isSelected = thumbnail.className.includes('selected')
			const isSelection = thumbnail === this

			if (isSelected) {
				lastSelectionPos = index
			}
			if (isSelected && !firstSelectionPos) {
				firstSelectionPos = index
			}
			if (isSelection && !selectedPos) {
				selectedPos = index
			}
		})

		// Increase range to maximum selected

		if (firstSelectionPos !== undefined && lastSelectionPos !== undefined && selectedPos !== undefined) {
			const positions = [firstSelectionPos, lastSelectionPos, selectedPos]
			const first = Math.min(...positions)
			const last = Math.max(...positions)

			thumbnails.forEach((thumbnail, index) => {
				const inSelectionRange = index >= first && index <= last
				thumbnail.classList.toggle('selected', inSelectionRange)
			})

			return
		}
	}

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
		const image = await mediaFromFiles(id, local)

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

export async function mediaFromFiles(
	id: string,
	local: Local,
	data?: LocalFileData,
	metadata?: BackgroundFile,
): Promise<Background> {
	metadata ??= local.backgroundFiles[id]

	data = data ?? (await getFileFromCache(id))

	if (data.full.type.includes('video/')) {
		const htmlvideo = await getLoadedVideo(data.full)
		const duration = htmlvideo.duration

		htmlvideo.remove()

		const videoUrl = URL.createObjectURL(data.full)
		const thumbnailUrl = URL.createObjectURL(data.small)

		const video: BackgroundVideo = {
			format: 'video',
			duration: duration,
			mimetype: data.full.type,
			thumbnail: thumbnailUrl,
			file: metadata,
			urls: {
				full: videoUrl,
				small: videoUrl,
			},
		}

		return video
	} //
	else {
		const urls = {
			full: URL.createObjectURL(data.full),
			small: URL.createObjectURL(data.small),
		}

		const image: BackgroundImage = {
			format: 'image',
			mimetype: data.full.type,
			file: metadata,
			urls: {
				full: urls.full,
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

// Video

export function setCurrentVideo(src: string, fade: number, playback: number): VideoLooper {
	currentVideoLooper = new VideoLooper(src, fade, playback)
	return currentVideoLooper
}

export function getCurrentVideo(): VideoLooper | undefined {
	return currentVideoLooper
}

async function getLoadedVideo(blob: Blob): Promise<HTMLVideoElement> {
	const video = document.createElement('video')

	const url = URL.createObjectURL(blob)
	video.src = url

	await new Promise((r) => {
		video.addEventListener('loadeddata', () => r(true))
		video.load()
	})

	URL.revokeObjectURL(url)

	return video
}

async function generateImageFromVideo(file: File): Promise<Blob | null> {
	const video = await getLoadedVideo(file)
	const canvas = document.createElement('canvas')
	const ctx = canvas.getContext('2d')

	if (!ctx) {
		throw new Error('Canvas context failed for ' + file.name)
	}

	ctx.canvas.width = video.videoWidth
	ctx.canvas.height = video.videoHeight

	document.body.append(video)
	video.style.display = 'none'
	video.play()
	video.pause()

	const blob = await new Promise<Blob>((resolve, reject) => {
		const toBlobCallback: BlobCallback = (blob) => blob ? resolve(blob) : reject(true)

		// <!> 300ms is completely arbitrary,
		// <!> videos taking more than that to load will show a black thumbnail
		setTimeout(() => {
			ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight)
			ctx.canvas.toBlob(toBlobCallback, 'image/jpeg', 0.8)
		}, 300)
	})

	video.remove()

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

		applyBackground(await mediaFromFiles(id, local))
		local.backgroundFiles[id].lastUsed = new Date().toString()
		storage.local.set(local)
	} else {
		applyBackground(await mediaFromFiles(ids[0], local))
	}
}

//  Storage

async function saveFileToCache(id: string, filedata: LocalFileData) {
	const cache = await getCache('local-files')
	const { full, small } = filedata

	// Dumb down code from loop to force small/full

	const requestFull = new Request(`http://127.0.0.1:8888/${id}/full`)
	const requestSmall = new Request(`http://127.0.0.1:8888/${id}/small`)
	const headersFull = { 'content-type': full.type, 'Cache-Control': 'max-age=604800' }
	const headersSmall = { 'content-type': small.type, 'Cache-Control': 'max-age=604800' }
	const responseFull = new Response(full, { headers: headersFull })
	const responseSmall = new Response(small, { headers: headersSmall })

	await Promise.all([
		cache.put(requestFull, responseFull),
		cache.put(requestSmall, responseSmall),
	])
}

export async function getFileFromCache(id: string): Promise<LocalFileData> {
	const cache = await getCache('local-files')

	const full = await (await cache?.match(`http://127.0.0.1:8888/${id}/full`))?.blob()
	const small = await (await cache?.match(`http://127.0.0.1:8888/${id}/small`))?.blob()

	if (!full || !small) {
		throw new Error(`${id} is undefined`)
	}

	return { full, small }
}

async function removeFilesFromCache(ids: string[]) {
	const cache = await getCache('local-files')

	for (const id of ids) {
		sessionStorage.removeItem(id)
		cache.delete(`http://127.0.0.1:8888/${id}/full`)
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
			const surelyVideo = request.url.includes('.mp4') || request.url.includes('.webm')
			let metadata = local.backgroundFiles[key]

			if (!metadata) {
				metadata = {
					format: surelyVideo ? 'video' : 'image',
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
