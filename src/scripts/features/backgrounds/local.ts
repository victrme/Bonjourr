import { randomString, turnRefreshButton, freqControl, isEvery } from '../../utils'
import { applyBackground } from './index'
import onSettingsLoad from '../../utils/onsettingsload'
import storage from '../../storage'
import * as idb from 'idb-keyval'

type LocalFileData = {
	file: File
	small: Blob
	position: {
		zoom: string
		x: string
		y: string
	}
}

type UpdateLocal = {
	settings?: HTMLElement
	refresh?: HTMLSpanElement
	newfile?: FileList | null
	freq?: string
	showing?: string
}

let localIsLoading = false

export default async function localBackgrounds(init?: Local.Storage, event?: UpdateLocal) {
	if (event) {
		updateLocalBackgrounds(event)
		return
	}

	if (init) {
		initLocalBackgrounds(init)
	}
}

async function initLocalBackgrounds(local: Local.Storage) {
	const sync = await storage.sync.get()

	if (!local.localFiles) {
		local.localFiles = { ids: [], selected: '' }
	}

	const { ids, selected } = local.localFiles
	const lastChange = local?.backgroundLastChange ?? ''
	const freq = sync.backgrounds.frequency
	const last = new Date(lastChange).getTime()
	const needNewImage = freqControl.get(freq, last) && ids.length > 1

	if (ids.length === 0) {
		// ?
		return
	}

	if (needNewImage) {
		const idsNoSelection = ids.filter((l: string) => !l.includes(selected))
		const randomId = Math.floor(Math.random() * idsNoSelection.length)

		local.localFiles.selected = idsNoSelection[randomId]
		local.backgroundLastChange = new Date().toISOString()

		storage.local.set(local)
	}

	displayCustomBackground(await getFile(local.localFiles.selected))
	onSettingsLoad(() => handleSettingsOptions())
}

//
//	Settings Options
//

async function handleSettingsOptions() {
	const local = await storage.local.get('localFiles')
	const thumbs = document.querySelectorAll<HTMLElement>('.thumbnail')
	const thumbIds = Object.values(thumbs).map((el) => el.id)
	let ids = local.localFiles?.ids ?? []

	if (ids.length > 9) {
		ids = ids.slice(0, 9)
		document.getElementById('thumbnail-show-buttons')?.classList.add('shown')
	}

	if (thumbIds.length > 0) {
		ids = ids.filter((id) => thumbIds.includes(id) === false)
	}

	// <!> must stay at the end (ids mutation)
	addThumbnailsToDom(ids, local.localFiles?.selected)

	document.getElementById('thumbnail-remove')?.onclickdown(thumbnailRemove)
	document.getElementById('thumbnail-zoom')?.onclickdown(thumbnailGridZoom)
	document.getElementById('thumbnail-position')?.onclickdown(thumbnailTogglePosition)
	document.getElementById('i_background-zoom')?.addEventListener('input', thumbnailPosition)
	document.getElementById('i_background-vertical')?.addEventListener('input', thumbnailPosition)
	document.getElementById('i_background-horizontal')?.addEventListener('input', thumbnailPosition)
}

function thumbnailGridZoom() {
	const container = document.getElementById('thumbnails-container')!
	const currentZoom = window.getComputedStyle(container).getPropertyValue('--thumbnails-columns')
	const newZoom = Math.max((parseInt(currentZoom) + 1) % 6, 2)
	container.style.setProperty('--thumbnails-columns', newZoom.toString())
}

function thumbnailTogglePosition() {
	const domoptions = document.getElementById('background-position-options')
	domoptions?.classList.toggle('shown')
}

function thumbnailPosition(this: HTMLInputElement) {
	const wrapper = document.getElementById('image-background-wrapper')
	const { id, value } = this

	if (!wrapper) {
		console.log(new Error('?'))
		return
	}

	if (id === 'i_background-zoom') {
		wrapper.style.setProperty('--background-zoom', value === '100' ? 'cover' : `${value}%`)
	}
	if (id === 'i_background-vertical') {
		wrapper.style.setProperty('--background-position-y', `${value}%`)
	}
	if (id === 'i_background-horizontal') {
		wrapper.style.setProperty('--background-position-x', `${value}%`)
	}
}

async function thumbnailRemove(event: Event) {
	const local = await storage.local.get()
	const thumbnail = document.querySelector<HTMLElement>('.thumbnail.selected')
	const id = thumbnail?.id ?? ''

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
		// Show black screen
	}

	thumbnail.classList.toggle('hiding', true)
	setTimeout(() => thumbnail.remove(), 100)
}

//
//	Update
//

async function updateLocalBackgrounds(event: UpdateLocal) {
	const sync = await storage.sync.get('backgrounds')
	const local = await storage.local.get()

	if (event?.newfile) {
		addNewImage(event.newfile, local)
	}

	if (event?.refresh) {
		refreshCustom(event.refresh)
	}

	if (event?.showing) {
		updateThumbnailAmount(event.showing)
	}

	if (isEvery(event?.freq)) {
		// localImages.update({ freq: event?.freq })
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
			position: { zoom: 'cover', x: '50', y: '50' },
		}

		thumbnailsContainer?.appendChild(createThumbnail(small, id, false))

		await idb.set(id, filesData[id])
	}

	localIsLoading = false

	displayCustomBackground(filesData[local.localFiles.selected])
	selectThumbnail(local.localFiles.selected)

	local.localFiles.ids = local.localFiles.ids.concat(newIds)
	storage.local.set(local)
}

function refreshCustom(button: HTMLSpanElement) {
	// localImages.update({ last: 0 })
	// turnRefreshButton(button, true)
	// setTimeout(() => localBackgrounds(), 100)
}

async function updateThumbnailAmount(showing?: string) {
	// const thumbnailsContainer = document.getElementById('thumbnails-container') as HTMLElement
	// const thumbsAmount = thumbnailsContainer?.childElementCount || 0
	// const images = await localImages.get()
	// const ids: string[] = []
	// if (showing === 'all') ids.push(...images.ids)
	// if (showing === 'more') ids.push(...images.ids.filter((_, i) => i < thumbsAmount + 9))
	// if (ids.length === images.ids.length) {
	// 	document.getElementById('thumbnail-show-buttons')?.classList.remove('shown')
	// }
	// addThumbnailsToDom(ids, images.selected)
}

//
//	Background & Thumbnails
//

async function displayCustomBackground(data?: LocalFileData) {
	if (data?.file) {
		applyBackground({ image: { url: URL.createObjectURL(data.file), page: '', username: '' } })
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
			const height = 300 * window.devicePixelRatio
			const scaleFactor = height / img.height

			canvas.width = img.width * scaleFactor
			canvas.height = height

			ctx?.drawImage(img, 0, 0, img.width * scaleFactor, height)
			resolve(true)
		}
	})

	const newBlob = await new Promise((resolve) => ctx?.canvas.toBlob(resolve, 'image/webp', 80))

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

	thbimg.onclickdown(function (e, target) {
		const isLeftClick = (e as MouseEvent).button === 0

		if (isLeftClick && !localIsLoading) {
			const thumbnail = target?.parentElement
			const id = thumbnail?.id ?? ''
			applyThumbnailBackground(id)
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
