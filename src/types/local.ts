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
		daylightCollection?: DaylightCollection
		backgroundPreloading?: true
		backgroundLastChange?: Date

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

	//

	interface DaylightCollection {
		images: {
			unsplash: DaylightImages
			pixabay: DaylightImages
		}
		videos: {
			pixabay: DaylightVideos
		}
	}

	interface DaylightImages {
		night: Backgrounds.Image[]
		noon: Backgrounds.Image[]
		day: Backgrounds.Image[]
		evening: Backgrounds.Image[]
	}

	interface DaylightVideos {
		night: Backgrounds.Video[]
		noon: Backgrounds.Video[]
		day: Backgrounds.Video[]
		evening: Backgrounds.Video[]
	}
}
