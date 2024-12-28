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
		linktitles: boolean
		linkbackgrounds: boolean
		linktabs?: LinkTabsOld
		linkgroups: LinkGroups
		textShadow: number
		cssHeight?: number
		review: number
		settingssync: SettingsSync
		announcements: 'all' | 'major' | 'off'
		supporters: Supporters
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
		dateformat: 'auto' | 'eu' | 'us' | 'cn'
		clock: Clock
		analogstyle?: AnalogStyle
		worldclocks: WorldClocks
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

	type SettingsSync = {
		type: 'browser' | 'gist' | 'url' | 'off'
		freq: 'newtabs' | 'start' | 'manual'
	}

	type LinkTabsOld = {
		active: boolean
		selected: number
		titles: string[]
		pinned: number[]
	}

	type LinkGroups = {
		on: boolean
		selected: string
		groups: string[]
		pinned: string[]
		synced: string[]
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
		ampmlabel: boolean
		worldclocks: boolean
		// <20.0
		face?: 'none' | 'number' | 'roman' | 'marks'
		style?: 'round' | 'square' | 'transparent'
	}

	type AnalogStyle = {
		border: string
		background: string
		shape: 'round' | 'square' | 'rectangle'
		face: 'none' | 'number' | 'roman' | 'marks' | 'swiss' | 'braun'
		hands: 'modern' | 'swiss' | 'classic' | 'braun' | 'apple'
	}

	type WorldClocks = {
		region: string
		timezone: string
	}[]

	type Searchbar = {
		on: boolean
		width?: number
		newtab: boolean
		engine: string
		request: string
		suggestions: boolean
		placeholder: string
		background?: string
		// <20.0
		opacity?: number
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

	type Supporters = {
		enabled: boolean
		closed: boolean
		month: number
	}
}
