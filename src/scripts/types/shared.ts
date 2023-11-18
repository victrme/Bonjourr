import langs from '../langs'

export type Langs = keyof typeof langs

export type Quote = {
	author: string
	content: string
}

export type UnsplashImage = {
	url: string
	link: string
	username: string
	name: string
	city: string
	country: string
	color: string
	exif?: {
		make: string
		model: string
		exposure_time: string
		aperture: string
		focal_length: string
		iso: number
	}
}
