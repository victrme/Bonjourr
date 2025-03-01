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
		customCollection?: CustomCollection
		daylightCollection?: DaylightCollection
		backgroundPreloading?: true
		backgroundLastChange?: string
		localFiles?: LocalFiles

		// Unused - Old
		unsplashCache: Unsplash.Local
		selectedId: string
		idsList: string[]
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

	interface LocalFiles {
		ids: string[]
		selected: string
	}

	//

	interface CustomCollection {
		images: {
			unsplash: Backgrounds.Image[]
			pixabay: Backgrounds.Image[]
		}
		videos: {
			pixabay: Backgrounds.Video[]
		}
	}

	interface DaylightCollection {
		images: {
			night: Backgrounds.Image[]
			noon: Backgrounds.Image[]
			day: Backgrounds.Image[]
			evening: Backgrounds.Image[]
		}
		videos: {
			night: Backgrounds.Video[]
			noon: Backgrounds.Video[]
			day: Backgrounds.Video[]
			evening: Backgrounds.Video[]
		}
	}
}
