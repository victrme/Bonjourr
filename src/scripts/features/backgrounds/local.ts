import { applyBackground, removeBackgrounds } from './index'
import { compressMedia } from '../../shared/compress'
import { IS_MOBILE } from '../../defaults'
import { userDate } from '../../shared/time'
import { hashcode } from '../../utils/hash'
import { storage } from '../../storage'
import * as idb from 'idb-keyval'

type LocalFileData = {
	raw: File
	full: Blob
	medium: Blob
	small: Blob
}

let thumbnailVisibilityObserver: IntersectionObserver
let thumbnailSelectionObserver: MutationObserver

// Update

export async function addLocalBackgrounds(filelist: FileList | File[], local: Local.Storage) {
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

		const isLandscape = window.screen.orientation.type === 'landscape-primary'
		const long = isLandscape ? window.screen.width : window.screen.height
		const short = isLandscape ? window.screen.height : window.screen.width
		const density = Math.min(2, window.devicePixelRatio)
		const ratio = Math.min(1.8, long / short)
		const averagePixelHeight = short * ratio * density

		const raw = file
		const full = await compressMedia(file, { size: averagePixelHeight, q: 0.9 })
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

		addThumbnailImage(id, filesData[id])
		await idb.set(id, filesData[id])
		storage.local.set(local)
	}

	// 3. Apply background

	const id = newids[0]
	const data = filesData[id]
	const file = local.backgroundFiles[id]
	const isRaw = local.backgroundCompressFiles
	const image = imageObjectFromStorage(file, data, isRaw)

	unselectAll()
	applyBackground(image)
	handleFilesSettingsOptions(local)
}

async function removeLocalBackgrounds() {
	const local = await storage.local.get()
	const ids = getSelection()

	if (ids.length === 0 || !local.backgroundFiles) {
		return
	}

	for (const id of ids) {
		idb.del(id)
		delete local.backgroundFiles[id]

		const thumbnail = document.querySelector<HTMLElement>(`#${id}`)
		thumbnail?.classList.toggle('hiding', true)
		setTimeout(() => {
			thumbnail?.remove()
		}, 100)
	}

	const [_, collection] = await getFilesAsCollection(local)
	const image = collection[0]

	image ? applyBackground(image) : removeBackgrounds()
	handleFilesSettingsOptions(local)

	storage.local.remove('backgroundFiles')
	storage.local.set({ backgroundFiles: local.backgroundFiles })
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

export function initFilesSettingsOptions(local: Local.Storage) {
	thumbnailSelectionObserver = new MutationObserver(toggleLocalFileButtons)
	thumbnailVisibilityObserver = new IntersectionObserver(intersectionEvent)

	if (IS_MOBILE) {
		const container = document.getElementById('thumbnails-container')
		container?.style.setProperty('--thumbnails-columns', '2')
	}

	handleFilesSettingsOptions(local)

	document.getElementById('b_thumbnail-remove')?.onclickdown(removeLocalBackgrounds)
	document.getElementById('b_thumbnail-zoom')?.onclickdown(handleGridView)
	document.getElementById('b_thumbnail-position')?.onclickdown(handlePositionOption)
	document.getElementById('i_background-size')?.addEventListener('input', handleFilePosition)
	document.getElementById('i_background-vertical')?.addEventListener('input', handleFilePosition)
	document.getElementById('i_background-horizontal')?.addEventListener('input', handleFilePosition)
}

function handleFilesSettingsOptions(local: Local.Storage) {
	const backgroundFiles = local.backgroundFiles

	const thumbnailsContainer = document.getElementById('thumbnails-container')

	const thumbs = document.querySelectorAll<HTMLElement>('.thumbnail')
	const thumbIds = Object.values(thumbs).map(el => el.id)
	const fileIds = Object.keys(backgroundFiles) ?? []
	const missingThumbnails = fileIds.filter(id => !thumbIds.includes(id))

	if (missingThumbnails.length > 0) {
		for (const id of missingThumbnails) {
			const thumbnail = createThumbnail(id)
			thumbnailsContainer?.appendChild(thumbnail)
			thumbnailVisibilityObserver?.observe(thumbnail)
			thumbnailSelectionObserver?.observe(thumbnail, { attributes: true })
		}
	}
}

function handleFilesMoveOptions(file: Local.BackgroundFile) {
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
		const currentZoom = window.getComputedStyle(container).getPropertyValue('--thumbnails-columns')
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
			getFile(id).then(data => {
				if (data) {
					addThumbnailImage(id, data)
					thumbnailVisibilityObserver.unobserve(target)
				}
			})
		}
	}
}

function toggleLocalFileButtons(_: MutationRecord[]) {
	const thmbRemove = document.getElementById('b_thumbnail-remove')
	const thmbMove = document.getElementById('b_thumbnail-position')
	const thmbZoom = document.getElementById('b_thumbnail-zoom')
	const thumbnails = document.querySelectorAll('.thumbnail').length
	const selected = document.querySelectorAll('.thumbnail.selected').length
	const domoptions = document.getElementById('background-position-options')

	thumbnails === 0 ? thmbZoom?.setAttribute('disabled', '') : thmbZoom?.removeAttribute('disabled')
	selected === 0 ? thmbRemove?.setAttribute('disabled', '') : thmbRemove?.removeAttribute('disabled')
	selected === 0 ? thmbMove?.setAttribute('disabled', '') : thmbMove?.removeAttribute('disabled')

	if (selected === 0 && domoptions?.classList.contains('shown')) {
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
		const data = await getFile(id)
		const local = await storage.local.get()
		const file = local.backgroundFiles[id]
		const isRaw = local.backgroundCompressFiles

		if (!(file && data)) {
			console.warn('?')
			return
		}

		unselectAll()
		document.getElementById(id)?.classList?.add('selected')

		const image = imageObjectFromStorage(file, data, isRaw)

		local.backgroundFiles[id].lastUsed = userDate().toString()
		storage.local.set({ backgroundFiles: local.backgroundFiles })

		handleFilesSettingsOptions(local)
		handleFilesMoveOptions(file)
		applyBackground(image)
	}
}

// Storage

export async function getFilesAsCollection(local: Local.Storage): Promise<[string[], Backgrounds.Image[]]> {
	const idbKeys = (await idb.keys()) as string[]
	const files = validateBackgroundFiles(local, idbKeys)
	const filesData = await getAllFiles(Object.keys(files))
	const entries = Object.entries(files)

	const sorted = entries.toSorted((a, b) => {
		return new Date(a[1].lastUsed).getTime() - new Date(b[1].lastUsed).getTime()
	})

	const images: Backgrounds.Image[] = []
	const keys = sorted.map(entry => entry[0])

	for (const [key, file] of sorted) {
		const data = filesData[key]
		const isRaw = local.backgroundCompressFiles
		const image = imageObjectFromStorage(file, data, isRaw)
		images.push(image)
	}

	return [keys, images]
}

function imageObjectFromStorage(file: Local.BackgroundFile, data: LocalFileData, raw?: boolean): Backgrounds.Image {
	return {
		format: 'image',
		size: file.position.size,
		x: file.position.x,
		y: file.position.y,
		urls: {
			full: URL.createObjectURL(raw ? data.raw : data.full),
			medium: URL.createObjectURL(data.medium),
			small: URL.createObjectURL(data.small),
		},
	}
}

function validateBackgroundFiles(local: Local.Storage, idbKeys: string[]): Local.Storage['backgroundFiles'] {
	const backgroundFiles: Record<string, Local.BackgroundFile> = {}
	const date = userDate().toString()
	let change = false

	for (const key of idbKeys) {
		if (key in local.backgroundFiles) {
			backgroundFiles[key] = local.backgroundFiles[key]
		} else {
			backgroundFiles[key] = { lastUsed: date, position: { size: 'cover', x: '50%', y: '50%' } }
			change = true
		}
	}

	local.backgroundFiles = backgroundFiles

	if (change) {
		storage.local.set({ backgroundFiles })
	}

	return backgroundFiles
}

/**
 * Local file storage changes in Bonjourr 21, with automatic compression
 */
export async function migrateToNewIdbFormat(local: Local.Storage) {
	type LocalImages = { ids: string[]; selected: string }
	type LocalImagesItem = { background: File; thumbnail: Blob }

	const localImages = (await idb.get('localImages')) as LocalImages
	const selectedImage = (await idb.get(localImages?.selected ?? '')) as LocalImagesItem

	if (!(localImages && selectedImage)) {
		return
	}

	// 1. Quickly compress and show selected background

	await addLocalBackgrounds([selectedImage.background], local)

	// 2. Defer compression of other images

	const files: File[] = []

	for (const id of localImages.ids) {
		const file = await idb.get(id)

		if (file) {
			files.push(file)
		}
	}

	await addLocalBackgrounds(files, local)
	idb.delMany(localImages.ids)
	idb.del('localImages')
}

//	Helpers

function unselectAll() {
	for (const node of document.querySelectorAll('.thumbnail.selected')) {
		node?.classList?.remove('selected')
	}
}

function getSelection(): string[] {
	const thmbs = document.querySelectorAll<HTMLElement>('.thumbnail.selected')
	const ids = Object.values(thmbs).map(thmb => thmb?.id ?? '')
	return ids
}

async function getFile(id: string): Promise<LocalFileData | undefined> {
	return await idb.get<LocalFileData>(id)
}

async function getAllFiles(ids: string[]): Promise<Record<string, LocalFileData>> {
	const result: Record<string, LocalFileData> = {}

	for (const id of ids) {
		const file = await getFile(id)

		if (file) {
			result[id] = file
		}
	}

	return result
}
