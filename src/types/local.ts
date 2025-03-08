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
