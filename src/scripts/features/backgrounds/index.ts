import unsplashBackgrounds from './unsplash'
import videosBackgrounds from './videos'
import localBackgrounds from './local'

import { eventDebounce } from '../../utils/debounce'
import { rgbToHex } from '../../utils'
import { BROWSER } from '../../defaults'
import storage from '../../storage'

type FilterOptions = {
	blur?: number
	brightness?: number
	isEvent?: true
}

type UpdateOptions = {
	freq?: string
	type?: string
	refresh?: HTMLSpanElement
}

export default function initBackground(data: Sync.Storage, local: Local.Storage) {
	const blur = data.background_blur
	const brightness = data.background_bright

	backgroundFilter({ blur, brightness })

	if (BROWSER === 'safari') {
		const bgfirst = document.getElementById('image-background') as HTMLDivElement
		const bgsecond = document.getElementById('image-background-bis') as HTMLDivElement

		bgfirst.style.transform = 'scale(1.1) translateX(0px) translate3d(0, 0, 0)'
		bgsecond.style.transform = 'scale(1.1) translateX(0px) translate3d(0, 0, 0)'
	}

	if (data.background_type === 'local') localBackgrounds()
	if (data.background_type === 'solid') console.log('bjr')
	if (data.background_type === 'videos') videosBackgrounds(data.background_type === 'videos')
	if (data.background_type === 'unsplash') unsplashBackgrounds({ unsplash: data.unsplash, cache: local.unsplashCache })
}

export function imgBackground(url: string, color?: string) {
	const img = new Image()

	// Set the crossOrigin attribute to handle CORS when average color needed
	if (!color) img.crossOrigin = 'Anonymous'

	img.onload = () => {
		const bgoverlay = document.getElementById('background-overlay') as HTMLDivElement
		const bgfirst = document.getElementById('image-background') as HTMLDivElement
		const bgsecond = document.getElementById('image-background-bis') as HTMLDivElement
		const loadBis = bgfirst.style.opacity === '1'
		const bgToChange = loadBis ? bgsecond : bgfirst

		bgfirst.style.opacity = loadBis ? '0' : '1'
		bgToChange.style.backgroundImage = `url(${url})`

		bgoverlay.style.opacity = '1'

		if (BROWSER === 'safari') {
			if (!color) color = getAverageColor(img)

			if (color) {
				document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color)
				setTimeout(() => document.documentElement.style.setProperty('--average-color', color!), 400)
			}
		}
	}

	img.src = url
	img.remove()
}

export function backgroundFilter({ blur, brightness, isEvent }: FilterOptions) {
	const hasbright = typeof brightness === 'number'
	const hasblur = typeof blur === 'number'

	if (hasblur) document.documentElement.style.setProperty('--background-blur', blur.toString() + 'px')
	if (hasbright) document.documentElement.style.setProperty('--background-brightness', brightness.toString())

	if (hasblur) {
		document.body.classList.toggle('blurred', blur > 16)
	}

	if (isEvent && hasblur) eventDebounce({ background_blur: blur })
	if (isEvent && hasbright) eventDebounce({ background_bright: brightness })
}

export function updateBackgroundOption(update: UpdateOptions) {
	const type = document.querySelector<HTMLInputElement>('#i_type')?.value

	if (update.freq !== undefined) {
		if (type === 'local') localBackgrounds({ freq: update.freq })
		if (type === 'videos') videosBackgrounds(undefined, { hello: true })
		if (type === 'unsplash') unsplashBackgrounds(undefined, { every: update.freq })
	}

	if (update.refresh) {
		if (type === 'local') localBackgrounds({ refresh: update.refresh })
		if (type === 'videos') videosBackgrounds(undefined, { hello: true })
		if (type === 'unsplash') unsplashBackgrounds(undefined, { refresh: update.refresh })
	}

	if (update.type) {
		if (isBackgroundType(update.type)) {
			handleBackgroundOptions(update.type)
			storage.sync.set({ background_type: update.type })
		}
	}
}

async function handleBackgroundOptions(type: string) {
	document.getElementById('local_options')?.classList.toggle('shown', type === 'local')
	document.getElementById('unsplash_options')?.classList.toggle('shown', type === 'unsplash')

	if (type === 'local') {
		localBackgrounds({ settings: document.getElementById('settings') as HTMLElement })
		setTimeout(() => localBackgrounds(), 100)
	}

	if (type === 'unsplash') {
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

export function getAverageColor(img: HTMLImageElement) {
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

// function backgroundFreq() {
// 	//
// }

// function refreshBackground() {
// 	//
// }

function isBackgroundType(str = ''): str is Sync.Storage['background_type'] {
	return ['unsplash', 'local', 'videos', 'solid'].includes(str)
}
