const IMAGES: Provider[] = [
	{
		optgroup: 'Bing',
		options: [
			{
				name: 'Bing Daily',
				value: 'bing',
			},
		],
	},
	{
		optgroup: 'Picsum',
		options: [
			{
				name: 'Picsum Random',
				value: 'picsum',
			},
		],
	},
]

// Videos feature removed for simplicity
const VIDEOS: Provider[] = []

interface Provider {
	optgroup: string
	options: {
		name: string
		value: string
	}[]
}

export const PROVIDERS = { IMAGES, VIDEOS }
