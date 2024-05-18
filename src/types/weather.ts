declare namespace Weather {
	interface Sync {
		iconpack?: IconPack
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
		iconpack: string
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

	type Geolocation = 'precise' | 'approximate' | 'off'

	type Unit = 'metric' | 'imperial'

	type Forecast = 'auto' | 'always' | 'never'

	type Temperature = 'actual' | 'feelslike' | 'both'

	type MoreInfo = 'none' | 'msnw' | 'yhw' | 'windy' | 'custom'

	type IconPack = 'default'

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
