import { tradThis } from '../../utils/translations.ts'

import type { Backgrounds } from '../../../types/sync.ts'
import type { Background } from '../../../types/shared.ts'

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
