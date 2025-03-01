declare namespace Backgrounds {
	/**
	 * Unified schema returned for Bonjourr Images
	 */
	interface Image {
		format: 'image'
		page: string
		username: string
		urls: {
			full: string
			medium: string
			small: string
		}

		/* Unsplash only */
		color?: string
		name?: string
		city?: string
		country?: string
		download?: string
		exif?: {
			make: string
			model: string
			exposure_time: string
			aperture: string
			focal_length: string
			iso: number
		}
	}

	/**
	 * Unified schema returned for Bonjourr Videos
	 */
	interface Video {
		format: 'video'
		page: string
		username: string
		duration: number
		thumbnail: string
		urls: {
			full: string
			medium: string
			small: string
		}
	}
}
