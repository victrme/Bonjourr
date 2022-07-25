export type Searchbar = {
	on: boolean
	opacity: number
	newtab: boolean
	engine: string
	request: string
}

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
	dark: string
	custom_time: number
	custom_every: string
	background_type: string
	clock: {
		ampm: boolean
		analog: boolean
		seconds: boolean
		face: string
		timezone: string
	}
	dynamic: {
		every: string
		collection: string
		lastCollec: string
		time: number
	}
	weather: {
		ccode: string
		city: string
		unit: string
		location: number[]
		forecast: string
		temperature: string
	}
	searchbar: Searchbar
	quotes: {
		on: boolean
		author: boolean
		type: string
		frequency: string
		last: number
	}
	font: {
		url: string
		family: string
		size: string
		availWeights: string[]
		weight: string
	}
	textShadow: number
	hide: number[][]
	about: { browser: string; version: string }
}
