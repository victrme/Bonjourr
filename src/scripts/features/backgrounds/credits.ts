import { tradThis } from '../../utils/translations'

export function credits(image?: Backgrounds.Image) {
	const domcontainer = document.getElementById('credit-container')
	const domcredit = document.getElementById('credit')

	if (!(domcontainer && domcredit && image?.page && image?.username)) {
		// also remove credits
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

	// cached data may not contain download link
	if (image.download) {
		appendSaveLink(domcredit, image)
	}

	domcontainer.classList.toggle('shown', true)
}

function appendSaveLink(domcredit: HTMLElement, image: Backgrounds.Image) {
	const domsave = document.createElement('a')
	domsave.className = 'save'
	domsave.title = 'Download the current background to your computer'
	domsave.onclick = () => saveImage(domsave, image)

	domcredit.appendChild(domsave)
}

async function saveImage(domsave: HTMLAnchorElement, image: Backgrounds.Image) {
	domsave.classList.add('loading')
	try {
		const downloadUrl = new URL(image.download ?? '')
		const apiDownloadUrl = `https://services.bonjourr.fr/unsplash${downloadUrl.pathname}${downloadUrl.search}`
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

		domsave.onclick = null
		domsave.href = URL.createObjectURL(blob)
		domsave.download = downloadUrl.pathname.split('/')[2]

		domsave.click()
	} finally {
		domsave.classList.remove('loading')
	}
}
