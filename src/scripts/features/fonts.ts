import { safeFont, modifyWeightOptions, canDisplayInterface } from '..'
import storage from '../storage'

import debounce from '../utils/debounce'
import errorMessage from '../utils/errorMessage'
import { $, testOS } from '../utils'

import { google } from '../types/googleFonts'
import { Font } from '../types/sync'
import { get, set } from 'idb-keyval'

const eventDebounce = debounce(function (value: { [key: string]: unknown }) {
	storage.sync.set(value)
}, 400)

export default function customFont(
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
		$('fontstyle')!.textContent = fontface
		$('clock')!.style.fontFamily = '"' + family + '"'
		$('credit')!.style.fontFamily = '"' + family + '"'
		dominterface.style.fontFamily = '"' + family + '"'
	}

	async function setFontface(url: string) {
		const resp = await fetch(url)
		const text = await resp.text()
		const fontface = text.replace(/(\r\n|\n|\r|  )/gm, '')
		storage.local.set({ fontface })

		return fontface
	}

	function updateFont() {
		function fetchFontList(callback: (json: google.fonts.WebfontList) => void) {
			storage.local.get('googleFonts', async (local) => {
				//
				// Get list from storage
				if (local.googleFonts) {
					callback(local.googleFonts)
					return
				}

				if (!navigator.onLine) {
					return
				}

				// Get list from API
				const a = 'QUl6YVN5QWt5M0pZYzJyQ09MMWpJc3NHQmdMcjFQVDR5VzE1ak9r'
				const url = 'https://www.googleapis.com/webfonts/v1/webfonts?sort=popularity&key=' + window.atob(a)
				const resp = await fetch(url)

				if (!resp.ok) {
					return // return nothing if smth wrong, will try to fetch next time
				}

				const json = await resp.json()

				// json has at least one available family
				if (json.items?.length > 0 && typeof json.items[0]?.family === 'string') {
					storage.local.set({ googleFonts: json })
					callback(json)
				}
			})
		}

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

		async function changeFamily(json: google.fonts.WebfontList, family: string) {
			//
			// Cherche correspondante
			const domfamily = $('i_customfont') as HTMLInputElement
			const domweight = $('i_weight') as HTMLSelectElement
			const font = json.items.filter((font) => font.family.toUpperCase() === family.toUpperCase())

			// One font has been found
			if (font.length > 0) {
				const availWeights = font[0].variants.filter((variant) => !variant.includes('italic'))
				const defaultWeight = availWeights.includes('regular') ? '400' : availWeights[0]
				const url = encodeURI(`https://fonts.googleapis.com/css?family=${font[0].family}:${defaultWeight}`)
				const fontface = await setFontface(url)

				setFamily(font[0].family, fontface)
				setWeight(font[0].family, '400')
				modifyWeightOptions(availWeights)
				domweight.value = '400'

				return { url, family: font[0].family, availWeights, weight: '400' }
			}

			// No fonts found
			else {
				domfamily.value = ''
				safeFont($('settings') as HTMLElement)
				return { url: '', family: '', availWeights: [] as string[], weight: testOS.windows ? '400' : '300' }
			}
		}

		storage.sync.get('font', async ({ font }) => {
			switch (event?.is) {
				case 'autocomplete': {
					fetchFontList((json) => {
						if (!json) return

						const fragment = new DocumentFragment()

						json.items.forEach(function addOptions(item) {
							const option = document.createElement('option')

							option.textContent = item.family
							option.setAttribute('value', item.family)
							fragment.appendChild(option)
						})

						if (event.elem) {
							event.elem.querySelector('#dl_fontfamily')?.appendChild(fragment)
						}
					})
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
						fetchFontList(async (json) => {
							storage.sync.set({
								font: { size: font.size, ...(await changeFamily(json, val)) },
							})
						})
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
		})
	}

	if (event) {
		updateFont()
		return
	}

	// init
	try {
		if (!init) {
			return
		}

		const { size, family, weight, url } = init

		setSize(size)
		setWeight(family, weight)

		if (family === '') {
			return
		}

		;(async () => {
			console.time('fontface idb')
			await get('fontface')
			console.timeEnd('fontface idb')
		})()
		// Sets family
		console.time('fontface storage.local')

		storage.local.get('fontface', async (local) => {
			console.timeEnd('fontface storage.local')

			setFamily(family, local.fontface || (await setFontface(url))) // fetch font-face data if none in storage
			canDisplayInterface('fonts')
		})
	} catch (e) {
		errorMessage(e)
	}
}
