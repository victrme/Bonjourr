import { randomString, turnRefreshButton, freqControl, isEvery } from '../../utils'
import unsplashBackgrounds from './unsplash'
import { imgBackground } from '.'
import onSettingsLoad from '../../utils/onsettingsload'
import { IS_MOBILE } from '../../defaults'
import errorMessage from '../../utils/errormessage'
import storage from '../../storage'
import * as idb from 'idb-keyval'

type LocalImages = {
	ids: string[]
	last: number
	selected: string
	freq: Frequency
}

type Blobs = {
	background: Blob
	thumbnail: Blob
}

type UpdateLocal = {
	settings?: HTMLElement
	refresh?: HTMLSpanElement
	newfile?: FileList | null
	freq?: string
	showing?: string
}

const localImages = localImagesStorage()
let localIsLoading = false

export default async function localBackgrounds(event?: UpdateLocal) {
	if (event) {
		updateLocalBackgrounds(event)
		return
	}

	try {
		initLocalBackgrounds()
	} catch (error) {
		errorMessage(error)
	}
}

async function initLocalBackgrounds() {
	let { ids, selected, freq, last } = await localImages.get()
	const needNewImage = freqControl.get(freq, last) && ids.length > 1

	if (ids.length === 0) {
		const data = await storage.sync.get('unsplash')
		const local = await storage.local.get('unsplashCache')
		unsplashBackgrounds({ unsplash: data.unsplash, cache: local.unsplashCache })
		return
	}

	if (needNewImage) {
		const idsNoSelection = ids.filter((l: string) => !l.includes(selected))
		const randomId = Math.floor(Math.random() * idsNoSelection.length)
		selected = idsNoSelection[randomId]
		localImages.update({ selected, last: freqControl.set() })
	}

	displayCustomBackground(await getBlob(selected, 'background'))
	onSettingsLoad(() => initSettingsOptions())
}

async function initSettingsOptions() {
	const loadedThumbIds = [...document.querySelectorAll<Element>('.thumbnail')].map((el) => el.id)
	const i_freq = document.getElementById('i_freq') as HTMLSelectElement
	const images = await localImages.get()
	let ids = images.ids

	addThumbnailsToDom(ids, images.selected)

	if (i_freq) {
		i_freq.value = images.freq
	}

	if (IS_MOBILE && ids.length > 9) {
		ids = ids.slice(0, 9)
		document.getElementById('thumbnail-show-buttons')?.classList.add('shown')
	}

	if (loadedThumbIds.length > 0) {
		ids = ids.filter((id) => loadedThumbIds.includes(id) === false)
	}
}

//
//	Update
//

async function updateLocalBackgrounds(event: UpdateLocal) {
	if (event?.newfile) {
		addNewImage(event.newfile)
	}

	if (event?.refresh) {
		refreshCustom(event.refresh)
	}

	if (event?.showing) {
		updateThumbnailAmount(event.showing)
	}

	if (isEvery(event?.freq)) {
		localImages.update({ freq: event?.freq })
	}
}

async function addNewImage(filelist: FileList) {
	let { ids, selected } = await localImages.get()
	let blobs: { [key: string]: Blobs } = {}
	let newIds: string[] = []

	localIsLoading = true

	// change type si premier local
	if (ids.length === 0) {
		storage.sync.set({ background_type: 'local' })
	}

	for (const file of filelist) {
		const id = randomString(8)
		newIds.push(id)
		selected = id

		const thumbnail = await compressThumbnail(file)

		blobs[id] = {
			thumbnail: thumbnail,
			background: file,
		}

		addThumbnailsToDom(ids, id)
		await idb.set(id, blobs[id])
	}

	localImages.update({ ids: ids.concat(newIds), selected })
	localIsLoading = false

	displayCustomBackground(blobs[selected].background)
	selectThumbnail(selected)
}

async function refreshCustom(button: HTMLSpanElement) {
	localImages.update({ last: 0 })
	turnRefreshButton(button, true)
	setTimeout(() => localBackgrounds(), 100)
}

async function updateThumbnailAmount(showing?: string) {
	const fileContainer = document.getElementById('fileContainer') as HTMLElement
	const thumbsAmount = fileContainer?.childElementCount || 0
	const images = await localImages.get()
	const ids: string[] = []

	if (showing === 'all') ids.push(...images.ids)
	if (showing === 'more') ids.push(...images.ids.filter((_, i) => i < thumbsAmount + 9))

	if (ids.length === images.ids.length) {
		document.getElementById('thumbnail-show-buttons')?.classList.remove('shown')
	}

	addThumbnailsToDom(ids, images.selected)
}

//
//	Background & Thumbnails
//

async function displayCustomBackground(blob?: Blob) {
	if (blob) {
		imgBackground(URL.createObjectURL(blob))
		document.getElementById('creditContainer')?.classList.remove('shown')
		localIsLoading = false
	}
}

function selectThumbnail(id: string) {
	document.querySelector('.thumbnail.selected')?.classList.remove('selected')
	document.getElementById(id)?.classList?.add('selected')
}

async function getBlob(id: string, which: 'background' | 'thumbnail') {
	const blobs = await idb.get(id)
	return blobs ? (blobs[which] as Blob) : undefined
}

async function compressThumbnail(blob: Blob) {
	const blobURL = window.URL.createObjectURL(blob)
	const canvas = document.createElement('canvas')
	const ctx = canvas.getContext('2d')
	const img = new Image()

	img.src = blobURL

	await new Promise((resolve) => {
		img.onload = () => {
			// canvas proportionné à l'image
			// rétréci suivant le taux de compression
			// si thumbnail, toujours 140px
			const height = 140 * window.devicePixelRatio
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
	const rem = document.createElement('button')
	const thbimg = document.createElement('img')
	const remspan = document.createElement('span')

	if (!blob) {
		return thb
	}

	thb.id = id
	thbimg.src = URL.createObjectURL(blob)
	thb.className = 'thumbnail' + (isSelected ? ' selected' : '')

	rem.classList.toggle('b_removethumb', true)
	rem.classList.toggle('hidden', !IS_MOBILE)

	thb.setAttribute('aria-label', 'Select this background')
	rem.setAttribute('aria-label', 'Remove this background')

	thbimg.setAttribute('alt', '')
	thbimg.setAttribute('draggable', 'false')

	remspan.textContent = '✕'
	rem.appendChild(remspan)

	thb.appendChild(thbimg)
	thb.appendChild(rem)

	thbimg.addEventListener('click', applyThisBackground)
	rem.addEventListener('click', deleteThisBackground)

	async function applyThisBackground(this: HTMLImageElement, e: MouseEvent) {
		if (e.button !== 0 || localIsLoading) return

		const userImages = await localImages.get()
		const thumbnail = this?.parentElement
		const id = thumbnail?.id
		const notAlreadySelected = id && id !== userImages.selected

		if (notAlreadySelected) {
			localIsLoading = false
			localImages.update({ selected: id })

			selectThumbnail(id)
			displayCustomBackground(await getBlob(id, 'background'))
		}
	}

	async function deleteThisBackground(this: HTMLButtonElement, e: MouseEvent) {
		if (e.button !== 0 || localIsLoading || !e.target) return

		let { ids, selected } = await localImages.get()
		const thumbnail = this?.parentElement
		const id = thumbnail?.id

		if (id) {
			thumbnail?.classList.toggle('hiding', true)
			setTimeout(() => thumbnail?.remove(), 100)

			// Pop background from list
			ids = ids.filter((s) => !s.includes(id))
			localImages.update({ ids })

			idb.del(id)
		}

		if (id !== selected) {
			return
		}

		// Draw new image if displayed is removed to another custom
		if (ids.length > 0) {
			selected = ids[0]
			localImages.update({ selected })

			const blob = await getBlob(selected, 'background')

			selectThumbnail(selected)
			displayCustomBackground(blob)
			return
		}

		// back to unsplash
		storage.sync.set({ background_type: 'unsplash' })
		localImages.update({ ids: [], selected: '' })

		setTimeout(async () => {
			document.getElementById('creditContainer')?.classList.toggle('shown', true)
			const data = await storage.sync.get('unsplash')
			const local = await storage.local.get('unsplashCache')
			unsplashBackgrounds({ unsplash: data.unsplash, cache: local.unsplashCache })
		}, 100)
	}

	return thb
}

async function addThumbnailsToDom(ids: string[], selected?: string) {
	const fileContainer = document.getElementById('fileContainer') as HTMLElement
	const fragment = document.createDocumentFragment()
	const idsToAdd = ids.filter((id) => !document.getElementById(id))

	for (const id of idsToAdd) {
		const isSelected = id === selected
		const blob = await getBlob(id, 'thumbnail')
		fragment.appendChild(createThumbnail(blob, id, isSelected))
	}

	fileContainer.appendChild(fragment)
}

//
// 	IndexedDB storage
//

function localImagesStorage() {
	async function get() {
		const res = (await idb.get('localImages')) as LocalImages
		const userImages = {
			selected: res?.selected ?? '',
			freq: res?.freq ?? 'pause',
			ids: res?.ids ?? [],
			last: res?.last ?? 0,
		}

		return userImages
	}

	function set(val: LocalImages) {
		idb.set('localImages', val)
	}

	function update(val: Partial<LocalImages>) {
		idb.update('localImages', (prev) => ({ ...prev, ...val }))
	}

	return { get, set, update }
}
