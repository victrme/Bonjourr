import unsplashBackgrounds from './unsplash'
import videosBackgrounds from './videos'
import localBackgrounds from './local'
import solidBackgrounds from './solid'

import onSettingsLoad from '../../utils/onsettingsload'
import { rgbToHex } from '../../utils'
import { BROWSER } from '../../defaults'
import debounce from '../../utils/debounce'
import storage from '../../storage'

interface BackgroundUpdate {
	freq?: string
	type?: string
	blur?: string
	bright?: string
	fadein?: string
	refresh?: HTMLSpanElement
}

type ApplyBackgroundOptions = {
	image?: { url: string; color?: string }
	video?: { url: string; color?: string }
	solid?: { value: string }
}

const propertiesUpdateDebounce = debounce(backgroundPropertiesUpdate, 600)

export default function backgrounds(sync: Sync.Storage, local: Local.Storage, init?: true) {
	const type = sync.backgrounds.type

	if (init) {
		onSettingsLoad(() => {
			handleBackgroundOptions(sync.backgrounds.type)
		})
	}

	backgroundProperties(sync.backgrounds)

	if (type === 'color') solidBackgrounds(sync.backgrounds.color)
	if (type === 'files') localBackgrounds()
	if (type === 'videos') videosBackgrounds(1)
	if (type === 'images') unsplashBackgrounds({ unsplash: sync.unsplash, cache: local.unsplashCache })
}

export async function backgroundUpdate(update: BackgroundUpdate) {
	const type = document.querySelector<HTMLInputElement>('#i_type')?.value

	if (update.freq !== undefined) {
		if (type === 'files') localBackgrounds({ freq: update.freq })
		if (type === 'videos') videosBackgrounds(undefined, { hello: true })
		if (type === 'images') unsplashBackgrounds(undefined, { every: update.freq })
		return
	}

	if (update.refresh) {
		if (type === 'files') localBackgrounds({ refresh: update.refresh })
		if (type === 'videos') videosBackgrounds(undefined, { hello: true })
		if (type === 'images') unsplashBackgrounds(undefined, { refresh: update.refresh })
		return
	}

	if (update.blur !== undefined) {
		backgroundProperties({ blur: parseFloat(update.blur) })
		propertiesUpdateDebounce({ blur: parseFloat(update.blur) })
		return
	}

	if (update.bright !== undefined) {
		backgroundProperties({ bright: parseFloat(update.bright) })
		propertiesUpdateDebounce({ bright: parseFloat(update.bright) })
		return
	}

	if (update.fadein !== undefined) {
		backgroundProperties({ fadein: parseInt(update.fadein) })
		propertiesUpdateDebounce({ fadein: parseFloat(update.fadein) })
		return
	}

	if (isBackgroundType(update.type)) {
		const data = await storage.sync.get('backgrounds')
		const local = await storage.local.get()

		data.backgrounds.type = update.type
		storage.sync.set({ backgrounds: data.backgrounds })

		handleBackgroundOptions(update.type)
		backgrounds(data, local)
	}
}

export async function backgroundPropertiesUpdate({ blur, bright, fadein }: Partial<Sync.Backgrounds>) {
	const data = await storage.sync.get('backgrounds')

	if (blur !== undefined) data.backgrounds.blur = blur
	if (bright !== undefined) data.backgrounds.bright = bright
	if (fadein !== undefined) data.backgrounds.fadein = fadein

	storage.sync.set({ backgrounds: data.backgrounds })
}

export function applyBackground({ image, video, solid }: ApplyBackgroundOptions) {
	const overlay = document.getElementById('background-overlay') as HTMLDivElement
	const solidBackground = document.getElementById('solid-background') as HTMLDivElement
	const imageWrapper = document.getElementById('image-background-wrapper') as HTMLDivElement
	const videoWrapper = document.getElementById('video-background-wrapper') as HTMLDivElement

	solidBackground.style.display = solid ? 'block' : 'none'
	imageWrapper.style.display = image ? 'block' : 'none'
	videoWrapper.style.display = video ? 'block' : 'none'

	if (image) {
		const img = new Image()

		img.onload = () => {
			const bgfirst = document.getElementById('image-background') as HTMLDivElement
			const bgsecond = document.getElementById('image-background-bis') as HTMLDivElement
			const loadBis = bgfirst.style.opacity === '1'
			const bgToChange = loadBis ? bgsecond : bgfirst

			bgfirst.style.opacity = loadBis ? '0' : '1'
			bgToChange.style.backgroundImage = `url(${image.url})`

			overlay.classList.remove('hidden')

			if (BROWSER === 'safari') {
				if (!image.color) {
					image.color = getAverageColor(img)
				}

				if (image.color) {
					const fadein = parseInt(document.documentElement.style.getPropertyValue('--fade-in'))
					document.querySelector('meta[name="theme-color"]')?.setAttribute('content', image.color)
					setTimeout(() => document.documentElement.style.setProperty('--average-color', image.color!), fadein)
				}
			}
		}

		img.src = image.url
		img.remove()
	}

	if (video) {
		const domvideo = document.querySelector<HTMLMediaElement>('#video-background')

		if (domvideo) {
			domvideo.src = video.url
			setTimeout(() => overlay.classList.remove('hidden'))
		}
	}

	if (solid) {
		document.documentElement.style.setProperty('--solid-background', solid.value)
		overlay.classList.remove('hidden')
	}
}

export function backgroundProperties({ blur, bright, fadein }: Partial<Sync.Backgrounds>) {
	if (blur !== undefined) {
		document.documentElement.style.setProperty('--blur', blur + 'px')
		document.body.classList.toggle('blurred', blur >= 15)
	}

	if (bright !== undefined) {
		document.documentElement.style.setProperty('--brightness', bright + '')
	}

	if (fadein !== undefined) {
		document.documentElement.style.setProperty('--fade-in', fadein + 'ms')
	}
}

async function handleBackgroundOptions(type: string) {
	if (isBackgroundType(type) === false) {
		return
	}

	const overlay = document.querySelector<HTMLElement>('#background-overlay')

	if (overlay) {
		overlay.dataset.type = type
	}

	document.getElementById('local_options')?.classList.toggle('shown', type === 'files')
	document.getElementById('solid_options')?.classList.toggle('shown', type === 'color')
	document.getElementById('unsplash_options')?.classList.toggle('shown', type === 'images')
	document.getElementById('background-urls-option')?.classList.toggle('shown', type === 'urls')
	document.getElementById('background-freq-option')?.classList.toggle('shown', type !== 'color')
	document.getElementById('background-filters-options')?.classList.toggle('shown', type !== 'color')
	document.getElementById('background-provider-option')?.classList.toggle('shown', type === 'images')

	if (type === 'files') {
		localBackgrounds({ settings: document.getElementById('settings') as HTMLElement })
		setTimeout(() => localBackgrounds(), 100)
	}

	if (type === 'images') {
		const data = await storage.sync.get()
		const local = await storage.local.get('unsplashCache')

		if (!data.unsplash) {
			return
		}

		document.querySelector<HTMLSelectElement>('#i_freq')!.value = data.unsplash.every || 'hour'
		document.getElementById('credit-container')?.classList.toggle('shown', true)
		setTimeout(
			() =>
				unsplashBackgrounds({
					unsplash: data.unsplash,
					cache: local.unsplashCache,
				}),
			100
		)
	}
}

function getAverageColor(img: HTMLImageElement) {
	try {
		// Create a canvas element
		const canvas = document.createElement('canvas')
		const ctx = canvas.getContext('2d')

		const MAX_DIMENSION = 100 // resizing the image for better performance

		// Calculate the scaling factor to maintain aspect ratio
		const scale = Math.min(MAX_DIMENSION / img.width, MAX_DIMENSION / img.height)

		// Set canvas dimensions to the scaled image dimensions
		canvas.width = img.width * scale
		canvas.height = img.height * scale

		// Draw the image onto the canvas
		ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)

		// Get the image data from the canvas
		const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height)
		const data = imageData?.data

		let r = 0,
			g = 0,
			b = 0
		let count = 0

		// Loop through the image data and sum the color values
		if (data) {
			for (let i = 0; i < data.length; i += 4) {
				r += data[i]
				g += data[i + 1]
				b += data[i + 2]
				count++
			}
		}

		// Calculate the average color
		r = Math.floor(r / count)
		g = Math.floor(g / count)
		b = Math.floor(b / count)

		// Output the average color in RGB format
		console.log(rgbToHex(r, g, b))
		return rgbToHex(r, g, b)
	} catch (error) {
		console.error('Error accessing image data:', error)
	}
}

function isBackgroundType(str = ''): str is Sync.Storage['backgrounds']['type'] {
	return ['files', 'urls', 'images', 'videos', 'color'].includes(str)
}
