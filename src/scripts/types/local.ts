import { google } from './googleFonts'
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
	googleFonts?: google.fonts.WebfontList
	fontface?: string
	waitingForPreload: false
	selectedId: string
	idsList: string[]
	userQuoteSelection: number
	quotesCache: Quote[]
	dynamicCache: DynamicCache
}
