export declare namespace GoogleFonts {
	interface WebfontList {
		kind: string
		items: WebfontFamily[]
	}

	interface WebfontFamily {
		category?: string | undefined
		kind: string
		family: string
		subsets: string[]
		variants: string[]
		version: string
		lastModified: string
		axes?: {
			tag: 'wght' | 'wdth'
			start: number
			end: number
		}[]
		files: { [variant: string]: string }
	}
}

export declare namespace OpenWeatherMap {
	type Current = {
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

	type Forecast = {
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

	type Onecall = {
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

export declare namespace UnsplashAPI {
	type Photo = {
		color: string
		blur_hash: string
		description: string
		exif: {
			make: string
			model: string
			exposure_time: string
			aperture: string
			focal_length: string
			iso: number
		}
		location: {
			name: string
			city: string
			country: string
		}
		urls: {
			raw: string
		}
		links: {
			html: string
		}
		user: {
			username: string
			name: string
			links: {
				html: string
			}
		}
	}
}
