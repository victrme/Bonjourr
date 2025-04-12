declare namespace Old {
	interface Sync {
		background_blur: number
		background_bright: number
		background_type: string
		unsplash: {
			time?: number
			every: Frequency
			pausedImage?: UnsplashImage
			collection: string
			lastCollec: UnsplashCollections
		}
		linktabs: {
			active: boolean
			selected: number
			titles: string[]
			pinned: number[]
		}
		hide: [[number, number], [number, number, number], [number], [number]]
	}

	interface Local {
		unsplashCache: Record<UnsplashCollections, UnsplashImage[]>
		selected?: boolean
		idsList: string[]
	}

	interface UnsplashImage {
		url: string
		link: string
		download_link: string
		username: string
		name: string
		city: string | null
		country: string | null
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

	type UnsplashCollections = 'night' | 'noon' | 'day' | 'evening' | 'user'
}
