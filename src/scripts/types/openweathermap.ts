export type OWMCurrent = {
	coord: {
		lon: number
		lat: number
	}
	weather: [
		{
			id: number
			main: string
			icon: string
			description: string
		}
	]
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

export type OWMForecast = {
	cod: string
	list: [
		{
			dt: number
			main: {
				temp_max: number
			}
		}
	]
}

export type OWMOnecall = {
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
	hourly: {
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
