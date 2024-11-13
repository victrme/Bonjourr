declare namespace Local {
	type Storage = {
		fonts?: FontList
		fontface?: string
		selectedId: string
		idsList: string[]
		userQuoteSelection: number
		quotesCache: Quotes.Item[]
		unsplashCache: Unsplash.Local
		translations?: Translations
		lastWeather?: Weather.Local
		operaExplained?: true
		gistId?: string
		gistToken?: string
		pastebinToken?: string
		sync?: Sync.Storage
	}

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
