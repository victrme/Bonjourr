import { canDisplayInterface } from '..'
import storage from '../storage'

import errorMessage from '../utils/errorMessage'
import { eventDebounce } from '../utils/debounce'
import { testOS } from '../utils'

import { google } from '../types/googleFonts'
import { Font } from '../types/sync'

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

const systemfont = (function () {
	const fonts = {
		fallback: { placeholder: 'Arial', weights: ['500', '600', '800'] },
		windows: { placeholder: 'Segoe UI', weights: ['300', '400', '600', '700', '800'] },
		android: { placeholder: 'Roboto', weights: ['100', '300', '400', '500', '700', '900'] },
		linux: { placeholder: 'Fira Sans', weights: ['100', '200', '300', '400', '500', '600', '700', '800', '900'] },
		apple: { placeholder: 'SF Pro Display', weights: ['100', '200', '300', '400', '500', '600', '700', '800', '900'] },
	}

	const { windows, android, mac, ios } = testOS
	const notAppleOrWindows = !mac && !windows && !ios

	if (windows) return fonts.windows
	if (android) return fonts.android
	if (mac || ios) return fonts.apple
	if (notAppleOrWindows) return fonts.linux

	return fonts.fallback
})()

async function fetchFontList() {
	const fonts = JSON.parse(localStorage.fonts ?? '{}')

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
	try {
		const resp = await fetch(url)
		const text = await resp.text()
		const fontface = text.replace(/(\r\n|\n|\r|  )/gm, '')

		localStorage.fontface = fontface

		return fontface
	} catch (error) {
		return null
	}
}

async function getNewFont(list: FontList, currentFamily: string) {
	const foundFonts = list.filter(({ family }) => family.toUpperCase() === currentFamily.toUpperCase())

	if (foundFonts.length > 0) {
		let { family, variants } = foundFonts[0]

		// All this because google fonts API fails
		// when fetching variable weights on non variable fonts (smh google)
		const variableFontList = (await (await fetch('src/assets/variablefonts.json')).json()) ?? []
		const fontIsVariable = variableFontList.includes(family)
		const weights = fontIsVariable ? `${variants[0]}..${variants.at(-1)}` : variants.join(';')
		const url = encodeURI(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@${weights}`)

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
		weight: testOS.windows ? '400' : '300',
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
	const fontlist = await fetchFontList()
	const fragment = new DocumentFragment()

	fontlist?.forEach(function addOptions(item) {
		const option = document.createElement('option')

		option.textContent = item.family
		option.setAttribute('value', item.family)
		fragment.appendChild(option)
	})

	settingsDom.querySelector('#dl_fontfamily')?.appendChild(fragment)
}

async function setWeightSettings(weights: string[], settingsDom?: HTMLElement) {
	const settings = settingsDom ? settingsDom : document.getElementById('settings')
	const options = settings?.querySelectorAll<HTMLOptionElement>('#i_weight option')

	options?.forEach((option) => {
		const weightExists = weights.includes(option.value)
		option.classList.toggle('hidden', !weightExists)
	})
}

async function initFontSettings(font: Font, settingsDom: HTMLElement) {
	settingsDom.querySelector('#i_customfont')?.setAttribute('placeholder', systemfont.placeholder)
	setWeightSettings(font.availWeights.length === 0 ? systemfont.weights : font.availWeights, settingsDom)

	if (font.family) {
		setAutocompleteSettings(settingsDom)
	}
}

async function updateFont({ family, weight, size }: FontUpdateEvent) {
	const isRemovingFamily = typeof family === 'string' && family.length === 0
	const isChangingFamily = typeof family === 'string' && family.length > 1

	const { font } = await storage.get('font')

	if (isRemovingFamily) {
		const i_customfont = document.getElementById('i_customfont') as HTMLInputElement
		const i_weight = document.getElementById('i_weight') as HTMLInputElement
		const domstyle = document.getElementById('fontstyle') as HTMLStyleElement
		const baseWeight = testOS.windows ? '400' : '300'

		domstyle.textContent = ''
		document.documentElement.style.setProperty('--font-family', '')
		document.documentElement.style.setProperty('--font-weight-clock', '200')
		document.documentElement.style.setProperty('--font-weight', baseWeight)

		localStorage.removeItem('fontface')

		setWeight('', '400')
		setWeightSettings(systemfont.weights)

		i_customfont?.blur()
		i_customfont.value = ''
		i_weight.value = baseWeight

		eventDebounce({ font: { size: font.size, url: '', family: '', availWeights: [], weight: baseWeight } })
	}

	if (isChangingFamily) {
		const i_weight = document.getElementById('i_weight') as HTMLSelectElement
		const fontlist = (await fetchFontList()) ?? []
		const newfont = await getNewFont(fontlist, family)
		const fontface = await fetchFontface(newfont.url)

		if (fontface) {
			setFamily(family, fontface)
			setWeight(family, '400')
			i_weight.value = '400'

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
	if (event?.initsettings && init) return initFontSettings(init, event?.initsettings)
	if (event?.autocomplete) return setAutocompleteSettings(event?.autocomplete)

	if (event) {
		updateFont(event)
		return
	}

	if (init) {
		try {
			setSize(init.size)
			setWeight(init.family, init.weight)

			if (init.family) {
				const fontface = localStorage.fontface || (await fetchFontface(init.url))
				setFamily(init.family, fontface)
				canDisplayInterface('fonts')
			}
		} catch (e) {
			errorMessage(e)
		}
	}
}
