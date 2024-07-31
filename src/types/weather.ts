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
		icon_id: number
		description: string
		timestamp: number
		approximation?: Pick<Weather.Onecall, 'ccode' | 'city' | 'lat' | 'lon'>
	}

	type Geolocation = 'precise' | 'approximate' | 'off'

	type Unit = 'metric' | 'imperial'

	type Forecast = 'auto' | 'always' | 'never'

	type Temperature = 'actual' | 'feelslike' | 'both'

	type MoreInfo = 'none' | 'msnw' | 'yhw' | 'windy' | 'custom'

	interface Onecall {
		city?: string
		ccode?: string
		lat: number
		lon: number
		current: {
			dt: number
			sunrise: number
			sunset: number
			temp: number
			feels_like: number
			weather: {
				id: number
				main: string
				description: string
				icon: string
			}[]
		}
		hourly?: {
			dt: number
			temp: number
			feels_like: number
			weather: {
				id: number
				main: string
				description: string
				icon: string
			}[]
		}[]
	}
}
