declare namespace Wallhaven {
	type Local = {
		[key in Wallhaven.Sync['lastParams']]: Wallhaven.Image[]
	}

	type ParameterTypes = 'night' | 'noon' | 'day' | 'evening' | 'user'

	interface Sync {
		time?: number
		every: Frequency
		parameter: string
		pausedImage?: Wallhaven.Image
		lastParams: Wallhaven.ParameterTypes
	}

	interface Image {
        id: string
		url: string
		path: string
        colors: string[]
	}

    interface API {
        data: {
            id: string
            url: string
            path: string
            colors: string[]
        }[],
        meta: {
            current_page: number,
            last_page: number,
        }
    } 
}
