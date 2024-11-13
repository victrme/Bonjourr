declare namespace Weather {
	interface Sync {
		ccode?: string
		city?: string
		unit: Unit
		geolocation: Geolocation
		forecast: Forecast
		temperature: Temperature
		moreinfo: MoreInfo
		provider?: string
		// <1.18.x
		location?: [number, number]
	}

	interface Local {
		temp: number
		forecasted_timestamp: number
		forecasted_high: number
		feels_like: number
		sunrise: number
		sunset: number
		icon_id: string
		description: string
		timestamp: number
		link: string
		approximation?: {
			ccode?: SimpleWeather['geo']['country']
			city?: SimpleWeather['geo']['city']
			lat: SimpleWeather['geo']['lat']
			lon: SimpleWeather['geo']['lon']
		}
	}

	type Geolocation = 'precise' | 'approximate' | 'off'

	type Unit = 'metric' | 'imperial'

	type Forecast = 'auto' | 'always' | 'never'

	type Temperature = 'actual' | 'feelslike' | 'both'

	type MoreInfo = 'none' | 'msnw' | 'yhw' | 'windy' | 'accu' | 'custom'

	type Conditions =
		| 'clearsky'
		| 'fewclouds'
		| 'brokenclouds'
		| 'overcastclouds'
		| 'sunnyrain'
		| 'lightrain'
		| 'rain'
		| 'thunderstorm'
		| 'snow'
		| 'mist'

	interface SimpleWeather {
		meta: {
			url: string
			lang: string
			provider: 'accuweather' | 'foreca'
		}
		geo: {
			lat: number
			lon: number
			city: string
			country: string
		}
		now: {
			icon: string
			temp: number
			feels: number
			description: string
		}
		sun: {
			rise: [number, number]
			set: [number, number]
		}
		daily: {
			time: string
			high: number
			low: number
		}[]
	}
}
