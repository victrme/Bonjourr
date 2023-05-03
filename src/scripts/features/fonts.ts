import { safeFont, modifyWeightOptions, canDisplayInterface } from '..'
import storage from '../storage'

import debounce from '../utils/debounce'
import errorMessage from '../utils/errorMessage'
import { $, testOS } from '../utils'

import { google } from '../types/googleFonts'
import { Font, Sync } from '../types/sync'

type FontList = {
	family: string
	variants: string[]
}[]

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

		const list = json.items.map((item) => ({
			family: item.family,
			variants: noRegulars(noItalics(item.variants)),
		}))

		localStorage.fonts = JSON.stringify(list)
		storage.local.set({ googleFonts: list })

		return list as FontList
	}
}

export default async function customFont(
	init: Font | null,
	event?: { is: 'autocomplete' | 'size' | 'family' | 'weight'; value?: string; elem?: HTMLElement }
) {
	const dominterface = document.getElementById('interface') as HTMLElement

	function setSize(val: string) {
		dominterface.style.fontSize = parseInt(val) / 16 + 'em' // 16 is body px size
	}

	function setWeight(family: string, weight: string) {
		if (weight) {
			const list = safeFont().weights
			dominterface.style.fontWeight = weight
			$('searchbar')!.style.fontWeight = weight

			// Default bonjourr lowers font weight on clock (because we like it)
			const loweredWeight = parseInt(weight) > 100 ? list[list.indexOf(weight) - 1] : weight
			$('clock')!.style.fontWeight = family ? weight : loweredWeight
		}
	}

	function setFamily(family: string, fontface: string) {
		document.getElementById('fontstyle')!.textContent = fontface
		document.getElementById('clock')!.style.fontFamily = `"${family}"`
		document.getElementById('credit')!.style.fontFamily = `"${family}"`
		dominterface.style.fontFamily = `"${family}"`
	}

	async function setFontface(url: string) {
		const resp = await fetch(url)
		const text = await resp.text()
		const fontface = text.replace(/(\r\n|\n|\r|  )/gm, '')

		localStorage.fontface = text

		return fontface
	}

	async function updateFont() {
		function removeFont() {
			const domstyle = $('fontstyle') as HTMLStyleElement
			const domclock = $('clock') as HTMLDivElement
			const domcredit = $('credit') as HTMLDivElement
			const domsearchbar = $('searchbar') as HTMLDivElement

			domstyle.textContent = ''
			domclock.style.fontFamily = ''
			domcredit.style.fontFamily = ''
			dominterface.style.fontFamily = ''

			// weights
			const baseWeight = testOS.windows ? '400' : '300'
			dominterface.style.fontWeight = baseWeight
			domsearchbar.style.fontWeight = baseWeight
			domclock.style.fontWeight = ''

			$('i_weight')?.setAttribute('value', baseWeight)

			return { url: '', family: '', availWeights: [] as string[], weight: baseWeight }
		}

		async function changeFamily(list: FontList, currentFamily: string) {
			//
			// Cherche correspondante
			const domfamily = $('i_customfont') as HTMLInputElement
			const domweight = $('i_weight') as HTMLSelectElement
			const font = list.filter(({ family }) => family.toUpperCase() === currentFamily.toUpperCase())

			// One font has been found
			if (font.length > 0) {
				const { family, variants } = font[0]
				const defaultWeight = variants[variants.indexOf('400')]
				const url = encodeURI(`https://fonts.googleapis.com/css?family=${family}:${defaultWeight}`)
				const fontface = await setFontface(url)

				modifyWeightOptions(variants)
				setFamily(family, fontface)
				setWeight(family, '400')
				domweight.value = '400'

				return { url, family, availWeights: variants, weight: '400' }
			}

			// No fonts found
			else {
				domfamily.value = ''
				safeFont($('settings') as HTMLElement)
				return { url: '', family: '', availWeights: [] as string[], weight: testOS.windows ? '400' : '300' }
			}
		}

		const font = (await new Promise((resolve) => {
			storage.sync.get('font', async ({ font }) => resolve(font))
		})) as Sync['font']

		switch (event?.is) {
			case 'autocomplete': {
				const fontlist = await fetchFontList()
				const fragment = new DocumentFragment()

				fontlist?.forEach(function addOptions(item) {
					const option = document.createElement('option')

					option.textContent = item.family
					option.setAttribute('value', item.family)
					fragment.appendChild(option)
				})

				if (event.elem) {
					event.elem.querySelector('#dl_fontfamily')?.appendChild(fragment)
				}

				break
			}

			case 'family': {
				const val = event.value

				if (val === '') {
					storage.local.remove('fontface')
					safeFont($('settings') as HTMLElement)
					eventDebounce({ font: { size: font.size, ...removeFont() } })
				}

				if (typeof val === 'string' && val.length > 1) {
					const fontlist = await fetchFontList()

					if (fontlist) {
						storage.sync.set({
							font: { size: font.size, ...(await changeFamily(fontlist, val)) },
						})
					}
				}

				$('i_customfont')?.blur()

				break
			}

			case 'weight': {
				if (font.url) {
					font.url = font.url.slice(0, font.url.lastIndexOf(':') + 1)
					font.url += event.value
					setFamily(font.family, await setFontface(font.url))
				}

				// If nothing, removes custom font
				else font.weight = event.value

				setWeight(font.family, event.value || '400')
				eventDebounce({ font: font })
				break
			}

			case 'size': {
				if (event.value) {
					font.size = event.value
					setSize(event.value)
					eventDebounce({ font: font })
				}
				break
			}
		}
	}

	if (event) {
		updateFont()
		return
	}

	// init
	if (init) {
		try {
			setSize(init.size)
			setWeight(init.family, init.weight)

			if (init.family) {
				const fontface = localStorage.fontface || (await setFontface(init.url))
				setFamily(init.family, fontface)
				canDisplayInterface('fonts')
			}
		} catch (e) {
			errorMessage(e)
		}
	}
}
