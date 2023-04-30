import { get, set, update, del } from 'idb-keyval'
import { imgBackground, freqControl } from '..'
import unsplash from './unsplash'
import storage from '../storage'
import { $, clas, randomString, mobilecheck, turnRefreshButton, syncDefaults } from '../utils'
import errorMessage from '../utils/errorMessage'

import { Sync } from '../types/sync'

type UserImages = { ids: string[]; selected: string }
type Blobs = { background: Blob; thumbnail: Blob }

type Init = { every: string; time: number } | null
type UpdateEvent = { thumbnail?: HTMLElement; refresh?: HTMLSpanElement; newfile?: FileList }

let localIsLoading = false

async function getUserImages() {
	const res = (await get('userImages')) as UserImages
	const userImages = { ids: res?.ids ?? [], selected: res?.selected ?? '' }
	return userImages
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

	console.time('storage')

	Object.values(files).forEach(() => {
		const _id = randomString(16)
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

	const userImages = await getUserImages()

	userImages.ids.push(...ids)
	userImages.selected = selected

	set('userImages', userImages)
	localIsLoading = false

	// change type si premier local
	if (userImages.ids.length === 0) {
		storage.sync.set({ background_type: 'custom' })
	}

	console.timeEnd('storage')
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

		const userImages = await getUserImages()
		const thumbnail = this?.parentElement
		const thisId = thumbnail?.id

		if (thisId && thisId !== userImages.selected) {
			const blobs = (await get(thisId)) as Blobs
			if (blobs?.background) displayCustomBackground(blobs.background)

			thumbnailSelection(thisId)
			update('userImages', (prev) => ({ ...prev, selected: thisId }))
		}
	}

	async function deleteThisBackground(this: HTMLButtonElement, e: MouseEvent) {
		if (e.button !== 0 || localIsLoading || !e.target) return

		let { ids, selected } = await getUserImages()
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
	const userImages = await getUserImages()

	if (userImages.ids.length === 0 || thumbnails.length >= userImages.ids.length) {
		return
	}

	userImages.ids.forEach(async (id) => {
		const blobs = (await get(id)) as Blobs
		if (blobs?.thumbnail) addThumbnail(blobs.thumbnail, id, settingsDom, id === userImages.selected)
	})
}

async function displayCustomBackground(blob: Blob) {
	imgBackground(URL.createObjectURL(blob))
	clas($('creditContainer'), false, 'shown')
}

function refreshCustom(button: HTMLSpanElement) {
	storage.sync.get('custom_every', (sync) => {
		turnRefreshButton(button, true)
		localIsLoading = true

		setTimeout(
			() =>
				localBackgrounds({
					every: sync.custom_every,
					time: 0,
				}),
			400
		)
	})
}

export default async function localBackgrounds(init: Init, event?: UpdateEvent) {
	if (event || !init) {
		if (event?.thumbnail) displayCustomThumbnails(event?.thumbnail)
		if (event?.refresh) refreshCustom(event.refresh)
		if (event?.newfile) addNewImage(event.newfile)
		return
	}

	console.time('localBackgrounds')

	try {
		const { every, time } = init
		const needNewImage = freqControl.get(every, time || 0)
		let { ids, selected } = await getUserImages()

		console.timeEnd('localBackgrounds')

		// no bg, back to unsplash
		if (ids.length === 0) {
			storage.sync.get('dynamic', (data) => unsplash(data as Sync))
			return
		}

		if (every && needNewImage && ids.length > 1) {
			const filteredIds = ids.filter((l: string) => !l.includes(selected)) // removes current from list
			selected = ids[Math.floor(Math.random() * filteredIds.length)] // randomize from list

			set('userImages', { ids, selected })
			storage.sync.set({ custom_time: freqControl.set() })

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
