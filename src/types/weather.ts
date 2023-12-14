declare namespace Weather {
	interface Sync {
		geolocation: 'precise' | 'approximate' | 'off'
		ccode?: string
		city?: string
		unit: 'metric' | 'imperial'
		location?: [number, number]
		forecast: 'auto' | 'always' | 'never'
		temperature: 'actual' | 'feelslike' | 'both'
		moreinfo: 'none' | 'msnw' | 'yhw' | 'windy' | 'custom'
		provider?: string
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
		approximation?: Pick<Weather.API.Onecall, 'ccode' | 'city' | 'lat' | 'lon'>
	}

	namespace API {
		interface Current {
			coord: {
				lon: number
				lat: number
			}
			weather: {
				id: number
				main: string
				icon: string
				description: string
			}[]
			main: {
				temp: number
				feels_like: number
				temp_min: number
				temp_max: number
			}
			sys: {
				country: string
				sunrise: number
				sunset: number
			}
			name: string
			cod: number
		}

		interface Forecast {
			cod: string
			list: {
				dt: number
				main: {
					temp_max: number
				}
			}[]
		}

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
}
