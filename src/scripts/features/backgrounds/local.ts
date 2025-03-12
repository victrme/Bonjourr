import { randomString, freqControl, isEvery } from '../../utils'
import { applyBackground, removeBackgrounds } from './index'
import onSettingsLoad from '../../utils/onsettingsload'
import userDate from '../../utils/userdate'
import storage from '../../storage'
import * as idb from 'idb-keyval'
import { IS_MOBILE } from '../../defaults'

type LocalFileData = {
	file: File
	small: Blob
	position: {
		size: string
		x: string
		y: string
	}
}

type UpdateLocal = {
	settings?: HTMLElement
	refresh?: HTMLSpanElement
	newfile?: FileList | null
	freq?: string
}

let localIsLoading = false

export default async function localBackgrounds(init?: Local.Storage, event?: UpdateLocal) {
	if (event) {
		updateLocalBackgrounds(event)
		return
	}

	if (init) {
		initLocalBackgrounds(init)
		onSettingsLoad(() => handleSettingsOptions())
	}
}

async function initLocalBackgrounds(local: Local.Storage) {
	const idbKeys = (await idb.keys()).map((key) => key.toString())
	const localFiles = controlLocalFiles(local, idbKeys)
	const sync = await storage.sync.get('frequency')

	if (!localFiles) {
		return
	}

	const lastChange = local?.backgroundLastChange ?? ''
	const freq = sync.backgrounds.frequency
	const last = new Date(lastChange).getTime()
	const hasMultipleImages = localFiles.ids.length > 1
	const needNewImage = freqControl.get(freq, last)

	if (needNewImage && hasMultipleImages) {
		const idsNoSelection = localFiles.ids.filter((l) => !l.includes(localFiles.selected))
		const randomId = Math.floor(Math.random() * idsNoSelection.length)
		const newSelection = idsNoSelection[randomId]

		localFiles.selected = newSelection

		storage.local.set({
			localFiles: localFiles,
			backgroundLastChange: new Date().toISOString(),
		})
	}

	if (local.localFiles?.selected) {
		displayCustomBackground(await getFile(local.localFiles.selected))
	} else {
		removeBackgrounds()
	}
}

function controlLocalFiles(local: Local.Storage, idbKeys: string[]): Local.Storage['localFiles'] {
	const localFiles = local.localFiles ?? { ids: [], selected: '' }
	const idsAreAllInDB = localFiles.ids.every((id) => idbKeys.includes(id))

	if (idsAreAllInDB === false) {
		localFiles.ids = idbKeys
		localFiles.selected = idbKeys[0]
		storage.local.set({ localFiles })
	}

	return localFiles
}

//	Settings Options

async function handleSettingsOptions(local?: Local.Storage) {
	local = local ?? (await storage.local.get('localFiles'))

	const actionButtons = document.getElementById('thumbnail-action-buttons')
	const thmbContainer = document.getElementById('thumbnails-container')!
	const thmbZoom = document.getElementById('b_thumbnail-zoom')

	const thumbs = document.querySelectorAll<HTMLElement>('.thumbnail')
	const thumbIds = Object.values(thumbs).map((el) => el.id)
	const fileIds = local.localFiles?.ids ?? []
	const columnsAmount = Math.min(fileIds.length, 5).toString()
	const missingThumbnailIds = fileIds.filter((id) => !thumbIds.includes(id))
	const selected = local.localFiles?.selected ?? ''

	fileIds.length === 0 ? actionButtons?.classList.remove('shown') : actionButtons?.classList.add('shown')
	fileIds.length === 0 ? thmbZoom?.setAttribute('disabled', '') : thmbZoom?.removeAttribute('disabled')

	handleBackgroundMoveOptions(selected)
	addThumbnailsToDom(missingThumbnailIds, selected)
	thmbContainer.style.setProperty('--thumbnails-columns', columnsAmount)
}

async function handleBackgroundMoveOptions(selection: string) {
	const backgroundSize = document.querySelector<HTMLInputElement>('#i_background-size')!
	const backgroundVertical = document.querySelector<HTMLInputElement>('#i_background-vertical')!
	const backgroundHorizontal = document.querySelector<HTMLInputElement>('#i_background-horizontal')!
	const position = (await getFile(selection))?.position ?? { zoom: 'cover', x: '50%', y: '50%' }

	backgroundSize.value = (position.size === 'cover' ? '100' : position.size).replace('%', '')
	backgroundVertical.value = position.y.replace('%', '')
	backgroundHorizontal.value = position.x.replace('%', '')
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

	if (localIsLoading || !thumbnail || !id || !local.localFiles) {
		return
	}

	const newIdList = local.localFiles.ids.filter((s) => !s.includes(id))
	const currIndex = local.localFiles.ids.indexOf(id)
	const newIndex = Math.min(currIndex, newIdList.length - 1)
	const newId = newIdList[newIndex] ?? ''

	local.localFiles.ids = newIdList
	local.localFiles.selected = newId

	storage.local.set(local)
	idb.del(id)

	if (newId) {
		displayCustomBackground(await getFile(newId))
		selectThumbnail(newId)
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

async function updateLocalBackgrounds(update: UpdateLocal) {
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
	local.localFiles = local.localFiles ?? { ids: [], selected: '' }
	localIsLoading = true

	const thumbnailsContainer = document.getElementById('thumbnails-container')
	const filesData: Record<string, LocalFileData> = {}
	const newIds: string[] = []

	for (const file of filelist) {
		const id = randomString(8)
		local.localFiles.selected = id
		newIds.push(id)

		const small = await compressThumbnail(file)

		filesData[id] = {
			file: file,
			small: small,
			position: { size: 'cover', x: '50%', y: '50%' },
		}

		thumbnailsContainer?.appendChild(createThumbnail(small, id, false))

		await idb.set(id, filesData[id])
	}

	localIsLoading = false

	displayCustomBackground(filesData[local.localFiles.selected])
	selectThumbnail(local.localFiles.selected)

	local.localFiles.ids = local.localFiles.ids.concat(newIds)
	storage.local.set(local)
	handleSettingsOptions(local)
}

function refreshCustom(button: HTMLSpanElement) {
	storage.local.get().then((local) => {
		local.backgroundLastChange = userDate().toISOString()
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
				page: '',
				username: '',
				urls: {
					full: url,
					medium: url,
					small: url,
				},
			},
			position: data.position,
		})

		document.getElementById('credit-container')?.classList.remove('shown')
		localIsLoading = false
	}
}

function selectThumbnail(id: string) {
	document.querySelector('.thumbnail.selected')?.classList.remove('selected')
	document.getElementById(id)?.classList?.add('selected')
}

async function compressThumbnail(blob: Blob) {
	const blobURL = window.URL.createObjectURL(blob)
	const canvas = document.createElement('canvas')
	const ctx = canvas.getContext('2d')
	const img = new Image()

	img.src = blobURL

	await new Promise((resolve) => {
		img.onload = () => {
			const size = 20
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
	const notAlreadySelected = id && id !== local.localFiles?.selected

	if (notAlreadySelected && local.localFiles) {
		localIsLoading = false
		local.localFiles.selected = id

		storage.local.set(local)

		selectThumbnail(id)
		displayCustomBackground(await getFile(id))
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

async function getFile(id: string): Promise<LocalFileData> {
	return (await idb.get(id)) as LocalFileData
}
