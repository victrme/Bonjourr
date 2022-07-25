import UnsplashImage from './unsplashImage'
import Quote from './quote'

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
