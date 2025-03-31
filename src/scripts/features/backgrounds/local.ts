import { applyBackground, removeBackgrounds } from './index'
import { userDate } from '../../shared/time'
import { hashcode } from '../../utils/hash'
import { isEvery } from '../../shared/assert'
import { storage } from '../../storage'
import * as idb from 'idb-keyval'

type LocalFileData = {
	full: Blob
	medium: Blob
	small: Blob
}

type UpdateLocal = {
	settings?: HTMLElement
	newfile?: FileList | null
	freq?: string
}

let localIsLoading = false

export async function getFilesAsCollection(local: Local.Storage): Promise<[string[], Backgrounds.Image[]]> {
	const idbKeys = (await idb.keys()) as string[]
	const files = controlBackgroundFiles(local, idbKeys)
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
	const backgroundFiles = local?.backgroundFiles ?? (await storage.local.get('backgroundFiles'))?.backgroundFiles

	const thmbRemove = document.getElementById('b_thumbnail-remove')
	const thmbMove = document.getElementById('b_thumbnail-position')
	const thmbZoom = document.getElementById('b_thumbnail-zoom')

	const thumbs = document.querySelectorAll<HTMLElement>('.thumbnail')
	const thumbIds = Object.values(thumbs).map(el => el.id)
	const fileIds = Object.keys(backgroundFiles) ?? []
	const missingThumbnailIds = fileIds.filter(id => !thumbIds.includes(id))
	const selected = document.querySelectorAll('.thumbnail.selected').length

	fileIds.length === 0 ? thmbZoom?.setAttribute('disabled', '') : thmbZoom?.removeAttribute('disabled')
	selected === 0 ? thmbRemove?.setAttribute('disabled', '') : thmbRemove?.removeAttribute('disabled')
	selected === 0 ? thmbMove?.setAttribute('disabled', '') : thmbMove?.removeAttribute('disabled')

	addThumbnailsToDom(missingThumbnailIds, '')
}

function handleBackgroundMoveOptions(file: Local.BackgroundFile) {
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
	const container = document.getElementById('thumbnails-container')

	if (container) {
		const currentZoom = window.getComputedStyle(container).getPropertyValue('--thumbnails-columns')
		const newZoom = Math.max((Number.parseInt(currentZoom) + 1) % 6, 1)
		container.style.setProperty('--thumbnails-columns', newZoom.toString())
	}
}

function thumbnailTogglePosition() {
	const domoptions = document.getElementById('background-position-options')
	domoptions?.classList.toggle('shown')
}

async function thumbnailPosition(this: HTMLInputElement) {
	const img = document.querySelector<HTMLElement>('#background-media div')
	const selection = getThumbnailSelection()[0]
	const local = await storage.local.get('backgroundFiles')
	const file = local.backgroundFiles[selection]
	const { id, value } = this

	if (!(img && file)) {
		return
	}

	if (id === 'i_background-size') {
		file.position.size = value === '100' ? 'cover' : `${value}%`
		img.style.backgroundSize = file.position.size
	}

	if (id === 'i_background-vertical') {
		file.position.y = `${value}%`
		img.style.backgroundPositionY = file.position.y
	}

	if (id === 'i_background-horizontal') {
		file.position.x = `${value}%`
		img.style.backgroundPositionX = file.position.x
	}

	local.backgroundFiles[selection] = file
	storage.local.set({ backgroundFiles: local.backgroundFiles })
}

async function thumbnailRemove(_e: Event) {
	const local = await storage.local.get()
	const ids = getThumbnailSelection()

	if (localIsLoading || ids.length === 0 || !local.backgroundFiles) {
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

function getThumbnailSelection(): string[] {
	const thmbs = document.querySelectorAll<HTMLElement>('.thumbnail.selected')
	const ids = Object.values(thmbs).map(thmb => thmb?.id ?? '')
	return ids
}

//	Update

export async function updateLocalBackgrounds(update: UpdateLocal) {
	const sync = await storage.sync.get('backgrounds')
	const local = await storage.local.get()

	if (update.newfile) {
		addNewImage(update.newfile, local)
	}

	if (isEvery(update.freq)) {
		sync.backgrounds.frequency = update.freq
		storage.sync.set({ backgrounds: sync.backgrounds })
	}
}

async function addNewImage(filelist: FileList, local: Local.Storage) {
	localIsLoading = true

	const dateString = userDate().toString()
	const thumbnailsContainer = document.getElementById('thumbnails-container')
	const filesData: Record<string, LocalFileData> = {}
	const newIds: string[] = []
	let id = ''

	for (const file of filelist) {
		const infosString = file.size.toString() + file.name + file.lastModified.toString()
		const hashString = hashcode(infosString).toString()

		if (Object.keys(local.backgroundFiles).includes(hashString)) {
			return
		}

		id = hashString
		newIds.push(id)

		const isLandscape = window.screen.orientation.type === 'landscape-primary'
		const sanePixelRatio = window.devicePixelRatio * 0.5
		const fullSize = (isLandscape ? window.screen.width : window.screen.height) * sanePixelRatio
		const isFileSmaller = file.size < fullSize ** 2

		const full = isFileSmaller ? (file as Blob) : await compressMedia(file, fullSize)
		const small = await compressMedia(file, 40)
		const medium = await compressMedia(file, 300)

		filesData[id] = {
			full: full,
			small: small,
			medium: medium,
		}

		local.backgroundFiles[id] = {
			lastUsed: dateString,
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

	const image: Backgrounds.Image = {
		format: 'image',
		urls: {
			full: URL.createObjectURL(filesData[id].full),
			medium: URL.createObjectURL(filesData[id].medium),
			small: URL.createObjectURL(filesData[id].small),
		},
	}

	applyBackground(image)
	handleFilesSettingsOptions(local)
	storage.local.set(local)

	if (thumbnailsContainer) {
		const ids = Object.keys(local.backgroundFiles)
		const columnsAmount = Math.min(ids.length, 5).toString()
		thumbnailsContainer.style.setProperty('--thumbnails-columns', columnsAmount)
	}
}

//	Background & Thumbnails

function selectThumbnail(id: string) {
	document.querySelector('.thumbnail.selected')?.classList.remove('selected')
	document.getElementById(id)?.classList?.add('selected')
}

async function compressMedia(blob: Blob, size: number) {
	const blobUrl = window.URL.createObjectURL(blob)
	const canvas = document.createElement('canvas')
	const ctx = canvas.getContext('2d')
	const img = new Image()

	img.src = blobUrl

	await new Promise(resolve => {
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

	const newBlob = await new Promise(resolve => ctx?.canvas.toBlob(resolve, 'image/png'))

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
	thb.className = `thumbnail${isSelected ? ' selected' : ''}`
	thbimg.setAttribute('alt', '')
	thbimg.setAttribute('draggable', 'false')
	thb.setAttribute('aria-label', 'Select this background')

	thb.appendChild(thbimg)

	thbimg.onclickdown(async (e, target) => {
		const mouseEvent = e as MouseEvent
		const hasCtrl = mouseEvent.ctrlKey || mouseEvent.metaKey
		const isLeftClick = mouseEvent.button === 0

		if (isLeftClick && hasCtrl) {
			document.getElementById(id)?.classList?.toggle('selected')
			return
		}

		if (isLeftClick && !localIsLoading) {
			const local = await storage.local.get()
			const thumbnail = target?.parentElement
			const id = thumbnail?.id ?? ''
			const file = local.backgroundFiles[id]
			const data = await getFile(id)

			if (file && data) {
				applyBackground(imageObjectFromStorage(file, data))
			}

			selectThumbnail(id)
			applyThumbnailBackground(id)
			handleBackgroundMoveOptions(file)
			handleFilesSettingsOptions()
		}
	})

	return thb
}

async function applyThumbnailBackground(id: string, local?: Local.Storage) {
	const { backgroundFiles } = local ?? (await storage.local.get('backgroundFiles'))
	const notAlreadySelected = id

	if (notAlreadySelected && backgroundFiles) {
		localIsLoading = false
		storage.local.set({ backgroundFiles })
	}
}

async function addThumbnailsToDom(ids: string[], selected?: string) {
	const thumbnailsContainer = document.getElementById('thumbnails-container') as HTMLElement
	const fragment = document.createDocumentFragment()
	const idsToAdd = ids.filter(id => !document.getElementById(id))

	for (const id of idsToAdd) {
		const isSelected = id === selected
		const blob = (await getFile(id))?.medium
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
