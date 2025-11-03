import { backgroundUpdate, toggleMuteStatus } from './index.ts'
import { onclickdown } from 'clickdown/mod'
import { tradThis } from '../../utils/translations.ts'
import { storage } from '../../storage.ts'

import type { Backgrounds } from '../../../types/sync.ts'
import type { Background } from '../../../types/shared.ts'

export function initCreditEvents() {
	onclickdown(document.getElementById('b_interface-background-pause'), () => {
		toggleBackgroundPause()
	})

	onclickdown(document.getElementById('b_interface-background-refresh'), (event) => {
		backgroundUpdate({ refresh: event })
	})

	onclickdown(document.getElementById('b_interface-background-download'), () => {
		downloadImage()
	})

	onclickdown(document.getElementById('b_interface-background-mute'), () => {
		toggleMuteVideo()
	})
}

export function toggleCredits(backgrounds: Backgrounds) {
	const domcontainer = document.getElementById('credit-container')
	const domcredit = document.getElementById('credit')
	const domsave = document.getElementById('a_interface-background-download')

	switch (backgrounds.type) {
		case 'color': {
			domcontainer?.classList.remove('shown')
			return
		}

		case 'urls':
		case 'files': {
			domcontainer?.classList.add('shown')
			domcredit?.classList.add('hidden')
			domsave?.classList.add('hidden')
			break
		}

		case 'videos': {
			domcontainer?.classList.add('shown')
			domcredit?.classList.remove('hidden')
			domsave?.classList.add('hidden')
			break
		}

		default: {
			domcontainer?.classList.add('shown')
			domcredit?.classList.remove('hidden')
			domsave?.classList.remove('hidden')
		}
	}
}

export function updateCredits(image?: Background) {
	const domcontainer = document.getElementById('credit-container')
	const domcredit = document.getElementById('credit')
	const domsave = document.getElementById('download-background')

	if (!(domcontainer && domcredit && image?.page && image?.username)) {
		return
	}

	if (image?.format === 'video') {
		if (image.username) {
			const dompage = document.createElement('a')
			dompage.textContent = tradThis(`Video by ${image.username}`)
			dompage.href = image.page
			domcredit.textContent = ''
			domcredit.append(dompage)
		}

		return
	}

	const hasLocation = image.city || image.country
	let exif = ''
	let credits = ''

	if (image.exif) {
		const { iso, model, aperture, exposure_time, focal_length } = image.exif

		// ⚠️ In this order !
		if (model) {
			exif += `${model} - `
		}
		if (aperture) {
			exif += `f/${aperture} `
		}
		if (exposure_time) {
			exif += `${exposure_time}s `
		}
		if (iso) {
			exif += `${iso}ISO `
		}
		if (focal_length) {
			exif += `${focal_length}mm`
		}
	}

	if (hasLocation) {
		const city = image.city || ''
		const country = image.country || ''
		const comma = city && country ? ', ' : ''
		credits = `${city}${comma}${country} <name>`
	} else {
		credits = tradThis('Photo by <name>')
	}

	const [location, rest] = credits.split(' <name>')
	const domlocation = document.createElement('a')
	const domspacer = document.createElement('span')
	const domrest = document.createElement('span')
	const domartist = document.createElement('a')
	const domexif = document.createElement('p')

	domexif.className = 'exif'
	domexif.textContent = exif
	domlocation.textContent = location
	domartist.textContent = image.username.slice(0, 1).toUpperCase() + image.username.slice(1)
	domspacer.textContent = hasLocation ? ' - ' : ' '
	domrest.textContent = rest

	if (image.page.includes('unsplash')) {
		domlocation.href = `${image.page}?utm_source=Bonjourr&utm_medium=referral`
		domartist.href = `https://unsplash.com/@${image.username}?utm_source=Bonjourr&utm_medium=referral`
	} else {
		domlocation.href = image.page
	}

	domcredit.textContent = ''
	domcredit.append(domexif, domlocation, domspacer, domartist, domrest)

	if (image.download && domsave) {
		domsave.dataset.downloadUrl = image.download
	}
}

async function toggleMuteVideo() {
	const muteInput = document.querySelector<HTMLInputElement>('#i_background-mute-videos')
	const muteContextButton = document.getElementById('b_interface-background-mute')
	const sync = await storage.sync.get('backgrounds')
	const lastMuteStatus = sync.backgrounds.mute

	if (muteInput) { // if settings are initialized, sets input 
		muteInput.checked = !lastMuteStatus
	}
	
	muteContextButton?.classList.toggle('muted', !lastMuteStatus)

	toggleMuteStatus(!lastMuteStatus)
	backgroundUpdate({ mute: !lastMuteStatus })
}

async function toggleBackgroundPause() {
	const freqInput = document.querySelector<HTMLSelectElement>('#i_freq')
	const button = document.getElementById('b_interface-background-pause')
	const paused = button?.classList.contains('paused')
	const sync = await storage.sync.get('backgrounds')
	const last = localStorage.lastBackgroundFreq || 'hour'

	if (freqInput) {
		freqInput.value = paused ? last : 'pause'
	}

	if (paused) {
		backgroundUpdate({ freq: last })
	} else {
		localStorage.lastBackgroundFreq = sync.backgrounds.frequency
		backgroundUpdate({ freq: 'pause' })
	}
}

async function downloadImage() {
	const dombutton = document.querySelector<HTMLButtonElement>('#b_interface-background-download')
	const domsave = document.querySelector<HTMLAnchorElement>('#download-background')

	if (!domsave) {
		console.warn('?')
		return
	}

	dombutton?.classList.replace('idle', 'loading')

	try {
		const baseUrl = 'https://services.bonjourr.fr/unsplash'
		const downloadUrl = new URL(domsave.dataset.downloadUrl ?? '')
		const apiDownloadUrl = baseUrl + downloadUrl.pathname + downloadUrl.search
		const downloadResponse = await fetch(apiDownloadUrl)

		if (!downloadResponse) {
			return
		}

		const data: { url: string } = await downloadResponse.json()
		const imageResponse = await fetch(data.url)

		if (!imageResponse.ok) {
			return
		}

		const blob = await imageResponse.blob()

		domsave.href = URL.createObjectURL(blob)
		domsave.download = downloadUrl.pathname.split('/')[2]
		domsave.click()
	} finally {
		dombutton?.classList.replace('loading', 'idle')
	}
}
