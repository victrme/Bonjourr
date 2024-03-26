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
		move: Move
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

	type Move = {
		column: 'single' | 'double' | 'triple'
		single: MoveLayout
		double: MoveLayout
		triple: MoveLayout
	}

	type MoveLayout = {
		grid: string
		time?: string
		main?: string
		notes?: string
		quotes?: string
		searchbar?: string
		quicklinks?: string
	}

	// <19.2

	type OldMove = {
		selection: 'single' | 'double' | 'triple'
		layouts: {
			single: OldMoveLayout
			double: OldMoveLayout
			triple: OldMoveLayout
		}
	}

	interface OldMoveLayout {
		selected?: boolean
		grid: string[][]
		items: {
			[key in Widgets]?: OldMoveItem
		}
	}

	interface OldMoveItem {
		box: string
		text: string
	}
}
