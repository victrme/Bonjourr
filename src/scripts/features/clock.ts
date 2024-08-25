import { hexColorFromSplitRange } from '../utils'
import { getLang, tradThis } from '../utils/translations'
import { displayInterface } from '../index'
import { eventDebounce } from '../utils/debounce'
import { SYNC_DEFAULT } from '../defaults'
import onSettingsLoad from '../utils/onsettingsload'
import errorMessage from '../utils/errormessage'
import storage from '../storage'

type ClockUpdate = {
	ampm?: boolean
	analog?: boolean
	seconds?: boolean
	dateformat?: string
	greeting?: string
	timezone?: string
	shape?: string
	face?: string
	hands?: string
	size?: number
	border?: 'opacity' | 'shade'
	background?: 'opacity' | 'shade'
	worldclocks?: boolean
	world?: { index: number; region?: string; timezone?: string }
}

type DateFormat = Sync.Storage['dateformat']

const defaultAnalogStyle: Sync.AnalogStyle = {
	face: 'none',
	hands: 'modern',
	shape: 'round',
	border: '#ffff',
	background: '#fff2',
}

const defaultTimezones = ['Europe/Paris', 'America/New_York', 'Asia/Tokyo']
const defaultRegions = ['Paris', 'New York', 'Tokyo']
const oneInFive = Math.random() > 0.8 ? 1 : 0
let numberWidths = [1]
let clockInterval: number

export default function clock(init?: Sync.Storage, event?: ClockUpdate) {
	if (event) {
		clockUpdate(event)
		return
	}

	const clock = init?.clock ?? { ...SYNC_DEFAULT.clock }
	const world = init?.worldclocks ?? { ...SYNC_DEFAULT.worldclocks }

	try {
		startClock(clock, world, init?.greeting || '', init?.dateformat || 'eu')
		analogStyle(init?.analogstyle)
		clockSize(clock.size)
		displayInterface('clock')
		onSettingsLoad(toggleWorldClocksOptions)
	} catch (e) {
		errorMessage(e)
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
		storage.sync.set({ dateformat: update.dateformat })
	}

	if (update.greeting !== undefined) {
		greetings(zonedDate(data.clock.timezone), update.greeting)
		storage.sync.set({ greeting: update.greeting })
	}

	if (update.timezone !== undefined) {
		greetings(zonedDate(update.timezone), data.greeting)
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
		const option = !!update.background ? 'background' : 'border'

		analogstyle[option] = hexColorFromSplitRange(`#analog-${option}-range`)
		analogStyle(analogstyle)

		if (update?.[option] === 'opacity') eventDebounce({ analogstyle })
		if (update?.[option] === 'shade') storage.sync.set({ analogstyle })

		return
	}

	if (update.world !== undefined) {
		const index = update.world.index
		const baseclock = { region: defaultRegions[index], timezone: defaultTimezones[index] }
		const worldclock = data.worldclocks?.[index] ?? baseclock
		const { region, timezone } = update.world

		if (region !== undefined) worldclock.region = region
		if (timezone !== undefined) worldclock.timezone = timezone

		data.worldclocks[index] = worldclock
		toggleWorldClocksOptions()
	}

	data.clock = {
		ampm: update.ampm ?? data.clock.ampm,
		size: update.size ?? data.clock.size,
		analog: update.analog ?? data.clock.analog,
		seconds: update.seconds ?? data.clock.seconds,
		timezone: update.timezone ?? data.clock.timezone,
		worldclocks: update.worldclocks ?? data.clock.worldclocks,
	}

	storage.sync.set({
		clock: data.clock,
		worldclocks: data.worldclocks,
		analogstyle: analogstyle,
	})

	startClock(data.clock, data.worldclocks, data.greeting, data.dateformat)
	analogStyle(data.analogstyle)
	clockSize(data.clock.size)
}

function analogStyle(style?: Sync.AnalogStyle) {
	style = style ?? structuredClone(defaultAnalogStyle)
	const { face, shape, hands } = style

	const time = document.getElementById('time') as HTMLElement
	const spans = document.querySelectorAll<HTMLSpanElement>('.analog .analog-face span')

	const backgroundAlpha = parseInt(style.background.slice(4), 16)
	const isWhiteOpaque = style.background?.includes('fff') && backgroundAlpha > 7
	const isTransparent = backgroundAlpha === 0

	let faceNumbers = ['12', '3', '6', '9']
	const lang = getLang()

	if (lang === 'am') faceNumbers = ['Գ', 'Զ', 'Թ', 'ԺԲ']
	else if (lang === 'ar') faceNumbers = ['٣', '٦', '٩', '١٢']
	else if (lang === 'fa') faceNumbers = ['۳', '۶', '۹', '۱۲']
	else if (lang.match(/zh-CN|zh-HK|ja/)) faceNumbers = ['三', '六', '九', '十二']

	spans.forEach((span, i) => {
		if (face === 'roman') span.textContent = ['XII', 'III', 'VI', 'IX'][i % 4]
		else if (face === 'marks') span.textContent = ['│', '―', '│', '―'][i % 4]
		else if (face === 'number') span.textContent = faceNumbers[i % 4]
		else span.textContent = ''
	})

	time.dataset.face = face === 'swiss' || face === 'braun' ? face : ''
	time.dataset.shape = shape || ''
	time.dataset.hands = hands || ''

	time.classList.toggle('transparent', isTransparent)
	time.classList.toggle('white-opaque', isWhiteOpaque)

	time.style.setProperty('--analog-border', style.border)
	time.style.setProperty('--analog-background', style.background)
}

function clockSize(size = 1) {
	document.documentElement.style.setProperty('--clock-size', size.toString() + 'em')
}

//	Clock

function startClock(clock: Sync.Clock, world: Sync.WorldClocks, greeting: string, dateformat: DateFormat) {
	document.getElementById('time')?.classList.toggle('is-analog', clock.analog)
	document.getElementById('time')?.classList.toggle('seconds', clock.seconds)

	document.querySelectorAll('.clock-wrapper').forEach((node, index) => {
		if (index > 0) {
			node.remove()
		}
	})

	const clocks: Sync.WorldClocks = []

	if (clock.seconds && !clock.analog) {
		setSecondsWidthInCh()
	}

	if (clock.worldclocks) {
		clocks.push(...world.filter(({ region }) => region))
	}

	if (clocks.length === 0) {
		clocks.push({ region: '', timezone: clock.timezone })
	}

	clearInterval(clockInterval)

	start(true)

	clockInterval = setInterval(start, 1000)

	function start(firstStart?: true) {
		for (let index = 0; index < clocks.length; index++) {
			const { region, timezone } = clocks[index]
			const domclock = getClock(index)
			const domregion = domclock.querySelector<HTMLElement>('.clock-region')
			const date = zonedDate(timezone)
			const isNextHour = date.getMinutes() === 0

			if (clock.analog) {
				analog(domclock, date, clock)
			} else {
				digital(domclock, date, clock)
			}

			if (isNextHour || firstStart) {
				clockDate(domclock, date, dateformat)
				greetings(date, greeting)
			}

			if (domregion) {
				domregion.textContent = region
			}
		}
	}
}

function getClock(index: number): HTMLDivElement {
	const container = document.getElementById('time-container')
	const wrapper = document.querySelector<HTMLDivElement>(`.clock-wrapper[data-index="${index}"]`)

	if (wrapper) {
		return wrapper
	}

	const first = document.getElementById('clock-wrapper')
	const clone = first?.cloneNode(true) as HTMLDivElement

	clone.removeAttribute('id')
	clone.dataset.index = index.toString()
	container?.appendChild(clone)

	return clone
}

function digital(wrapper: HTMLElement, date: Date, clock: Sync.Clock) {
	const domclock = wrapper.querySelector<HTMLElement>('.digital')
	const hh = wrapper.querySelector('.digital-hh') as HTMLElement
	const mm = wrapper.querySelector('.digital-mm') as HTMLElement
	const ss = wrapper.querySelector('.digital-ss') as HTMLElement

	const m = fixunits(date.getMinutes())
	const s = fixunits(date.getSeconds())
	let h = clock.ampm ? date.getHours() % 12 : date.getHours()

	if (clock.ampm && h === 0) {
		h = 12
	}

	if (clock.seconds) {
		// Avoid layout shifts by rounding width
		const second = date.getSeconds() < 10 ? 0 : Math.floor(date.getSeconds() / 10)
		const width = getSecondsWidthInCh(second).toFixed(1)
		domclock?.style.setProperty('--seconds-width', `${width}ch`)
	}

	domclock?.classList.toggle('zero', !clock.ampm && h < 10)

	hh.textContent = h.toString()
	mm.textContent = m.toString()
	ss.textContent = s.toString()
}

function analog(wrapper: HTMLElement, date: Date, clock: Sync.Clock) {
	const m = ((date.getMinutes() + date.getSeconds() / 60) * 6).toFixed(1)
	const h = (((date.getHours() % 12) + date.getMinutes() / 60) * 30).toFixed(1)
	const s = (date.getSeconds() * 6).toFixed(1)

	wrapper.querySelector<HTMLElement>('.analog-hours')?.style.setProperty('--deg', `${h}deg`)
	wrapper.querySelector<HTMLElement>('.analog-minutes')?.style.setProperty('--deg', `${m}deg`)

	if (!clock.seconds) {
		return
	}

	wrapper.querySelector<HTMLElement>('.analog-seconds')?.style.setProperty('--deg', `${s}deg`)
}

//	Date

function clockDate(wrapper: HTMLElement, date: Date, dateformat: DateFormat) {
	const datedom = wrapper.querySelector('.clock-date') as HTMLElement
	const aa = wrapper.querySelector('.clock-date-aa') as HTMLElement
	const bb = wrapper.querySelector('.clock-date-bb') as HTMLElement
	const cc = wrapper.querySelector('.clock-date-cc') as HTMLElement

	let lang = getLang().replaceAll('_', '-')

	const day = new Intl.DateTimeFormat(lang, { day: 'numeric' }).format(date)
	const month = new Intl.DateTimeFormat(lang, { month: 'long' }).format(date)
	const weekday = new Intl.DateTimeFormat(lang, { weekday: 'long' }).format(date)

	datedom.classList.remove('eu', 'us', 'cn')
	datedom.classList.add(dateformat)

	if (dateformat === 'auto') {
		const intl = new Intl.DateTimeFormat(lang, { weekday: 'long', month: 'long', day: 'numeric' })
		aa.textContent = intl.format(date)
		bb.textContent = ''
		cc.textContent = ''
	}

	if (dateformat === 'eu') {
		aa.textContent = weekday
		bb.textContent = day
		cc.textContent = month
	}

	if (dateformat === 'us') {
		aa.textContent = weekday
		bb.textContent = month
		cc.textContent = day
	}

	if (dateformat === 'cn') {
		aa.textContent = month
		bb.textContent = day
		cc.textContent = weekday
	}
}

//	Greetings

function greetings(date: Date, name?: string) {
	const domgreetings = document.getElementById('greetings') as HTMLTitleElement
	const domgreeting = document.getElementById('greeting') as HTMLSpanElement
	const domname = document.getElementById('greeting-name') as HTMLSpanElement

	const rare = oneInFive
	const hour = date.getHours()
	let period: 'night' | 'morning' | 'afternoon' | 'evening'

	if (hour < 3) period = 'evening'
	else if (hour < 5) period = 'night'
	else if (hour < 12) period = 'morning'
	else if (hour < 18) period = 'afternoon'
	else period = 'evening'

	const greetings = {
		morning: 'Good morning',
		afternoon: 'Good afternoon',
		evening: 'Good evening',
		night: ['Good night', 'Sweet dreams'][rare],
	}

	const greet = greetings[period]

	domgreetings.style.textTransform = name || (rare && period === 'night') ? 'none' : 'capitalize'
	domgreeting.textContent = tradThis(greet) + (name ? ', ' : '')
	domname.textContent = name ?? ''
}

// World clocks

function toggleWorldClocksOptions() {
	const parents = document.querySelectorAll<HTMLElement>(`.worldclocks-item`)
	const inputs = document.querySelectorAll<HTMLInputElement>(`.worldclocks-item [name="worldclock-city"]`)

	parents.forEach((parent, i) => {
		const currHasText = !!inputs[i]?.value
		const nextHasText = !!inputs[i - 1]?.value
		parent?.classList.toggle('shown', i === 0 || currHasText || nextHasText)
	})
}

// Helpers

function setSecondsWidthInCh() {
	const span = document.querySelector<HTMLElement>('.digital-number-width')

	if (!span) {
		return
	}

	const zero = span.offsetWidth
	numberWidths = [1]

	for (let i = 1; i < 6; i++) {
		span.textContent = i.toString()
		numberWidths.push(Math.round((span.offsetWidth / zero) * 10) / 10)
	}
}

function getSecondsWidthInCh(second: number): number {
	return Math.min(...numberWidths) + numberWidths[second]
}

function zonedDate(timezone: string = 'auto'): Date {
	const isUTC = (timezone.includes('+') || timezone.includes('-')) && timezone.length < 6
	const date = new Date()

	if (timezone === 'auto') {
		return date
	}

	if (isUTC) {
		const offset = date.getTimezoneOffset() / 60 // hour
		let utcHour = date.getHours() + offset
		const utcMinutes = date.getMinutes() + date.getTimezoneOffset()
		let minutes

		if (timezone.split('.')[1]) {
			minutes = utcMinutes + parseInt(timezone.split('.')[1])

			if (minutes > -30) {
				utcHour++
			}
		} else {
			minutes = date.getMinutes()
		}

		date.setHours(utcHour + parseInt(timezone), minutes)

		return date
	}

	const intl = new Intl.DateTimeFormat('en', { timeZone: timezone, dateStyle: 'medium', timeStyle: 'medium' })
	const zonedDate = new Date(intl.format(date))

	return zonedDate
}

function fixunits(val: number) {
	return (val < 10 ? '0' : '') + val.toString()
}

function isFace(str?: string): str is Sync.AnalogStyle['face'] {
	return ['none', 'number', 'roman', 'marks', 'swiss', 'braun'].includes(str ?? '')
}

function isHands(str?: string): str is Sync.AnalogStyle['hands'] {
	return ['modern', 'swiss-hands', 'classic', 'braun', 'apple'].includes(str ?? '')
}

function isShape(str?: string): str is Sync.AnalogStyle['shape'] {
	return ['round', 'square', 'rectangle'].includes(str ?? '')
}

function isDateFormat(str = ''): str is DateFormat {
	return ['auto', 'eu', 'us', 'cn'].includes(str)
}
