import { canDisplayInterface } from '../index'
import storage from '../storage'

import { PLATFORM, SYSTEM_OS } from '../defaults'
import { eventDebounce } from '../utils/debounce'
import onSettingsLoad from '../utils/onsettingsload'
import errorMessage from '../utils/errormessage'
import { tradThis } from '../utils/translations'
import { subsets } from '../langs'
import superinput from '../utils/superinput'

import { Font } from '../types/sync'
import { apiFetch } from '../utils'

interface Fontsource {
	id: string
	family: string
	subsets: string[]
	weights: number[]
	styles: string[]
	defSubset: string
	variable: boolean
	lastModified: string
	category: string
	license: string
	type: 'google' | 'other'
}

type FontUpdateEvent = {
	autocomplete?: true
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

async function waitForFontLoad(family: string): Promise<Boolean> {
	return new Promise((resolve) => {
		let limitcounter = 0
		let hasLoadedFont = systemFontChecker(family)
		let interval = setInterval(() => {
			if (hasLoadedFont || limitcounter === 100) {
				clearInterval(interval)
				return resolve(true)
			} else {
				hasLoadedFont = systemFontChecker(family)
				limitcounter++
			}
		}, 100)
	})
}

async function fetchFontList(): Promise<Fontsource[]> {
	try {
		const resp = await apiFetch('/fonts')
		const json = await resp?.json()
		return (json ?? []) as Fontsource[]
	} catch (error) {
		console.log(error)
		return []
	}
}

async function getNewFont(newfamily: string): Promise<Pick<Font, 'id' | 'family' | 'weightlist' | 'weight'> | undefined> {
	const list = await fetchFontList()
	const font = list.filter(({ family }) => family.toLowerCase() === newfamily.toLowerCase())

	if (font.length > 0) {
		return {
			weight: '400',
			id: font[0].id,
			family: font[0].family,
			weightlist: font[0].weights.map((w) => w.toString()),
		}
	}
}

function setFontFace(id: string, family: string, weight: string) {
	const subset = getRequiredSubset()

	const fontface = `
		@font-face {font-family: "${family}";
			src: url(https://cdn.jsdelivr.net/fontsource/fonts/${id}@latest/${subset}-${weight}-normal.woff2) format('woff2');
		}`

	document.getElementById('fontface')!.textContent += '\n\n' + fontface
}

function setSize(val: string) {
	document.documentElement.style.setProperty('--font-size', parseInt(val) / 16 + 'em') // 16 is body px size
}

function setWeight(family: string, weight: string) {
	const clockWeight = parseInt(weight) > 100 ? systemfont.weights[systemfont.weights.indexOf(weight) - 1] : weight

	document.documentElement.style.setProperty('--font-weight', weight)
	document.documentElement.style.setProperty('--font-weight-clock', family ? weight : clockWeight) // Default bonjourr lowers font weight on clock (because we like it)
}

function setFamily(family: string) {
	document.documentElement.style.setProperty('--font-family', family ? `"${family}"` : null)
}

function getRequiredSubset(): string {
	const lang = document.documentElement.getAttribute('lang') ?? 'en'

	if (lang in subsets) {
		return subsets[lang as keyof typeof subsets]
	} else {
		return 'latin'
	}
}

async function setAutocompleteSettings() {
	const dl_fontfamily = document.querySelector<HTMLDataListElement>('#dl_fontfamily')

	if (dl_fontfamily?.childElementCount === 0) {
		const resp = await apiFetch('/fonts')
		const list = (await resp?.json()) as Fontsource[]
		const fragment = new DocumentFragment()
		const requiredSubset = getRequiredSubset()

		for (const item of list) {
			if (item.subsets.includes(requiredSubset)) {
				const option = document.createElement('option')
				option.textContent = item.family
				option.value = item.family
				fragment.appendChild(option)
			}
		}

		dl_fontfamily?.appendChild(fragment)
	}
}

async function setWeightSettings(weights: string[]) {
	const options = document.querySelectorAll<HTMLOptionElement>('#i_weight option')

	for (const option of options) {
		option.classList.toggle('hidden', weights.includes(option.value) === false)
	}
}

async function initFontSettings(font?: Font) {
	const settings = document.getElementById('settings') as HTMLElement
	const hasCustomWeights = font && font.weightlist.length > 0
	const weights = hasCustomWeights ? font.weightlist : systemfont.weights
	const family = font?.family || systemfont.placeholder

	settings.querySelector('#i_customfont')?.setAttribute('placeholder', family)

	setWeightSettings(weights)

	if (font?.family) {
		setAutocompleteSettings()
	}
}

async function updateFont({ family, weight, size }: FontUpdateEvent) {
	const i_customfont = document.getElementById('i_customfont') as HTMLInputElement
	const isRemovingFamily = typeof family === 'string' && family.length === 0
	const isChangingFamily = typeof family === 'string' && family.length > 1

	const { font } = await storage.sync.get('font')

	if (isRemovingFamily) {
		const i_weight = document.getElementById('i_weight') as HTMLInputElement
		const baseWeight = SYSTEM_OS === 'windows' ? '400' : '300'

		document.documentElement.style.setProperty('--font-family', '')
		document.documentElement.style.setProperty('--font-weight-clock', '200')
		document.documentElement.style.setProperty('--font-weight', baseWeight)

		for (const el of document.querySelectorAll('.fontface')) {
			el.remove()
		}

		setWeight('', '400')
		setWeightSettings(systemfont.weights)

		i_customfont.value = ''
		i_customfont.placeholder = systemfont.placeholder
		i_weight.value = baseWeight

		const defaultFont: Font = {
			id: '',
			family: '',
			size: font.size,
			weightlist: [],
			weight: baseWeight,
		}

		eventDebounce({ font: defaultFont })
	}

	if (isChangingFamily) {
		const i_weight = document.getElementById('i_weight') as HTMLSelectElement

		let newfont: Font = {
			id: '',
			family: '',
			weight: '400',
			size: font.size,
			weightlist: ['200', '300', '400', '500', '600', '700', '800', '900'],
		}

		if (systemFontChecker(family)) {
			newfont.family = family
		} else {
			familyInput.load()

			const allfonts = await getNewFont(family)

			if (allfonts && navigator.onLine) {
				newfont = { ...newfont, ...allfonts }
				setFontFace(newfont.id, newfont.family, newfont.weight)

				await waitForFontLoad(family)
				familyInput.toggle(false, family)
			}
		}

		if (newfont.family === '') {
			familyInput.warn(`Cannot load "${family}"`)
			return
		}

		setWeightSettings(newfont.weightlist)
		setWeight(family, '400')
		setFamily(family)

		i_weight.value = '400'

		eventDebounce({ font: newfont })
	}

	if (weight) {
		font.weight = weight || '400'
		setWeight(font.family, font.weight)
		setFontFace(font.id, font.family, font.weight)
		eventDebounce({ font: font })
	}

	if (size) {
		font.size = size
		setSize(size)
		eventDebounce({ font: font })
	}
}

export default async function customFont(init?: Font, event?: FontUpdateEvent) {
	if (event?.autocomplete) {
		setAutocompleteSettings()
		return
	}

	if (event) {
		updateFont(event)
		return
	}

	if (init) {
		try {
			const { size, family, weight, id } = init

			setSize(size)
			setWeight(family, weight)
			setFamily(family)

			if (id && family && weight) {
				setFontFace(id, family, weight)
			}

			onSettingsLoad(() => initFontSettings(init))
			canDisplayInterface('fonts')
		} catch (e) {
			errorMessage(e)
		}
	}
}
