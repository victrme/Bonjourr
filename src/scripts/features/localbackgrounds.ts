import { randomString, turnRefreshButton, freqControl } from '../utils'
import { get, set, update, del } from 'idb-keyval'
import unsplashBackgrounds from './unsplash'
import { imgBackground } from '..'
import onSettingsLoad from '../utils/onsettingsload'
import { IS_MOBILE } from '../defaults'
import errorMessage from '../utils/errormessage'
import storage from '../storage'

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
	settings?: HTMLElement
	refresh?: HTMLSpanElement
	newfile?: FileList | null
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

function selectThumbnail(id: string) {
	document.querySelector('.thumbnail.selected')?.classList.remove('selected')
	document.getElementById(id)?.classList?.add('selected')
}

function findNextImage(ids: string[], selected: string) {
	const filtered = (ids = ids.filter((l: string) => !l.includes(selected)))
	const randomId = Math.floor(Math.random() * filtered.length)

	return filtered[randomId]
}

async function getBlob(id: string, which: 'background' | 'thumbnail') {
	const blobs = await get(id)
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

		addThumbnail(thumbnail, id, false)
		await set(id, blobs[id])
	}

	localImages.update({ ids: ids.concat(newIds), selected })
	localIsLoading = false

	displayCustomBackground(blobs[selected].background)
	selectThumbnail(selected)
}

async function addThumbnail(blob: Blob, id: string, isSelected: boolean, settingsDom?: HTMLElement) {
	const settings = settingsDom ? settingsDom : document.getElementById('settings')

	const thb = document.createElement('button')
	const rem = document.createElement('button')
	const thbimg = document.createElement('img')
	const remspan = document.createElement('span')
	const wrap = settings?.querySelector('#fileContainer')

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
	wrap?.prepend(thb)

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

			del(id)
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

	thbimg.addEventListener('click', applyThisBackground)
	rem.addEventListener('click', deleteThisBackground)
}

async function handleSettingsOptions() {
	const fileContainer = document.getElementById('fileContainer') as HTMLElement
	const settings = document.getElementById('settings') as HTMLElement
	const i_freq = document.getElementById('i_freq') as HTMLSelectElement

	const { ids, selected, freq } = await localImages.get()
	const thumbsAmount = fileContainer?.childElementCount || 0
	const idsAndNotAllThumbs = ids.length > 0 && thumbsAmount < ids.length

	if (idsAndNotAllThumbs) {
		ids.forEach(async (id) => {
			const blob = await getBlob(id, 'thumbnail')
			if (blob) addThumbnail(blob, id, id === selected, settings)
		})
	}

	if (i_freq) {
		i_freq.value = freq
	}
}

async function displayCustomBackground(blob?: Blob) {
	if (blob) {
		imgBackground(URL.createObjectURL(blob))
		document.getElementById('creditContainer')?.classList.remove('shown')
		localIsLoading = false
	}
}

async function refreshCustom(button: HTMLSpanElement) {
	localImages.update({ last: 0 })
	turnRefreshButton(button, true)
	setTimeout(() => localBackgrounds(), 100)
}

export default async function localBackgrounds(event?: UpdateEvent) {
	if (event) {
		if (event?.refresh) refreshCustom(event.refresh)
		if (event?.newfile) addNewImage(event.newfile)
		if (event?.freq) localImages.update({ freq: event?.freq })
		return
	}

	try {
		let { ids, selected, freq, last } = await localImages.get()
		const needNewImage = freqControl.get(freq, last) && ids.length > 1

		if (ids.length === 0) {
			const data = await storage.sync.get('unsplash')
			const local = await storage.local.get('unsplashCache')
			unsplashBackgrounds({ unsplash: data.unsplash, cache: local.unsplashCache })
			return
		}

		if (needNewImage) {
			selected = findNextImage(ids, selected)
			localImages.update({ selected, last: freqControl.set() })
		}

		displayCustomBackground(await getBlob(selected, 'background'))
		onSettingsLoad(handleSettingsOptions)

		//
	} catch (e) {
		errorMessage(e)
	}
}
