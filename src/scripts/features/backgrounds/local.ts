import { applyBackground, removeBackgrounds } from './index.ts'
import { compressMedia } from '../../shared/compress.ts'
import { onclickdown } from 'clickdown/mod'
import { IS_MOBILE } from '../../defaults.ts'
import { needsChange, userDate } from '../../shared/time.ts'
import { hashcode } from '../../utils/hash.ts'
import { storage } from '../../storage.ts'
// import * as idb from 'idb-keyval'

import type { BackgroundFile, Local } from '../../../types/local.ts'
import type { BackgroundImage } from '../../../types/shared.ts'
import type { Sync } from '../../../types/sync.ts'

type LocalFileData = {
	raw: File
	full: Blob
	medium: Blob
	small: Blob
}

type OldLocalImages = {
	ids: string[]
	selected: string
}
type OldLocalImagesItem = {
	background: File
	thumbnail: Blob
}

let thumbnailVisibilityObserver: IntersectionObserver
let thumbnailSelectionObserver: MutationObserver

export async function localFilesCacheControl(sync: Sync, local: Local) {
	const ids = lastUsedBackgroundFiles(local.backgroundFiles)
	const metadata = local.backgroundFiles[ids[0]]
	const freq = sync.backgrounds.frequency
	const lastUsed = new Date(metadata.lastUsed).getTime()
	const needNew = needsChange(freq, lastUsed)

	if (needNew) {
		ids.shift()

		const rand = Math.floor(Math.random() * ids.length)
		const id = ids[rand]

		applyBackground(await imageFromLocalFiles(id, local))
		local.backgroundFiles[id].lastUsed = userDate().toString()
		storage.local.set(local)
	} else {
		applyBackground(await imageFromLocalFiles(ids[0], local))
	}
}

// Update

export async function addLocalBackgrounds(filelist: FileList | File[], local: Local) {
	try {
		const dateString = userDate().toString()
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

			const raw = file
			const full = await compressMedia(file, { size: averagePixelHeight, q: 0.8 })
			const medium = await compressMedia(full, { size: averagePixelHeight / 3, q: 0.6 })
			const small = await compressMedia(medium, { size: 360, q: 0.4 })

			// const exif = await getExif(file)

			local.backgroundFiles[id] = {
				lastUsed: dateString,
				position: {
					size: 'cover',
					x: '50%',
					y: '50%',
				},
			}

			filesData[id] = { raw, full, medium, small }

			saveFileToCache(id, filesData[id])
			addThumbnailImage(id, filesData[id])
			storage.local.set({ backgroundFiles: local.backgroundFiles })
		}

		// 3. Apply background

		const id = newids[0]
		const image = await imageFromLocalFiles(id, local)

		unselectAll()
		applyBackground(image)
		handleFilesSettingsOptions(local)
	} catch (e) {
		console.info(e)
		return
	}
}

async function removeLocalBackgrounds() {
	try {
		const local = await storage.local.get()
		const ids = getSelection()

		if (ids.length === 0 || !local.backgroundFiles) {
			return
		}

		for (const id of ids) {
			removeFileFromCache(id)
			delete local.backgroundFiles[id]

			const thumbnail = document.querySelector<HTMLElement>(`#${id}`)
			thumbnail?.classList.toggle('hiding', true)
			setTimeout(() => {
				thumbnail?.remove()
			}, 100)
		}

		const filesIds = lastUsedBackgroundFiles(local.backgroundFiles)
		const image = await imageFromLocalFiles(filesIds[0], local)

		if (image) {
			applyBackground(image)
		} else {
			removeBackgrounds()
			toggleLocalFileButtons()
		}

		handleFilesSettingsOptions(local)
		storage.local.remove('backgroundFiles')
		storage.local.set({ backgroundFiles: local.backgroundFiles })
	} catch (_) {
		console.info('You are on Firefox Private Browsing')
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
	onclickdown(document.getElementById('b_thumbnail-zoom'), handleGridView)
	onclickdown(document.getElementById('b_thumbnail-position'), handlePositionOption)
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
	const missingThumbnails = fileIds.filter((id) => !thumbIds.includes(id))

	if (missingThumbnails.length > 0) {
		for (const id of missingThumbnails) {
			const thumbnail = createThumbnail(id)
			thumbnailsContainer?.appendChild(thumbnail)
			thumbnailVisibilityObserver?.observe(thumbnail)
			thumbnailSelectionObserver?.observe(thumbnail, { attributes: true })
		}
	}
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

function handlePositionOption() {
	const domoptions = document.getElementById('background-position-options')
	domoptions?.classList.toggle('shown')
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
				if (data) {
					addThumbnailImage(id, data)
					thumbnailVisibilityObserver.unobserve(target)
				}
			})
		}
	}
}

function toggleLocalFileButtons(_?: MutationRecord[]) {
	const thmbRemove = document.getElementById('b_thumbnail-remove')
	const thmbMove = document.getElementById('b_thumbnail-position')
	const thmbZoom = document.getElementById('b_thumbnail-zoom')
	const thumbnails = document.querySelectorAll('.thumbnail').length
	const selected = document.querySelectorAll('.thumbnail.selected').length
	const domoptions = document.getElementById('background-position-options')

	thumbnails === 0 ? thmbZoom?.setAttribute('disabled', '') : thmbZoom?.removeAttribute('disabled')
	selected === 0 ? thmbRemove?.setAttribute('disabled', '') : thmbRemove?.removeAttribute('disabled')
	selected !== 1 ? thmbMove?.setAttribute('disabled', '') : thmbMove?.removeAttribute('disabled')

	if (selected === 1 && domoptions?.classList.contains('shown')) {
		domoptions?.classList.remove('shown')
	}
}

// Thumbnails

function createThumbnail(id: string): HTMLButtonElement {
	const thb = document.createElement('button')
	const thbimg = document.createElement('img')

	thb.id = id
	thbimg.src = 'src/assets/interface/sand-clock.svg'
	thb.className = 'thumbnail loading'
	thbimg.setAttribute('alt', '')
	thbimg.setAttribute('draggable', 'false')
	thb.setAttribute('aria-label', 'Select this background')

	thb.appendChild(thbimg)
	thb.addEventListener('click', handleThumbnailClick)

	return thb
}

function addThumbnailImage(id: string, data: LocalFileData): void {
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

	img.src = URL.createObjectURL(data.small)
}

async function handleThumbnailClick(this: HTMLButtonElement, mouseEvent: MouseEvent) {
	const hasCtrl = mouseEvent.ctrlKey || mouseEvent.metaKey
	const isLeftClick = mouseEvent.button === 0
	const id = this?.id ?? ''

	if (isLeftClick && hasCtrl) {
		document.getElementById('b_thumbnail-remove')?.removeAttribute('disabled')
		document.getElementById(id)?.classList?.toggle('selected')
		return
	}

	if (isLeftClick) {
		const local = await storage.local.get()
		const metadata = local.backgroundFiles[id]
		const image = await imageFromLocalFiles(id, local)

		if (!metadata || !image) {
			console.warn('metadata: ', metadata)
			console.warn('image: ', image)
			return
		}

		unselectAll()
		document.getElementById(id)?.classList?.add('selected')

		local.backgroundFiles[id].lastUsed = userDate().toString()
		storage.local.set({ backgroundFiles: local.backgroundFiles })

		handleFilesSettingsOptions(local)
		handleFilesMoveOptions(metadata)
		applyBackground(image)
	}
}

// Local to Background conversions

function lastUsedBackgroundFiles(metadatas: Local['backgroundFiles']): string[] {
	const sortedMetadata = Object.entries(metadatas).toSorted((a, b) => {
		return new Date(b[1].lastUsed).getTime() - new Date(a[1].lastUsed).getTime()
	})

	return sortedMetadata.map(([id, _]) => id)
}

function imageObjectFromMetadatas(metadata: BackgroundFile): BackgroundImage {
	return {
		format: 'image',
		size: metadata.position.size,
		x: metadata.position.x,
		y: metadata.position.y,
		urls: {
			full: 'blob-full',
			medium: 'blob-medium',
			small: 'blob-small',
		},
	}
}

export function collectionFromLocalFiles(local: Local): [string[], BackgroundImage[]] {
	const metadatas = local.backgroundFiles
	const ids = lastUsedBackgroundFiles(metadatas)

	if (ids.length > 0) {
		const images = ids.map((id) => imageObjectFromMetadatas(metadatas[id]))
		return [ids, images]
	}

	return [[], []]
}

export async function imageFromLocalFiles(id: string, local: Local): Promise<BackgroundImage> {
	const isRaw = local.backgroundCompressFiles
	const image = imageObjectFromMetadatas(local.backgroundFiles[id])
	const data = await getFileFromCache(id)

	image.urls.full = URL.createObjectURL(isRaw ? data.raw : data.full)
	image.urls.medium = URL.createObjectURL(data.medium)
	image.urls.small = URL.createObjectURL(data.small)

	return image
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
	const cache = await caches.open('local-files')

	for (const [size, blob] of Object.entries(filedata)) {
		const request = new Request(`https://mock.bonjourr.fr/${id}/${size}`)
		const response = new Response(blob, { headers: { 'content-type': blob.type } })
		cache.put(request, response)
	}
}

export async function getFileFromCache(id: string): Promise<LocalFileData> {
	const start = globalThis.performance.now()
	const cache = await caches.open('local-files')

	const raw = await (await cache?.match(`https://mock.bonjourr.fr/${id}/raw`))?.blob() as (File | undefined)
	const full = await (await cache?.match(`https://mock.bonjourr.fr/${id}/full`))?.blob()
	const medium = await (await cache?.match(`https://mock.bonjourr.fr/${id}/medium`))?.blob()
	const small = await (await cache?.match(`https://mock.bonjourr.fr/${id}/small`))?.blob()

	if (!full || !medium || !small || !raw) {
		throw new Error(`${id} is undefined`)
	}

	const time = globalThis.performance.now() - start
	console.log('got', id, 'in: ', time, 'ms')

	return {
		raw,
		full,
		medium,
		small,
	}
}

async function removeFileFromCache(id: string) {
	const cache = await caches.open('local-files')

	cache.delete(`https://mock.bonjourr.fr/${id}/raw`)
	cache.delete(`https://mock.bonjourr.fr/${id}/full`)
	cache.delete(`https://mock.bonjourr.fr/${id}/medium`)
	cache.delete(`https://mock.bonjourr.fr/${id}/small`)

	return true
}

async function sanitizeMetadatas(local: Local): Promise<Local> {
	const newMetadataList: Record<string, BackgroundFile> = {}
	const cache = await caches.open('local-files')
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
