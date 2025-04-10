declare namespace Local {
	type Storage = {
		fonts?: FontList
		fontface?: string
		userQuoteSelection: number
		quotesCache: Quotes.Item[]
		translations?: Translations
		lastWeather?: Weather.Local
		operaExplained?: true

		// Sync
		gistId?: string
		gistToken?: string
		distantUrl?: string
		pastebinToken?: string
		syncStorage?: Sync.Storage
		syncType?: SyncType

		// Backgrounds
		backgroundCollections: Record<string, Backgrounds.Item[]>
		backgroundUrls: Record<string, BackgroundUrl>
		backgroundFiles: Record<string, BackgroundFile>
		backgroundPreloading?: true
		backgroundLastChange?: string
		backgroundCompressFiles?: boolean

		// Unused - Old
		// unsplashCache: Unsplash.Local
		// selected?: boolean, dId: string
		// idsList: string[]
	}

	interface BackgroundUrl {
		lastUsed: string
		state: BackgroundUrlState
	}

	interface BackgroundFile {
		lastUsed: string
		selected?: boolean
		position: {
			size: string
			x: string
			y: string
		}
	}

	type BackgroundUrlState = 'NONE' | 'LOADING' | 'OK' | 'NOT_URL' | 'CANT_REACH' | 'NOT_IMAGE'

	type SyncType = 'browser' | 'gist' | 'url' | 'off'

	type Translations = {
		lang: string
		[key: string]: string
	}

	type FontList = {
		family: string
		weights: string[]
		variable: boolean
	}[]
}
