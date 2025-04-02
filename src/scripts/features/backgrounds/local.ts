import { applyBackground, removeBackgrounds } from './index'
import { compressMedia } from '../../shared/compress'
import { userDate } from '../../shared/time'
import { hashcode } from '../../utils/hash'
import { storage } from '../../storage'
import * as idb from 'idb-keyval'

type LocalFileData = {
	full: Blob
	medium: Blob
	small: Blob
	thumb: Blob
	pixels: Blob
}

// Update

export async function addLocalBackgrounds(filelist: FileList, local: Local.Storage) {
	const dateString = userDate().toString()
	const thumbnailsContainer = document.getElementById('thumbnails-container')
	const filesData: Record<string, LocalFileData> = {}
	const newids: string[] = []

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
		const isLandscape = window.screen.orientation.type === 'landscape-primary'
		const sanePixelRatio = window.devicePixelRatio * 0.5
		const fullSize = (isLandscape ? window.screen.width : window.screen.height) * sanePixelRatio
		const isFileSmaller = file.size < fullSize ** 2

		const full = isFileSmaller ? (file as Blob) : await compressMedia(file, { size: fullSize, q: 0.9 })
		const medium = await compressMedia(full, { size: fullSize / 3, q: 0.6 })
		const small = await compressMedia(medium, { size: 360, q: 0.6 })
		const thumb = await compressMedia(medium, { size: 120, q: 0.6 })
		const pixels = await compressMedia(medium, { size: 4, type: 'png', q: 1 })

		local.backgroundFiles[id] = {
			lastUsed: dateString,
			position: {
				size: 'cover',
				x: '50%',
				y: '50%',
			},
		}

		filesData[id] = { full, medium, small, thumb, pixels }

		addThumbnailImage(id, filesData[id])
		await idb.set(id, filesData[id])
		storage.local.set(local)
	}

	// 3. Apply background

	const id = newids[0]
	const data = filesData[id]
	const file = local.backgroundFiles[id]
	const image = imageObjectFromStorage(file, data)

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
	const thmbRemove = document.getElementById('b_thumbnail-remove')
	const thmbMove = document.getElementById('b_thumbnail-position')
	const thmbZoom = document.getElementById('b_thumbnail-zoom')

	const thumbs = document.querySelectorAll<HTMLElement>('.thumbnail')
	const thumbIds = Object.values(thumbs).map(el => el.id)
	const fileIds = Object.keys(backgroundFiles) ?? []
	const missingThumbnails = fileIds.filter(id => !thumbIds.includes(id))
	const selected = document.querySelectorAll('.thumbnail.selected').length

	fileIds.length === 0 ? thmbZoom?.setAttribute('disabled', '') : thmbZoom?.removeAttribute('disabled')
	selected === 0 ? thmbRemove?.setAttribute('disabled', '') : thmbRemove?.removeAttribute('disabled')
	selected === 0 ? thmbMove?.setAttribute('disabled', '') : thmbMove?.removeAttribute('disabled')

	if (missingThumbnails.length > 0) {
		for (const id of missingThumbnails) {
			const thumbnail = createThumbnail(id)
			thumbnailsContainer?.appendChild(thumbnail)
		}

		getAllFiles(missingThumbnails).then(files => {
			for (const [id, data] of Object.entries(files)) {
				addThumbnailImage(id, data)
			}
		})
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
	thbimg.addEventListener('click', handleThumbnailClick)

	return thb
}

function addThumbnailImage(id: string, data: LocalFileData): void {
	document.querySelector(`#${id} img`)?.setAttribute('src', URL.createObjectURL(data.small))
	document.getElementById(id)?.classList.remove('loading')
}

async function handleThumbnailClick(this: HTMLImageElement, mouseEvent: MouseEvent) {
	const hasCtrl = mouseEvent.ctrlKey || mouseEvent.metaKey
	const isLeftClick = mouseEvent.button === 0
	const thumbnail = this?.parentElement
	const id = thumbnail?.id ?? ''

	if (isLeftClick && hasCtrl) {
		document.getElementById('b_thumbnail-remove')?.removeAttribute('disabled')
		document.getElementById(id)?.classList?.toggle('selected')
		return
	}

	if (isLeftClick) {
		const data = await getFile(id)
		const local = await storage.local.get()
		const file = local.backgroundFiles[id]

		if (file && data) {
			const image = imageObjectFromStorage(file, data)

			local.backgroundFiles[id].lastUsed = userDate().toString()
			storage.local.set({ backgroundFiles: local.backgroundFiles })

			document.getElementById(id)?.classList?.add('selected')
			handleFilesSettingsOptions(local)
			handleFilesMoveOptions(file)
			applyBackground(image)
		}
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
		const image = imageObjectFromStorage(file, data)
		images.push(image)
	}

	return [keys, images]
}

function imageObjectFromStorage(file: Local.BackgroundFile, data: LocalFileData): Backgrounds.Image {
	return {
		format: 'image',
		size: file.position.size,
		x: file.position.x,
		y: file.position.y,
		urls: {
			full: URL.createObjectURL(data.full),
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

//	Helpers

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
