import { isAmpmPosition, isDateFormat, isFace, isHands, isShape } from './helpers.ts'
import { toggleTimezoneOptions, toggleWorldClocksOptions } from './world.ts'
import { hexColorFromSplitRange } from '../../shared/dom.ts'
import { displayInterface } from '../../shared/display.ts'
import { displayGreetings } from './greetings.ts'
import { onSettingsLoad } from '../../utils/onsettingsload.ts'
import { eventDebounce } from '../../utils/debounce.ts'
import { stringMaxSize } from '../../shared/generic.ts'
import { SYNC_DEFAULT } from '../../defaults.ts'
import { getLang } from '../../utils/translations.ts'
import { storage } from '../../storage.ts'
import { startClock } from './clock.ts'

import type { AnalogStyle, Sync } from '../../../types/sync.ts'
import type { Greetings } from './greetings.ts'

interface ClockUpdate {
	ampm?: boolean
	ampmlabel?: boolean
	ampmposition?: string
	analog?: boolean
	seconds?: boolean
	dateformat?: string
	greeting?: string
	greetingsize?: string
	greetingsmode?: string
	greetingscustom?: {
		morning?: string
		afternoon?: string
		evening?: string
		night?: string
	}
	timezone?: string
	shape?: string
	face?: string
	hands?: string
	size?: number
	border?: 'opacity' | 'shade'
	background?: 'opacity' | 'shade'
	worldclocks?: boolean
	world?: {
		index: number
		region?: string
		timezone?: string
	}
}

const defaultAnalogStyle: AnalogStyle = {
	face: 'none',
	hands: 'modern',
	shape: 'round',
	border: '#ffff',
	background: '#fff2',
}

const sinogramRegex = /zh-CN|zh-HK|ja/
const defaultTimezones = ['Europe/Paris', 'America/Sao_Paulo', 'America/Los_Angeles', 'Asia/Tokyo', 'Asia/Kolkata']
const defaultRegions = ['Paris', 'New York', 'Tokyo', 'Lisbon', 'Los Angeles']

export function clock(init?: Sync, event?: ClockUpdate) {
	if (event) {
		clockUpdate(event)
		return
	}

	const clock = init?.clock ?? { ...SYNC_DEFAULT.clock }
	const world = init?.worldclocks ?? { ...SYNC_DEFAULT.worldclocks }
	const dateformat = init?.dateformat || 'eu'
	const greetings: Greetings = {
		name: init?.greeting || '',
		mode: init?.greetingsmode || 'auto',
		custom: init?.greetingscustom,
	}

	try {
		startClock({ clock, world, greetings, dateformat })
		greetingSize(init?.greetingsize)
		analogStyle(init?.analogstyle)
		clockSize(clock.size)
		displayInterface('clock')
		onSettingsLoad(toggleWorldClocksOptions)
	} catch (err) {
		console.info(err)
	}
}

//	Update

async function clockUpdate(update: ClockUpdate) {
	const data = await storage.sync.get()
	const analogstyle = data.analogstyle ?? structuredClone(defaultAnalogStyle)

	if (update.analog !== undefined) {
		document.getElementById('analog_options')?.classList.toggle('shown', update.analog)
		document.getElementById('digital_options')?.classList.toggle('shown', !update.analog)
	}

	if (isDateFormat(update.dateformat)) {
		data.dateformat = update.dateformat
		storage.sync.set({ dateformat: update.dateformat })
	}

	if (update.greeting !== undefined) {
		data.greeting = stringMaxSize(update.greeting, 64)

		displayGreetings({
			mode: data.greetingsmode,
			name: data.greeting,
			custom: data.greetingscustom,
		})

		storage.sync.set({ greeting: data.greeting })
	}

	if (update.greetingsize !== undefined) {
		greetingSize(update.greetingsize)
		storage.sync.set({ greetingsize: update.greetingsize })
	}

	if (update.greetingsmode !== undefined) {
		const domoptions = document.getElementById('greetingscustom_options')
		const mode = update.greetingsmode as 'auto' | 'custom'

		data.greetingsmode = mode
		storage.sync.set({ greetingsmode: mode })

		domoptions?.classList.toggle('shown', mode === 'custom')
		displayGreetings({ mode, name: data.greeting, custom: data.greetingscustom })
	}

	if (update.greetingscustom !== undefined) {
		const newCustoms = {
			...data.greetingscustom,
			...update.greetingscustom,
		}

		data.greetingscustom = newCustoms
		storage.sync.set({ greetingscustom: newCustoms })

		displayGreetings({
			mode: data.greetingsmode,
			name: data.greeting,
			custom: newCustoms,
		})
	}

	if (isHands(update.hands)) {
		analogstyle.hands = update.hands
	}

	if (isShape(update.shape)) {
		analogstyle.shape = update.shape
	}

	if (isFace(update.face)) {
		analogstyle.face = update.face
	}

	if (update.background || update.border) {
		const option = update.background ? 'background' : 'border'

		analogstyle[option] = hexColorFromSplitRange(`#analog-${option}-range`)
		analogStyle(analogstyle)

		if (update?.[option] === 'opacity') {
			eventDebounce({ analogstyle })
		}
		if (update?.[option] === 'shade') {
			storage.sync.set({ analogstyle })
		}

		return
	}

	if (update.worldclocks !== undefined) {
		data.clock.worldclocks = update.worldclocks
		toggleTimezoneOptions(data)
	}

	if (update.world !== undefined) {
		const index = update.world.index
		const baseclock = { region: defaultRegions[index], timezone: defaultTimezones[index] }
		const worldclock = data.worldclocks?.[index] ?? baseclock
		const { region, timezone } = update.world

		if (region !== undefined) {
			worldclock.region = region
		}
		if (timezone !== undefined) {
			worldclock.timezone = timezone
		}

		data.worldclocks[index] = worldclock
		toggleWorldClocksOptions()
		toggleTimezoneOptions(data)
	}

	data.clock = {
		ampm: update.ampm ?? data.clock.ampm,
		size: update.size ?? data.clock.size,
		analog: update.analog ?? data.clock.analog,
		seconds: update.seconds ?? data.clock.seconds,
		timezone: update.timezone ?? data.clock.timezone,
		ampmlabel: update.ampmlabel ?? data.clock.ampmlabel,
		ampmposition: isAmpmPosition(update.ampmposition) ? update.ampmposition : data.clock.ampmposition,
		worldclocks: update.worldclocks ?? data.clock.worldclocks,
	}

	storage.sync.set({
		clock: data.clock,
		worldclocks: data.worldclocks,
		analogstyle: analogstyle,
		dateformat: data.dateformat,
	})

	startClock({
		clock: data.clock,
		world: data.worldclocks,
		dateformat: data.dateformat,
		greetings: {
			name: data.greeting,
			mode: data.greetingsmode,
			custom: data.greetingscustom,
		},
	})

	analogStyle(data.analogstyle)
	clockSize(data.clock.size)
}

function analogStyle(style: AnalogStyle = structuredClone(defaultAnalogStyle)) {
	const { face, shape, hands } = style

	const time = document.getElementById('time') as HTMLElement
	const spans = document.querySelectorAll<HTMLSpanElement>('.analog .analog-face span')

	const backgroundAlpha = Number.parseInt(style.background.slice(4), 16)
	const isWhiteOpaque = style.background?.includes('fff') && backgroundAlpha > 7
	const isTransparent = backgroundAlpha === 0

	let faceNumbers = ['12', '3', '6', '9']
	const lang = getLang()

	if (lang === 'am') {
		faceNumbers = ['Գ', 'Զ', 'Թ', 'ԺԲ']
	} else if (lang === 'ar') {
		faceNumbers = ['٣', '٦', '٩', '١٢']
	} else if (lang === 'fa') {
		faceNumbers = ['۳', '۶', '۹', '۱۲']
	} else if (lang.match(sinogramRegex)) {
		faceNumbers = ['三', '六', '九', '十二']
	}

	spans.forEach((span, i) => {
		if (face === 'roman') {
			span.textContent = ['XII', 'III', 'VI', 'IX'][i % 4]
		} else if (face === 'marks') {
			span.textContent = ['│', '―', '│', '―'][i % 4]
		} else if (face === 'number') {
			span.textContent = faceNumbers[i % 4]
		} else {
			span.textContent = ''
		}
	})

	time.dataset.face = face === 'swiss' || face === 'braun' ? face : ''
	time.dataset.shape = shape || ''
	time.dataset.hands = hands || ''

	time.classList.toggle('transparent', isTransparent)
	time.classList.toggle('white-opaque', isWhiteOpaque)

	time.style.setProperty('--analog-border', style.border)
	time.style.setProperty('--analog-background', style.background)
}

function clockSize(size = 5) {
	document.documentElement.style.setProperty('--clock-size', `${size.toString()}em`)
}

function greetingSize(size = '3') {
	document.documentElement.style.setProperty('--greeting-size', `${size}em`)
}
