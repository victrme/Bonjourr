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
