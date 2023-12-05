import { canDisplayInterface } from '../index'
import storage from '../storage'

import { SYSTEM_OS } from '../defaults'
import { eventDebounce } from '../utils/debounce'
import onSettingsLoad from '../utils/onsettingsload'
import errorMessage from '../utils/errormessage'
import { tradThis } from '../utils/translations'
import { subsets } from '../langs'
import superinput from '../utils/superinput'

import { Font, Sync } from '../types/sync'
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

type CustomFontUpdate = {
	autocomplete?: true
	lang?: true
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

async function getFontList(): Promise<Fontsource[]> {
	try {
		const resp = await apiFetch('/fonts')
		const json = ((await resp?.json()) ?? []) as Fontsource[]
		return json.filter((font) => font.subsets.includes(getRequiredSubset()))
	} catch (error) {
		console.log(error)
		return []
	}
}

async function getNewFont(newfamily: string): Promise<Pick<Font, 'id' | 'family' | 'weightlist' | 'weight'> | undefined> {
	const list = await getFontList()
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

function setFontFace({ family, id, weight }: Font) {
	let fontface = `
		@font-face {font-family: "${family}";
			src: url(https://cdn.jsdelivr.net/fontsource/fonts/${id}@latest/latin-${weight}-normal.woff2) format('woff2');
		}
`

	const subset = getRequiredSubset()
	if (subset !== 'latin') fontface += fontface.replace('latin', subset)

	document.getElementById('fontface')!.textContent += fontface
}

function setSize(val: string) {
	document.documentElement.style.setProperty('--font-size', parseInt(val) / 16 + 'em') // 16 is body px size
}

function setWeight({ family, weight }: Font) {
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

async function setAutocompleteSettings(isLangSwitch?: boolean) {
	const dl_fontfamily = document.querySelector<HTMLDataListElement>('#dl_fontfamily')

	if (isLangSwitch) {
		dl_fontfamily?.childNodes.forEach((node) => node.remove())
	}

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

async function updateFontFamily(data: Sync, family: string): Promise<Font> {
	const i_customfont = document.getElementById('i_customfont') as HTMLInputElement
	const i_weight = document.getElementById('i_weight') as HTMLInputElement

	const familyType = family.length == 0 ? 'none' : systemFontChecker(family) ? 'system' : 'fontsource'

	let font: Font = {
		id: '',
		family: '',
		size: data.font.size,
		weight: SYSTEM_OS === 'windows' ? '400' : '300',
		weightlist: systemfont.weights,
	}

	switch (familyType) {
		case 'none': {
			setFamily('')
			setWeight(font)
			setWeightSettings(font.weightlist)

			i_customfont.value = ''
			i_customfont.placeholder = systemfont.placeholder
			i_weight.value = font.weight
			break
		}

		case 'system': {
			familyInput.load()
			await waitForFontLoad(family)
			font.family = family
			familyInput.toggle(false, family)
			break
		}

		case 'fontsource': {
			familyInput.load()

			const newfont = await getNewFont(family)

			if (newfont && navigator.onLine) {
				font = { ...font, ...newfont }
				setFontFace(font)

				await waitForFontLoad(family)
				familyInput.toggle(false, family)
			}

			if (font.family === '') {
				familyInput.warn(`Cannot load "${family}"`)
				return data.font
			}
			break
		}
	}

	setWeight(font)
	setFamily(font.family)
	setWeightSettings(font.weightlist)

	i_weight.value = font.weight

	return font
}

async function updateCustomFont({ family, weight, size }: CustomFontUpdate) {
	const data = await storage.sync.get('font')

	if (typeof family === 'string') {
		data.font = await updateFontFamily(data, family)
	}

	if (weight) {
		data.font.weight = weight || '400'
		setWeight(data.font)
		setFontFace(data.font)
	}

	if (size) {
		data.font.size = size
		setSize(size)
	}

	eventDebounce({ font: data.font })
}

async function handleFontSubsetOnLangSwitch() {
	const data = await storage.sync.get('font')
	const noCustomOrSystemFont = !data.font.family //|| systemFontChecker(data.font.family) TODODODOODO

	if (noCustomOrSystemFont) {
		return
	}

	const newfont = await getNewFont(data.font.family)

	// remove font if not available with subset
	if (newfont === undefined) {
		updateCustomFont({ family: '' })
		return
	}

	data.font = { ...data.font, ...newfont }
	setFontFace(data.font)
	setAutocompleteSettings(true)
}

export default async function customFont(init?: Font, event?: CustomFontUpdate) {
	if (event?.lang) {
		handleFontSubsetOnLangSwitch()
		return
	}

	if (event?.autocomplete) {
		setAutocompleteSettings()
		return
	}

	if (event) {
		updateCustomFont(event)
		return
	}

	if (init) {
		try {
			const { size, family, weight, id } = init

			setSize(size)
			setFamily(family)
			setWeight(init)

			if (id && family && weight) {
				setFontFace(init)
			}

			onSettingsLoad(() => initFontSettings(init))
			canDisplayInterface('fonts')
		} catch (e) {
			errorMessage(e)
		}
	}
}
