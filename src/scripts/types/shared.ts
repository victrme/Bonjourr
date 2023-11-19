import langs from '../langs'

export const EVERY = <const>['tabs', 'hour', 'day', 'period', 'pause']

export const COLLECTION_TYPES = <const>['night', 'noon', 'day', 'evening', 'user']

export const isEvery = (s = ''): s is Frequency => s in EVERY

export type Frequency = (typeof EVERY)[number]

export type CollectionType = (typeof COLLECTION_TYPES)[number]

export type Langs = keyof typeof langs

export type Quote = {
	author: string
	content: string
}

export type Link = {
	_id: string
	order: number
	title: string
	icon: string
	url: string
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
