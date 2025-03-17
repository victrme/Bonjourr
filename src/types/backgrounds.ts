declare namespace Backgrounds {
	type Item = Image | Video

	/**
	 * Unified schema returned for Bonjourr Images
	 */
	interface Image {
		format: 'image'
		urls: {
			full: string
			medium: string
			small: string
		}

		/* Credits */
		page?: string
		username?: string
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

		/* Background position */
		size?: string
		x?: string
		y?: string
	}

	/**
	 * Unified schema returned for Bonjourr Videos
	 */
	interface Video {
		format: 'video'
		duration: number
		page?: string
		username?: string
		thumbnail?: string
		urls: {
			full: string
			medium: string
			small: string
		}
	}

	type Api = Record<string, Backgrounds.Item[]>
}
