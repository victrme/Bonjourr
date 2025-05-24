import type { BackgroundImage, BackgroundVideo, Frequency, Link, Widgets } from './shared.ts'

export interface Sync {
	showall: boolean
	quicklinks: boolean
	syncbookmarks?: number
	time: boolean
	main: boolean
	pagegap: number
	pagewidth: number
	linksrow: number
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
	pausedUrl?: string
	pausedImage?: BackgroundImage
	pausedVideo?: BackgroundVideo
	queries: Record<string, string>
	texture: {
		type: 'none' | 'grain' | 'dots' | 'topographic'
		size?: number
		opacity?: number
	}
}

type Font = {
	family: string
	size: string
	weight: string
	weightlist: string[]
	system?: boolean
	// <19.0
	url?: string
	availWeights?: string[]
}

type Notes = {
	on: boolean
	align: string
	text?: string
	width?: number
	background?: string
	// <20.0
	opacity?: number
}

type Move = {
	selection: MoveSelection
	layouts: {
		single?: MoveLayout
		double?: MoveLayout
		triple?: MoveLayout
	}
}

type MoveSelection = 'single' | 'double' | 'triple'

interface MoveLayout {
	grid: string[][]
	items: {
		[key in Widgets]?: MoveAlign
	}
}

interface MoveAlign {
	box: string
	text: string
}

// 21

type SimpleMove = {
	grid: string[][]
	items: Record<Widgets, SimpleMoveWidget>
}

type SimpleMoveWidget = {
	box_v?: 'top' | 'middle' | 'bottom'
	box_h?: 'left' | 'center' | 'right'
	text?: 'left' | 'center' | 'right'
	gap?: number
	minwidth?: 'auto' | number
}

type Supporters = {
	enabled: boolean
	closed: boolean
	month: number
}
