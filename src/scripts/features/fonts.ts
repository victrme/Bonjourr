import { safeFont, modifyWeightOptions, canDisplayInterface } from '..'
import storage from '../storage'

import debounce from '../utils/debounce'
import errorMessage from '../utils/errorMessage'
import { $, syncDefaults, testOS } from '../utils'

import { google } from '../types/googleFonts'
import { Font } from '../types/sync'

type FontList = {
	family: string
	variants: string[]
}[]

type FontUpdateEvent = {
	autocomplete?: HTMLElement
	size?: string
	family?: string
	weight?: string
}

const eventDebounce = debounce(function (value: { [key: string]: unknown }) {
	storage.sync.set(value)
}, 400)

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
		storage.local.set({ googleFonts: list })

		return list as FontList
	}
}

function setSize(val: string) {
	document.documentElement.style.setProperty('--font-size', parseInt(val) / 16 + 'em') // 16 is body px size
}

function setWeight(family: string, weight: string) {
	if (weight) {
		const list = safeFont().weights
		const clockWeight = parseInt(weight) > 100 ? list[list.indexOf(weight) - 1] : weight

		document.documentElement.style.setProperty('--font-weight', weight)
		document.documentElement.style.setProperty('--font-weight-clock', family ? weight : clockWeight) // Default bonjourr lowers font weight on clock (because we like it)
	}
}

function setFamily(family: string, fontface: string) {
	document.getElementById('fontstyle')!.textContent = fontface
	document.documentElement.style.setProperty('--font-family', `"${family}"`)
}

function removeFont() {
	const domstyle = $('fontstyle') as HTMLStyleElement
	const baseWeight = testOS.windows ? '400' : '300'

	domstyle.textContent = ''
	document.documentElement.style.setProperty('--font-family', '')
	document.documentElement.style.setProperty('--font-weight', baseWeight)
	document.documentElement.style.setProperty('--font-weight-clock', '200')
	document.getElementById('i_weight')?.setAttribute('value', baseWeight)

	return { url: '', family: '', availWeights: [] as string[], weight: baseWeight }
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

async function changeFamily(list: FontList, currentFamily: string) {
	const i_customfont = document.getElementById('i_customfont') as HTMLInputElement
	const i_weight = document.getElementById('i_weight') as HTMLSelectElement

	const foundFonts = list.filter(({ family }) => family.toUpperCase() === currentFamily.toUpperCase())

	if (foundFonts.length > 0) {
		let { family, variants } = foundFonts[0]

		// All this because google fonts API fails
		// when fetching variable weights on non variable fonts (smh google)
		const variableFontList = await (await fetch('src/assets/variablefonts.json')).json()
		const fontIsVariable = variableFontList.includes(family)
		const weights = fontIsVariable ? `${variants[0]}..${variants.at(-1)}` : variants.join(';')
		const url = encodeURI(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@${weights}`)

		let fontface = await fetchFontface(url)

		if (fontface) {
			modifyWeightOptions(variants)
			setFamily(family, fontface)
			setWeight(family, '400')
			i_weight.value = '400'

			return {
				url,
				family,
				weight: '400',
				availWeights: variants,
			}
		}
	}

	safeFont(document.getElementById('settings') as HTMLElement)
	i_customfont.value = ''

	return {
		url: '',
		family: '',
		availWeights: [] as string[],
		weight: testOS.windows ? '400' : '300',
	}
}

async function updateFont(event: FontUpdateEvent) {
	const font: Font = await new Promise((resolve) => {
		storage.sync.get('font', async ({ font }) => {
			resolve(font ?? structuredClone(syncDefaults.font))
		})
	})

	if (event?.autocomplete) {
		const fontlist = await fetchFontList()
		const fragment = new DocumentFragment()

		fontlist?.forEach(function addOptions(item) {
			const option = document.createElement('option')

			option.textContent = item.family
			option.setAttribute('value', item.family)
			fragment.appendChild(option)
		})

		event.autocomplete.querySelector('#dl_fontfamily')?.appendChild(fragment)
	}

	if (typeof event?.family === 'string') {
		const val = event.family

		if (val === '') {
			storage.local.remove('fontface')
			safeFont($('settings') as HTMLElement)
			eventDebounce({ font: { size: font.size, ...removeFont() } })
		}

		if (val.length > 1) {
			const fontlist = (await fetchFontList()) ?? []
			const newFont = await changeFamily(fontlist, val)

			eventDebounce({ font: { size: font.size, ...newFont } })
		}

		document.getElementById('i_customfont')?.blur()
	}

	if (event?.weight) {
		font.weight = event.weight || '400'
		setWeight(font.family, font.weight)
		eventDebounce({ font: font })
	}

	if (event?.size) {
		font.size = event.size
		setSize(event.size)
		eventDebounce({ font: font })
	}
}

export default async function customFont(init: Font | null, event?: FontUpdateEvent) {
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
