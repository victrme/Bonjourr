declare namespace Sync {
	interface Storage {
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
		linktabs: LinkTabs
		textShadow: number
		cssHeight?: number
		review: number
		announcements: 'all' | 'major' | 'off'
		reviewPopup?: number | string
		background_blur: number
		background_bright: number
		css: string
		lang: string
		favicon: string
		tabtitle: string
		greeting: string
		notes?: Notes
		hide?: Hide
		dark: 'auto' | 'system' | 'enable' | 'disable'
		background_type: 'local' | 'unsplash'
		dateformat: 'eu' | 'us' | 'cn'
		clock: Clock
		unsplash: Unsplash.Sync
		weather: Weather.Sync
		searchbar: Searchbar
		quotes: Quotes.Sync
		font: Font
		move: {
			selection: Move.Selection
			layouts: {
				single: Move.Layout
				double: Move.Layout
				triple: Move.Layout
			}
		}
		about: {
			browser: string
			version: string
		}
		[key: string]: Links.Link | unknown
	}

	type LinkTabs = {
		active: boolean
		selected: number
		titles: string[]
	}

	type HideOld = [[number, number], [number, number, number], [number], [number]]

	type Hide = {
		clock?: boolean
		date?: boolean
		greetings?: boolean
		weatherdesc?: boolean
		weathericon?: boolean
		settingsicon?: boolean
	}

	type Clock = {
		ampm: boolean
		analog: boolean
		seconds: boolean
		timezone: string
		size: number
		style: 'round' | 'square' | 'transparent'
		face: 'none' | 'number' | 'roman' | 'marks'
	}

	type Searchbar = {
		on: boolean
		width?: number
		opacity: number
		newtab: boolean
		engine: string
		request: string
		suggestions: boolean
		placeholder: string
	}

	type Font = {
		family: string
		size: string
		weight: string
		weightlist: string[]
		system?: boolean
		// <1.19
		url?: string
		availWeights?: string[]
	}

	type Notes = {
		on: boolean
		text?: string
		width?: number
		opacity: number
		align: string
	}

	namespace Move {
		interface Layout {
			selected?: boolean
			grid: string[][]
			items: { [key in Key]?: Item }
		}

		interface Item {
			box: string
			text: string
		}

		type Selection = 'single' | 'double' | 'triple'

		type Key = 'time' | 'main' | 'notes' | 'searchbar' | 'quicklinks' | 'quotes'
	}
}
