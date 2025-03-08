import unsplashBackgrounds from './unsplash'
import localBackgrounds from './local'
import { eventDebounce } from '../../utils/debounce'
import { BROWSER } from '../../defaults'

type FilterOptions = {
	blur?: number
	brightness?: number
	isEvent?: true
}

type UpdateOptions = {
	freq?: string
	refresh?: HTMLSpanElement
}

export default function initBackground(data: Sync.Storage, local: Local.Storage) {
	const type = data.background_type || 'unsplash'
	const blur = data.background_blur
	const brightness = data.background_bright

	backgroundFilter({ blur, brightness })

	if (BROWSER === 'safari') {
		const bgfirst = document.getElementById('background') as HTMLDivElement
		const bgsecond = document.getElementById('background-bis') as HTMLDivElement

		bgfirst.style.transform = 'scale(1.1) translateX(0px) translate3d(0, 0, 0)'
		bgsecond.style.transform = 'scale(1.1) translateX(0px) translate3d(0, 0, 0)'
	}

	type === 'local' ? localBackgrounds() : unsplashBackgrounds({ unsplash: data.unsplash, cache: local.unsplashCache })
}

//
//
//

export function imgBackground(url: string, color?: string) {
	let img = new Image()

	img.onload = () => {
		const bgoverlay = document.getElementById('background_overlay') as HTMLDivElement
		const bgfirst = document.getElementById('background') as HTMLDivElement
		const bgsecond = document.getElementById('background-bis') as HTMLDivElement
		const loadBis = bgfirst.style.opacity === '1'
		const bgToChange = loadBis ? bgsecond : bgfirst

		bgfirst.style.opacity = loadBis ? '0' : '1'
		bgToChange.style.backgroundImage = `url(${url})`

		bgoverlay.style.opacity = '1'

		if (color && BROWSER === 'safari') {
			document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color)
			setTimeout(() => document.documentElement.style.setProperty('--average-color', color), 400)
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

	if (isEvent && hasblur) eventDebounce({ background_blur: blur })
	if (isEvent && hasbright) eventDebounce({ background_bright: brightness })
}

export function updateBackgroundOption({ freq, refresh }: UpdateOptions) {
	const i_type = document.getElementById('i_type') as HTMLInputElement
	const isLocal = i_type.value === 'local'

	if (freq !== undefined) {
		isLocal ? localBackgrounds({ freq }) : unsplashBackgrounds(undefined, { every: freq })
	}

	if (refresh) {
		isLocal ? localBackgrounds({ refresh }) : unsplashBackgrounds(undefined, { refresh })
	}
}

function backgroundFreq() {
	//
}

function refreshBackground() {
	//
}
