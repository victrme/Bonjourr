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
		worldclocks: WorldClocks
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

	type LinkGroups = {
		on: boolean
		selected: string
		groups: string[]
		pinned: string[]
		synced: string[]
	}

	type Hide = {
		clock?: boolean
		date?: boolean
		greetings?: boolean
		weatherdesc?: boolean
		weathericon?: boolean
		settingsicon?: boolean
	}

	type Backgrounds = {
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
		pausedImage?: Backgrounds.Image
		pausedVideo?: Backgrounds.Video
		queries: Record<string, string>
		texture: {
			type: TextureType
			size?: number
			opacity?: number
		}
	}

	type TextureType = 'none' | 'grain' | 'dots' | 'topographic'

	type Clock = {
		ampm: boolean
		analog: boolean
		seconds: boolean
		timezone: string
		size: number
		ampmlabel: boolean
		worldclocks: boolean
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
		opacity?: number
		suggestions: boolean
		placeholder: string
		background?: string
	}

	type Font = {
		family: string
		size: string
		weight: string
		weightlist: string[]
		system?: boolean
		url?: string
		availWeights?: string[]
	}

	type Notes = {
		on: boolean
		align: string
		text?: string
		width?: number
		background?: string
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
