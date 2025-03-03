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
		localFiles?: { ids: string[]; selected: string }
		backgroundPreloading?: true
		backgroundLastChange?: string

		// Unused - Old
		// unsplashCache: Unsplash.Local
		// selectedId: string
		// idsList: string[]
	}

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
