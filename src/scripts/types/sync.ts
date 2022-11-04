export type Searchbar = {
	on: boolean
	opacity: number
	newtab: boolean
	engine: string
	request: string
}

export type Quotes = {
	on: boolean
	author: boolean
	type: string
	frequency: string
	last: number
}

export type Weather = {
	ccode: string
	city: string
	unit: string
	location: number[]
	forecast: string
	temperature: string
	lastCall?: number
	fcHigh?: number
	lastState?: {
		temp: number
		feels_like: number
		temp_max: number
		sunrise: number
		sunset: number
		description: string
		icon_id: string
	}
}

export type Dynamic = {
	every: string
	collection: string
	lastCollec: 'night' | 'noon' | 'day' | 'evening' | 'user'
	time: number
}

export type Font = {
	url: string
	family: string
	size: string
	availWeights: string[]
	weight: string
}

export type Notes = {
	on: boolean
	text: string
	opacity: number
	align: 'left' | 'center' | 'right'
}

export type Move = {
	selection: keyof Move['layouts']
	layouts: {
		single: Layout<[string | null]>
		double: Layout<[string | null, string | null]>
		triple: Layout<[string | null, string | null, string | null]>
	}
}

export type Layout<Cols> = {
	grid: Cols[]
	items: {
		[key in MoveItemKeys]: MoveItem
	}
}

export type MoveItem = {
	box: string
	text: string
}

export type MoveItemKeys = 'time' | 'main' | 'notes' | 'searchbar' | 'linkblocks' | 'quotes'

export type ClockFace = 'none' | 'number' | 'roman' | ' marks'

export type Hide = [[number, number], [number, number, number], [number], [number]]

export type Sync = {
	usdate: boolean
	showall: boolean
	quicklinks: boolean
	linksrow: number
	linkstyle: string
	linknewtab: boolean
	cssHeight: number
	reviewPopup: number
	background_blur: number
	background_bright: number
	css: string
	lang: string
	favicon: string
	tabtitle: string
	greeting: string
	notes?: Notes
	dark: 'auto' | 'system' | 'enable' | 'disable'
	custom_time: number
	custom_every: string
	background_type: string
	clock: {
		ampm: boolean
		analog: boolean
		seconds: boolean
		timezone: string
		face: ClockFace
	}
	dynamic: Dynamic
	weather: Weather
	searchbar: Searchbar
	quotes: Quotes
	font: Font
	hide: Hide
	move: Move
	textShadow: number
	about: { browser: string; version: string }
	[key: string]: Link | unknown
}
