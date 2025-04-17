import { backgroundUpdate } from '.'
import { tradThis } from '../../utils/translations.ts'
import { storage } from '../../storage.ts'

import type { Backgrounds } from '../../../types/sync.ts'
import type { Background } from '../../../types/shared.ts'

export function initCreditEvents() {
	document.getElementById('b_interface-background-pause')?.onclickdown(() => {
		toggleBackgroundPause()
	})

	document.getElementById('b_interface-background-refresh')?.onclickdown((_, target) => {
		backgroundUpdate({
			refresh: target.querySelector('svg') as Element,
		})
	})

	document.getElementById('b_interface-background-download')?.onclickdown(() => {
		downloadImage()
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

		case 'videos':
		case 'urls':
		case 'files': {
			domcontainer?.classList.add('shown')
			domcredit?.classList.add('hidden')
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

	if (image?.format === 'video') {
		console.info('No video credits now')
		return
	}

	if (!(domcontainer && domcredit && image?.page && image?.username)) {
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

	domlocation.href = `${image.urls.full}?utm_source=Bonjourr&utm_medium=referral`
	domartist.href = `https://unsplash.com/@${image.username}?utm_source=Bonjourr&utm_medium=referral`

	domcredit.textContent = ''
	domcredit.appendChild(domexif)
	domcredit.appendChild(domlocation)
	domcredit.appendChild(domspacer)
	domcredit.appendChild(domartist)
	domcredit.appendChild(domrest)

	if (image.download && domsave) {
		domsave.dataset.downloadUrl = image.download
	}
}

async function toggleBackgroundPause() {
	const button = document.getElementById('b_interface-background-pause')
	const paused = button?.classList.contains('paused')
	const sync = await storage.sync.get('backgrounds')

	if (paused) {
		const last = localStorage.lastBackgroundFreq || 'hour'
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
