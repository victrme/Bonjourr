import { applyBackground, removeBackgrounds } from './index'
import { randomString, isEvery } from '../../utils'
import onSettingsLoad from '../../utils/onsettingsload'
import userDate from '../../utils/userdate'
import storage from '../../storage'
import * as idb from 'idb-keyval'

type LocalFileData = {
	file: File
	medium: Blob
	small: Blob
}

type UpdateLocal = {
	settings?: HTMLElement
	refresh?: HTMLSpanElement
	newfile?: FileList | null
	freq?: string
}

let localIsLoading = false

export async function localBackgrounds(init?: Local.Storage, event?: UpdateLocal) {
	// if (event) {
	// 	updateLocalBackgrounds(event)
	// 	return
	// }
	// if (init) {
	// 	onSettingsLoad(() => handleSettingsOptions())
	// }
}

export async function getFilesAsCollection(local: Local.Storage): Promise<[string[], Backgrounds.Image[]]> {
	const idbKeys = (await idb.keys()) as string[]
	const files = controlBackgroundFiles(local, idbKeys)
	const filesData = await getAllFiles(Object.keys(files))
	const entries = Object.entries(files)

	const sorted = entries.toSorted((a, b) => {
		return new Date(a[1].lastUsed).getTime() - new Date(b[1].lastUsed).getTime()
	})

	console.log(sorted.map((entry) => entry[1].lastUsed))

	const images: Backgrounds.Image[] = []
	const keys = sorted.map((entry) => entry[0])

	for (const [key, entry] of sorted) {
		const { file, small } = filesData[key]
		const fullURL = URL.createObjectURL(file)
		const smallURL = URL.createObjectURL(small)

		images.push({
			format: 'image',
			size: entry.position.size,
			x: entry.position.x,
			y: entry.position.y,
			urls: {
				full: fullURL,
				medium: smallURL,
				small: smallURL,
			},
		})
	}

	return [keys, images]
}

function controlBackgroundFiles(local: Local.Storage, idbKeys: string[]): Local.Storage['backgroundFiles'] {
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

//	Settings Options

export async function handleFilesSettingsOptions(local?: Local.Storage) {
	local = local ?? (await storage.local.get('backgroundFiles'))

	const actionButtons = document.getElementById('thumbnail-action-buttons')
	const thmbContainer = document.getElementById('thumbnails-container')!
	const thmbZoom = document.getElementById('b_thumbnail-zoom')

	const thumbs = document.querySelectorAll<HTMLElement>('.thumbnail')
	const thumbIds = Object.values(thumbs).map((el) => el.id)
	const fileIds = Object.keys(local.backgroundFiles) ?? []
	const columnsAmount = Math.min(fileIds.length, 5).toString()
	const missingThumbnailIds = fileIds.filter((id) => !thumbIds.includes(id))

	fileIds.length === 0 ? actionButtons?.classList.remove('shown') : actionButtons?.classList.add('shown')
	fileIds.length === 0 ? thmbZoom?.setAttribute('disabled', '') : thmbZoom?.removeAttribute('disabled')

	addThumbnailsToDom(missingThumbnailIds, '')
	thmbContainer.style.setProperty('--thumbnails-columns', columnsAmount)
}

async function handleBackgroundMoveOptions(file: Local.BackgroundFile) {
	const backgroundSize = document.querySelector<HTMLInputElement>('#i_background-size')!
	const backgroundVertical = document.querySelector<HTMLInputElement>('#i_background-vertical')!
	const backgroundHorizontal = document.querySelector<HTMLInputElement>('#i_background-horizontal')!

	backgroundSize.value = (file.position.size === 'cover' ? '100' : file.position.size).replace('%', '')
	backgroundVertical.value = file.position.y.replace('%', '')
	backgroundHorizontal.value = file.position.x.replace('%', '')
}

//	Thumbnail events

export function initThumbnailEvents() {
	document.getElementById('b_thumbnail-remove')?.onclickdown(thumbnailRemove)
	document.getElementById('b_thumbnail-zoom')?.onclickdown(thumbnailGridZoom)
	document.getElementById('b_thumbnail-position')?.onclickdown(thumbnailTogglePosition)
	document.getElementById('i_background-size')?.addEventListener('input', thumbnailPosition)
	document.getElementById('i_background-vertical')?.addEventListener('input', thumbnailPosition)
	document.getElementById('i_background-horizontal')?.addEventListener('input', thumbnailPosition)
}

function thumbnailGridZoom() {
	const container = document.getElementById('thumbnails-container')!
	const currentZoom = window.getComputedStyle(container).getPropertyValue('--thumbnails-columns')
	const newZoom = Math.max((Number.parseInt(currentZoom) + 1) % 6, 1)
	container.style.setProperty('--thumbnails-columns', newZoom.toString())
}

function thumbnailTogglePosition() {
	const domoptions = document.getElementById('background-position-options')
	domoptions?.classList.toggle('shown')
}

async function thumbnailPosition(this: HTMLInputElement) {
	const img = document.querySelector<HTMLElement>('#image-background-wrapper div')
	const selection = getThumbnailSelection()[0]
	const fileData = await getFile(selection)
	const { id, value } = this

	if (!img) {
		console.log(new Error('?'))
		return
	}

	if (id === 'i_background-size') {
		fileData.position.size = value === '100' ? 'cover' : `${value}%`
		img.style.backgroundSize = fileData.position.size
	}

	if (id === 'i_background-vertical') {
		fileData.position.y = `${value}%`
		img.style.backgroundPositionY = fileData.position.y
	}

	if (id === 'i_background-horizontal') {
		fileData.position.x = `${value}%`
		img.style.backgroundPositionX = fileData.position.x
	}

	await idb.set(selection, fileData)
}

async function thumbnailRemove(event: Event) {
	const local = await storage.local.get()
	const thumbnail = document.querySelector<HTMLElement>('.thumbnail.selected')
	const id = getThumbnailSelection()[0]

	if (localIsLoading || !thumbnail || !id || !local.backgroundFiles) {
		return
	}

	idb.del(id)
	delete local.backgroundFiles[id]
	storage.local.set(local)

	const collection = await getFilesAsCollection(local)

	if (collection[0]) {
		applyBackground({ image: collection[0] })
	} else {
		removeBackgrounds()
	}

	thumbnail.classList.toggle('hiding', true)

	setTimeout(() => {
		thumbnail.remove()
		handleSettingsOptions(local)
	}, 100)
}

function getThumbnailSelection(): string[] {
	const thmbs = document.querySelectorAll<HTMLElement>('.thumbnail.selected')
	const ids = Object.values(thmbs).map((thmb) => thmb?.id ?? '')
	return ids
}

//	Update

export async function updateLocalBackgrounds(update: UpdateLocal) {
	const sync = await storage.sync.get('backgrounds')
	const local = await storage.local.get()

	if (update.newfile) {
		addNewImage(update.newfile, local)
	}

	if (update.refresh) {
		refreshCustom(update.refresh)
	}

	if (isEvery(update.freq)) {
		sync.backgrounds.frequency = update.freq
		storage.sync.set({ backgrounds: sync.backgrounds })
	}
}

async function addNewImage(filelist: FileList, local: Local.Storage) {
	localIsLoading = true

	const isoString = userDate().toString()
	const thumbnailsContainer = document.getElementById('thumbnails-container')
	const filesData: Record<string, LocalFileData> = {}
	const newIds: string[] = []

	for (const file of filelist) {
		const id = randomString(8)
		newIds.push(id)

		const medium = await compressThumbnail(file, 300)
		const small = await compressThumbnail(file, 40)

		filesData[id] = {
			file: file,
			small: small,
			medium: medium,
		}

		local.backgroundFiles[id] = {
			lastUsed: isoString,
			position: {
				size: 'cover',
				x: '50%',
				y: '50%',
			},
		}

		thumbnailsContainer?.appendChild(createThumbnail(medium, id, false))

		await idb.set(id, filesData[id])
	}

	localIsLoading = false

	displayCustomBackground(Object.values(filesData)[0])
	// handleSettingsOptions(local)
	storage.local.set(local)
}

function refreshCustom(button: HTMLSpanElement) {
	storage.local.get().then((local) => {
		local.backgroundLastChange = userDate().toString()
		storage.local.set(local)

		localBackgrounds()
		// turnRefreshButton(button, true)
	})
}

//	Background & Thumbnails

async function displayCustomBackground(data?: LocalFileData) {
	if (data?.file) {
		const url = URL.createObjectURL(data.file)

		applyBackground({
			image: {
				format: 'image',
				urls: {
					full: url,
					medium: url,
					small: url,
				},
			},
		})

		document.getElementById('credit-container')?.classList.remove('shown')
		localIsLoading = false
	}
}

function selectThumbnail(id: string) {
	document.querySelector('.thumbnail.selected')?.classList.remove('selected')
	document.getElementById(id)?.classList?.add('selected')
}

async function compressThumbnail(blob: Blob, size: number) {
	const blobURL = window.URL.createObjectURL(blob)
	const canvas = document.createElement('canvas')
	const ctx = canvas.getContext('2d')
	const img = new Image()

	img.src = blobURL

	await new Promise((resolve) => {
		img.onload = () => {
			const orientation = img.height > img.width ? 'portrait' : 'landscape'
			let ratio = 0
			let x = 0
			let y = 0

			if (orientation === 'landscape') {
				ratio = size / img.height
				canvas.height = y = size
				canvas.width = x = img.width * ratio
			}

			if (orientation === 'portrait') {
				ratio = size / img.width
				canvas.height = y = img.height * ratio
				canvas.width = x = size
			}

			ctx?.drawImage(img, 0, 0, x, y)
			resolve(true)
		}
	})

	const newBlob = await new Promise((resolve) => ctx?.canvas.toBlob(resolve, 'image/png'))

	return newBlob as Blob
}

function createThumbnail(blob: Blob | undefined, id: string, isSelected: boolean): HTMLButtonElement {
	const thb = document.createElement('button')
	const thbimg = document.createElement('img')

	if (!blob) {
		return thb
	}

	thb.id = id
	thbimg.src = URL.createObjectURL(blob)
	thb.className = 'thumbnail' + (isSelected ? ' selected' : '')

	thb.setAttribute('aria-label', 'Select this background')

	thbimg.setAttribute('alt', '')
	thbimg.setAttribute('draggable', 'false')

	thb.appendChild(thbimg)

	thbimg.onclickdown((e, target) => {
		const isLeftClick = (e as MouseEvent).button === 0

		if (isLeftClick && !localIsLoading) {
			const thumbnail = target?.parentElement
			const id = thumbnail?.id ?? ''
			applyThumbnailBackground(id)
			handleBackgroundMoveOptions(id)
		}
	})

	return thb
}

async function applyThumbnailBackground(id: string, local?: Local.Storage) {
	local = local ?? (await storage.local.get())
	const notAlreadySelected = id

	if (notAlreadySelected && local.backgroundFiles) {
		localIsLoading = false
		storage.local.set(local)
	}
}

async function addThumbnailsToDom(ids: string[], selected?: string) {
	const thumbnailsContainer = document.getElementById('thumbnails-container') as HTMLElement
	const fragment = document.createDocumentFragment()
	const idsToAdd = ids.filter((id) => !document.getElementById(id))

	for (const id of idsToAdd) {
		const isSelected = id === selected
		const blob = (await getFile(id))?.small
		fragment.appendChild(createThumbnail(blob, id, isSelected))
	}

	thumbnailsContainer.appendChild(fragment)
}

//	idb

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
