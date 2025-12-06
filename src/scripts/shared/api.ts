// Removed bonjourr API functions - using public APIs instead

// Google search suggestions API
export async function fetchGoogleSuggestions(query: string): Promise<string[]> {
	try {
		const url = `https://www.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}`
		const response = await fetch(url)
		const data = await response.json()
		// Response format: ["query", ["suggestion1", "suggestion2", ...]]
		return data[1] || []
	} catch (_error) {
		return []
	}
}

// Bing wallpaper API
export async function fetchBingWallpaper(mkt = 'zh-CN'): Promise<BingWallpaperResponse | undefined> {
	try {
		const url = `https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8&mkt=${mkt}`
		const response = await fetch(url)
		return await response.json()
	} catch (_error) {
		// ...
	}
}

export interface BingWallpaperResponse {
	images: BingImage[]
}

export interface BingImage {
	url: string
	urlbase: string
	copyright: string
	title: string
	startdate: string
}

// Hitokoto (一言) API
export async function fetchHitokoto(type?: string): Promise<HitokotoResponse | undefined> {
	try {
		const typeParam = type ? `?c=${type}` : ''
		const url = `https://v1.hitokoto.cn/${typeParam}`
		const response = await fetch(url)
		return await response.json()
	} catch (_error) {
		// ...
	}
}

export interface HitokotoResponse {
	id: number
	hitokoto: string
	from: string
	from_who: string | null
	type: string
}

// Google Favicon Service
export function getGoogleFavicon(domain: string, size = 64): string {
	return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`
}

// Picsum random image
export function getPicsumUrl(width = 3840, height = 2160): string {
	return `https://picsum.photos/${width}/${height}`
}
