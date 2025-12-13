import type { BackgroundImage, BackgroundVideo, Frequency, Link, PomodoroMode, Widgets } from './shared.ts'

export interface Sync {
	showall: boolean
	quicklinks: boolean
	time: boolean
	main: boolean
	pagegap: number
	pagewidth: number
	linksrow: number
	linkiconradius: number
	linkstyle: 'large' | 'medium' | 'small' | 'inline' | 'text'
	linknewtab: boolean
	linktitles: boolean
	linkbackgrounds: boolean
	linkgroups: LinkGroups
	textShadow: number
	cssHeight?: number
	review: number
	announcements: 'all' | 'major' | 'off'
	supporters: Supporters
	reviewPopup?: number | string
	css: string
	lang: string
	favicon: string
	tabtitle: string
	greeting: string
	greetingsize: string
	greetingsmode?: 'auto' | 'custom'
	greetingscustom: {
		morning: string
		afternoon: string
		evening: string
		night: string
	}
	notes?: Notes
	hide?: Hide
	dark: 'auto' | 'system' | 'enable' | 'disable'
	dateformat: 'auto' | 'eu' | 'us' | 'cn'
	backgrounds: Backgrounds
	clock: Clock
	analogstyle?: AnalogStyle
	worldclocks: WorldClock[]
	weather: Weather
	searchbar: Searchbar
	quotes: Quotes
	pomodoro: Pomodoro
	font: Font
	move: Move
	about: {
		browser: string
		version: string
	}
	[key: string]: Link | unknown
}

export interface LinkGroups {
	on: boolean
	selected: string
	groups: string[]
	pinned: string[]
	synced: string[]
}

export interface Hide {
	clock?: boolean
	date?: boolean
	greetings?: boolean
	weatherdesc?: boolean
	weathericon?: boolean
	settingsicon?: boolean
}

export interface Backgrounds {
	type: 'files' | 'urls' | 'images' | 'videos' | 'color'
	frequency: Frequency
	fadein: number
	bright: number
	blur: number
	color: string
	urls: string
	images: string
	videos: string
	mute: boolean
	pausedUrl?: string
	pausedImage?: BackgroundImage
	pausedVideo?: BackgroundVideo
	queries: Record<string, string>
	texture: {
		type:
			| 'none'
			| 'grain'
			| 'verticalDots'
			| 'diagonalDots'
			| 'topographic'
			| 'checkerboard'
			| 'isometric'
			| 'grid'
			| 'verticalLines'
			| 'horizontalLines'
			| 'diagonalStripes'
			| 'verticalStripes'
			| 'horizontalStripes'
			| 'diagonalLines'
			| 'aztec'
			| 'circuitBoard'
			| 'ticTacToe'
			| 'endlessClouds'
			| 'vectorGrain'
			| 'waves'
			| 'honeycomb'
		size?: number
		opacity?: number
		color?: string
	}
}

export interface Clock {
	ampm: boolean
	analog: boolean
	seconds: boolean
	timezone: string
	size: number
	ampmlabel: boolean
	ampmposition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
	worldclocks: boolean
	face?: 'none' | 'number' | 'roman' | 'marks'
	style?: 'round' | 'square' | 'transparent'
}

export interface AnalogStyle {
	border: string
	background: string
	shape: 'round' | 'square' | 'rectangle'
	face: 'none' | 'number' | 'roman' | 'marks' | 'swiss' | 'braun'
	hands: 'modern' | 'swiss' | 'classic' | 'braun' | 'apple'
}

export interface WorldClock {
	region: string
	timezone: string
}

export interface Searchbar {
	on: boolean
	width?: number
	newtab: boolean
	engine: string
	request: string
	opacity?: number
	suggestions: boolean
	placeholder: string
	background?: string
}

export interface Font {
	family: string
	size: string
	weight: string
	weightlist: string[]
	system?: boolean
	url?: string
	availWeights?: string[]
}

export interface Notes {
	on: boolean
	align: string
	text?: string
	width?: number
	background?: string
	opacity?: number
}

export interface Quotes {
	on: boolean
	author: boolean
	last?: number
	type: 'classic' | 'kaamelott' | 'inspirobot' | 'stoic' | 'hitokoto' | 'office' | 'user' | 'url'
	frequency: Frequency
	userlist?: string
	url?: string
}

export interface Move {
	selection: 'single' | 'double' | 'triple'
	layouts: {
		single?: MoveLayout
		double?: MoveLayout
		triple?: MoveLayout
	}
}

export interface MoveLayout {
	grid: string[][]
	items: Record<Widgets, MoveAlign | undefined>
}

export interface MoveAlign {
	box: string
	text: string
}

export interface Supporters {
	enabled: boolean
	closedMonth?: number
}

export interface Weather {
	ccode?: string
	city?: string
	unit: 'metric' | 'imperial'
	geolocation: 'precise' | 'approximate' | 'off'
	forecast: 'auto' | 'always' | 'never'
	temperature: 'actual' | 'feelslike' | 'both'
	moreinfo: 'none' | 'msnw' | 'yhw' | 'windy' | 'accu' | 'custom'
	provider?: string
}

export interface Pomodoro {
	on: boolean
	end: number
	pause: number
	mode?: PomodoroMode
	time_for: Record<PomodoroMode, number>
	focus: boolean
	sound: boolean
	history: { endedAt: string; duration: number }[]
}
