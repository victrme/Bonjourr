import { get, set, update, del } from 'idb-keyval'
import { imgBackground, freqControl } from '..'
import unsplash from './unsplash'
import storage from '../storage'
import { $, clas, randomString, mobilecheck, turnRefreshButton } from '../utils'
import errorMessage from '../utils/errorMessage'

import { Sync } from '../types/sync'

type LocalImages = {
	ids: string[]
	selected: string
	last: number
	freq: string
}

type Blobs = {
	background: Blob
	thumbnail: Blob
}

type UpdateEvent = {
	thumbnail?: HTMLElement
	refresh?: HTMLSpanElement
	newfile?: FileList
	freq?: string
}

let localIsLoading = false

const localImages = {
	get: async () => {
		const res = (await get('localImages')) as LocalImages
		const userImages = {
			selected: res?.selected ?? '',
			freq: res?.freq ?? 'pause',
			ids: res?.ids ?? [],
			last: res?.last ?? 0,
		}

		return userImages
	},

	set: (val: LocalImages) => {
		set('localImages', val)
	},

	update: (val: Partial<LocalImages>) => {
		update('localImages', (prev) => ({ ...prev, ...val }))
	},
}

function thumbnailSelection(id: string) {
	document.querySelectorAll('.thumbnail').forEach((thumb) => clas(thumb, false, 'selected'))
	clas(document.querySelector('.thumbnail#' + id), true, 'selected') // add selection style
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

	const newBlob = await new Promise((resolve) => ctx?.canvas.toBlob(resolve))

	return newBlob as Blob
}

async function addNewImage(files: FileList) {
	let ids: string[] = []
	let selected = ''

	localIsLoading = true

	Object.values(files).forEach(() => {
		const _id = 'local-' + randomString(8)
		ids.push(_id)
		selected = _id
	})

	Object.values(files).forEach((file, i) => {
		let reader = new FileReader()

		reader.onload = async function saveFileAsImage(event) {
			const result = event.target?.result as string
			const response = await fetch(result)
			const blob = await response.blob()
			const thumbnail = await compressThumbnail(blob)

			const blobs = {
				background: blob,
				thumbnail: thumbnail,
			}

			addThumbnail(blobs.thumbnail, ids[i], null, true)

			if (i === files.length - 1) {
				displayCustomBackground(blobs.background)
				thumbnailSelection(selected)
			}

			await set(ids[i], blobs)
		}

		reader.readAsDataURL(file)
	})

	const userImages = await localImages.get()

	userImages.ids.push(...ids)
	userImages.selected = selected

	localImages.set(userImages)
	localIsLoading = false

	// change type si premier local
	if (userImages.ids.length === 0) {
		storage.sync.set({ background_type: 'custom' })
	}
}

function addThumbnail(blob: Blob, _id: string, settingsDom: HTMLElement | null, isSelected: boolean) {
	const settings = settingsDom ? settingsDom : ($('settings') as HTMLElement)

	const thb = document.createElement('button')
	const rem = document.createElement('button')
	const thbimg = document.createElement('img')
	const remimg = document.createElement('img')
	const wrap = settings.querySelector('#fileContainer')

	thb.id = _id
	thbimg.src = URL.createObjectURL(blob)
	thb.setAttribute('class', 'thumbnail' + (isSelected ? ' selected' : ''))

	clas(rem, true, 'b_removethumb')
	clas(rem, !mobilecheck(), 'hidden')

	thb.setAttribute('aria-label', 'Select this background')
	rem.setAttribute('aria-label', 'Remove this background')

	remimg.setAttribute('alt', '')
	thbimg.setAttribute('alt', '')

	remimg.setAttribute('src', 'src/assets/interface/close.svg')
	rem.appendChild(remimg)

	thb.appendChild(thbimg)
	thb.appendChild(rem)
	wrap?.prepend(thb)

	async function applyThisBackground(this: HTMLImageElement, e: MouseEvent) {
		if (e.button !== 0 || localIsLoading) return

		const userImages = await localImages.get()
		const thumbnail = this?.parentElement
		const thisId = thumbnail?.id

		if (thisId && thisId !== userImages.selected) {
			const blobs = (await get(thisId)) as Blobs
			if (blobs?.background) displayCustomBackground(blobs.background)

			thumbnailSelection(thisId)
			localImages.update({ selected: thisId })
		}
	}

	async function deleteThisBackground(this: HTMLButtonElement, e: MouseEvent) {
		if (e.button !== 0 || localIsLoading || !e.target) return

		let { ids, selected } = await localImages.get()
		const thumbnail = this?.parentElement
		const thisId = thumbnail?.id

		if (thisId) {
			clas(thumbnail, true, 'hiding')
			setTimeout(() => thumbnail?.remove(), 100)

			// Pop background from list
			ids = ids.filter((s) => !s.includes(thisId))
			update('userImages', (prev) => ({ ...prev, ids }))

			del(thisId)
		}

		if (thisId === selected) {
			// Draw new image if displayed is removed to another custom
			if (ids.length > 0) {
				selected = ids[0]
				thumbnailSelection(selected)

				const blobs = (await get(selected)) as Blobs
				if (blobs?.background) displayCustomBackground(blobs.background)

				update('userImages', (prev) => ({ ...prev, selected }))
				return
			}

			// back to unsplash
			storage.sync.set({ background_type: 'dynamic' })
			set('userImages', { ids: [], selected: '' })

			setTimeout(() => {
				clas($('creditContainer'), true, 'shown')
				storage.sync.get('dynamic', (data) => unsplash(data as Sync))
			}, 400)
		}
	}

	thbimg.addEventListener('click', applyThisBackground)
	rem.addEventListener('click', deleteThisBackground)
}

async function displayCustomThumbnails(settingsDom: HTMLElement) {
	const thumbnails = settingsDom.querySelectorAll('#bg_tn_wrap .thumbnail')
	const { ids, selected } = await localImages.get()
	const idsAndNotAllThumbs = ids.length > 0 || thumbnails.length < ids.length

	if (idsAndNotAllThumbs) {
		ids.forEach(async (id) => {
			const blobs = (await get(id)) as Blobs
			if (blobs?.thumbnail) addThumbnail(blobs.thumbnail, id, settingsDom, id === selected)
		})
	}
}

async function displayCustomBackground(blob: Blob) {
	imgBackground(URL.createObjectURL(blob))
	clas($('creditContainer'), false, 'shown')
}

async function refreshCustom(button: HTMLSpanElement) {
	localImages.update({ last: Date.now() })
	turnRefreshButton(button, true)
	localIsLoading = true

	setTimeout(() => localBackgrounds(), 400)
}

export default async function localBackgrounds(event?: UpdateEvent) {
	if (event) {
		if (event?.thumbnail) displayCustomThumbnails(event?.thumbnail)
		if (event?.refresh) refreshCustom(event.refresh)
		if (event?.newfile) addNewImage(event.newfile)
		if (event?.freq) localImages.update({ freq: event?.freq })
		return
	}

	try {
		let { ids, selected, freq, last } = await localImages.get()
		const needNewImage = freqControl.get(freq, last)

		// no bg, back to unsplash
		if (ids.length === 0) {
			storage.sync.get('dynamic', (data) => unsplash(data as Sync))
			return
		}

		if (freq && needNewImage && ids.length > 1) {
			const filteredIds = ids.filter((l: string) => !l.includes(selected)) // removes current from list
			selected = ids[Math.floor(Math.random() * filteredIds.length)] // randomize from list

			localImages.update({ ids, selected, last: freqControl.set() })

			if ($('settings')) {
				thumbnailSelection(selected) // change selection if coming from refresh
			}
		}

		const blobs = (await get(selected)) as Blobs
		if (blobs?.background) displayCustomBackground(blobs.background)
	} catch (e) {
		errorMessage(e)
	}
}
