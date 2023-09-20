import { canDisplayInterface } from '..'
import storage from '../storage'

import superinput from '../utils/superinput'
import errorMessage from '../utils/errorMessage'
import { eventDebounce } from '../utils/debounce'
import { PLATFORM, SYSTEM_OS } from '../utils'

import { google } from '../types/googleFonts'
import { Font } from '../types/sync'
import parse from '../utils/JSONparse'
import { tradThis } from '../utils/translations'

type FontList = {
	family: string
	variants: string[]
}[]

type FontUpdateEvent = {
	autocomplete?: HTMLElement
	initsettings?: HTMLElement
	size?: string
	family?: string
	weight?: string
}

const familyInput = superinput('i_customfont')

const systemfont = (function () {
	const fonts = {
		fallback: { placeholder: 'Arial', weights: ['500', '600', '800'] },
		windows: { placeholder: 'Segoe UI', weights: ['300', '400', '600', '700', '800'] },
		android: { placeholder: 'Roboto', weights: ['100', '300', '400', '500', '700', '900'] },
		linux: { placeholder: 'Fira Sans', weights: ['100', '200', '300', '400', '500', '600', '700', '800', '900'] },
		apple: { placeholder: 'SF Pro Display', weights: ['100', '200', '300', '400', '500', '600', '700', '800', '900'] },
	}

	if (SYSTEM_OS === 'windows') return fonts.windows
	else if (SYSTEM_OS === 'android') return fonts.android
	else if (SYSTEM_OS === 'mac') return fonts.apple
	else if (SYSTEM_OS === 'ios') return fonts.apple
	else return fonts.linux
})()

// Needs a special method to detect system fonts.
// Because of fingerprinting concerns,
// Firefox and safari made fonts.check() useless
function systemFontChecker(family: string): boolean {
	const p = document.createElement('p')
	p.setAttribute('style', 'position: absolute; opacity: 0; font-family: invalid font;')
	p.textContent = 'mqlskdjfhgpaozieurytwnxbcv?./,;:1234567890' + tradThis('New tab')
	document.getElementById('interface')?.prepend(p)

	const first_w = p.getBoundingClientRect().width
	p.style.fontFamily = `'${family}'`

	const second_w = p.getBoundingClientRect().width
	const hasLoadedFont = first_w !== second_w

	p.remove()

	return hasLoadedFont
}

function waitForFontLoad(cb: Function) {
	const p = document.createElement('p')
	p.setAttribute('style', 'position: absolute; opacity: 0;')
	p.textContent = 'mqlskdjfhgpaozieurytwnxbcv?./,;:1234567890' + tradThis('New tab')
	document.getElementById('interface')?.prepend(p)

	let lastwidth = p.getBoundingClientRect().width
	let currwidth = lastwidth

	let interval = setInterval(() => {
		currwidth = p.getBoundingClientRect().width

		console.log(lastwidth, currwidth)

		if (currwidth !== lastwidth) {
			clearInterval(interval)
			p.remove()
			cb()
		}

		lastwidth = currwidth
	}, 100)
}

async function fetchFontList() {
	const fonts = parse(localStorage.fonts) ?? []

	if (fonts.length > 0) {
		return fonts as FontList
	}

	if (!navigator.onLine) {
		return
	}

	// Get list from API
	const a = 'QUl6YVN5QWt5M0pZYzJyQ09MMWpJc3NHQmdMcjFQVDR5VzE1ak9r'
	const url = 'https://www.googleapis.com/webfonts/v1/webfonts?sort=popularity&key=' + window.atob(a)
	const resp = await fetch(url)

	// return nothing if smth wrong, will try to fetch next time
	if (!resp.ok) {
		console.warn("Couldn't fetch google fonts")
		return
	}

	const json = (await resp.json()) as google.fonts.WebfontList

	// json has at least one available family
	if (json.items?.length > 0 && 'family' in json.items[0]) {
		const noRegulars = (arr: string[]) => arr.map((weight) => weight.replace('regular', '400'))
		const noItalics = (arr: string[]) => arr.filter((str) => !str.includes('italic'))

		const list = json.items.map((item) => ({ family: item.family, variants: noRegulars(noItalics(item.variants)) }))

		localStorage.fonts = JSON.stringify(list)

		return list as FontList
	}
}

async function fetchFontface(url: string) {
	if (!url) {
		return null
	}

	try {
		const resp = await fetch(url)
		const text = await resp.text()
		const fontface = text.replace(/(\r\n|\n|\r|  )/gm, '')

		return fontface
	} catch (error) {
		return null
	}
}

async function getNewFont(list: FontList, currentFamily: string) {
	const foundFonts = list.filter(({ family }) => family.toUpperCase() === currentFamily.toUpperCase())

	if (foundFonts.length > 0) {
		let { family, variants } = foundFonts[0]
		let url = 'https://fonts.googleapis.com/'

		// All this because google fonts API fails
		// when fetching variable weights on non variable fonts (smh google)
		const variableFontList = ((await (await fetch('src/assets/variablefonts.json')).json()) as string[]) ?? []
		const fontIsVariable = variableFontList.includes(family)

		// no variable fonts on firefox because of aggregious load times (~70ms)
		if (fontIsVariable && PLATFORM !== 'firefox') {
			url += encodeURI(`css2?family=${family.replace(/ /g, '+')}:wght@${variants[0]}..${variants.at(-1)}`)
		} else {
			url += encodeURI(`css?family=${family.replace(/ /g, '+')}:wght@${variants.join(';')}`)
		}

		return {
			url,
			family,
			weight: '400',
			availWeights: variants,
		}
	}

	return {
		url: '',
		family: '',
		availWeights: [] as string[],
		weight: SYSTEM_OS === 'windows' ? '400' : '300',
	}
}

function setSize(val: string) {
	document.documentElement.style.setProperty('--font-size', parseInt(val) / 16 + 'em') // 16 is body px size
}

function setWeight(family: string, weight: string) {
	const clockWeight = parseInt(weight) > 100 ? systemfont.weights[systemfont.weights.indexOf(weight) - 1] : weight

	document.documentElement.style.setProperty('--font-weight', weight)
	document.documentElement.style.setProperty('--font-weight-clock', family ? weight : clockWeight) // Default bonjourr lowers font weight on clock (because we like it)
}

function setFamily(family: string, fontface: string) {
	document.getElementById('fontstyle')!.textContent = fontface
	document.documentElement.style.setProperty('--font-family', family ? `"${family}"` : null)
}

async function setAutocompleteSettings(settingsDom: HTMLElement) {
	const dl_fontfamily = settingsDom.querySelector('#dl_fontfamily') as HTMLSelectElement

	if (dl_fontfamily.childElementCount > 0) {
		return
	}

	const fontlist = await fetchFontList()
	const fragment = new DocumentFragment()

	for (const item of fontlist ?? []) {
		const option = document.createElement('option')
		option.textContent = item.family
		option.value = item.family
		fragment.appendChild(option)
	}

	dl_fontfamily?.appendChild(fragment)
}

async function setWeightSettings(weights: string[], settingsDom?: HTMLElement) {
	const settings = settingsDom ? settingsDom : document.getElementById('settings')
	const options = settings?.querySelectorAll<HTMLOptionElement>('#i_weight option')

	options?.forEach((option) => {
		const weightExists = weights.includes(option.value)
		option.classList.toggle('hidden', !weightExists)
	})
}

async function initFontSettings(settingsDom: HTMLElement, font: Font | null) {
	const hasCustomWeights = font && font.availWeights.length > 0
	const weights = hasCustomWeights ? font.availWeights : systemfont.weights
	const family = font?.family || systemfont.placeholder

	settingsDom.querySelector('#i_customfont')?.setAttribute('placeholder', family)
	setWeightSettings(weights, settingsDom)

	if (font?.url) {
		setAutocompleteSettings(settingsDom)
	}
}

async function updateFont({ family, weight, size }: FontUpdateEvent) {
	const i_customfont = document.getElementById('i_customfont') as HTMLInputElement
	const isRemovingFamily = typeof family === 'string' && family.length === 0
	const isChangingFamily = typeof family === 'string' && family.length > 1

	const { font } = await storage.get('font')

	if (isRemovingFamily) {
		const i_weight = document.getElementById('i_weight') as HTMLInputElement
		const domstyle = document.getElementById('fontstyle') as HTMLStyleElement
		const baseWeight = SYSTEM_OS === 'windows' ? '400' : '300'

		domstyle.textContent = ''
		document.documentElement.style.setProperty('--font-family', '')
		document.documentElement.style.setProperty('--font-weight-clock', '200')
		document.documentElement.style.setProperty('--font-weight', baseWeight)

		localStorage.removeItem('fontface')

		setWeight('', '400')
		setWeightSettings(systemfont.weights)

		i_customfont.value = ''
		i_customfont.placeholder = systemfont.placeholder
		i_weight.value = baseWeight

		eventDebounce({ font: { size: font.size, url: '', family: '', availWeights: [], weight: baseWeight } })
	}

	if (isChangingFamily) {
		const i_weight = document.getElementById('i_weight') as HTMLSelectElement

		let fontface = ''
		let newfont = {
			url: '',
			family: '',
			weight: '400',
			availWeights: ['200', '300', '400', '500', '600', '700', '800', '900'],
		}

		if (systemFontChecker(family)) {
			newfont.family = family
		} else {
			familyInput.load()
			const fontlist = (await fetchFontList()) ?? []
			newfont = await getNewFont(fontlist, family)
			fontface = (await fetchFontface(newfont.url)) ?? ''

			if (fontface) {
				waitForFontLoad(() => {
					familyInput.toggle(false, family)
				})
			} else {
				familyInput.warn(`Cannot load "${family}"`)
			}
		}

		if (newfont.family) {
			setFamily(family, fontface)
			setWeight(family, '400')
			i_weight.value = '400'
			localStorage.fontface = fontface
			setWeightSettings(newfont.availWeights)
			eventDebounce({ font: { size: font.size, ...newfont } })
		}
	}

	if (weight) {
		font.weight = weight || '400'
		setWeight(font.family, font.weight)
		eventDebounce({ font: font })
	}

	if (size) {
		font.size = size
		setSize(size)
		eventDebounce({ font: font })
	}
}

export default async function customFont(init: Font | null, event?: FontUpdateEvent) {
	if (event?.initsettings) {
		return initFontSettings(event?.initsettings, init)
	}

	if (event?.autocomplete) {
		return setAutocompleteSettings(event?.autocomplete)
	}

	if (event) {
		return updateFont(event)
	}

	if (init) {
		try {
			setSize(init.size)
			setWeight(init.family, init.weight)

			if (init.family) {
				let fontface = localStorage.fontface

				if (init.url && !fontface?.includes('@font-face')) {
					fontface = await fetchFontface(init.url)
					localStorage.fontface = fontface
				}

				setFamily(init.family, fontface)
				canDisplayInterface('fonts')
			}
		} catch (e) {
			errorMessage(e)
		}
	}
}
