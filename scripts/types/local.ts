import UnsplashImage from './unsplashImage'

export type Quote = {
	author: string
	content: string
}

export type DynamicCache = {
	noon: UnsplashImage[]
	day: UnsplashImage[]
	evening: UnsplashImage[]
	night: UnsplashImage[]
	user: UnsplashImage[]
}

export type Local = {
	waitingForPreload: false
	selectedId: string
	idsList: string[]
	quotesCache: Quote[]
	dynamicCache: DynamicCache
}
