const IMAGES: Provider[] = [
	{
		optgroup: 'Bonjourr',
		options: [
			{
				name: 'Bonjourr Daylight',
				value: 'bonjourr-images-daylight',
			},
		],
	},
	{
		optgroup: 'Unsplash',
		options: [
			{
				name: 'Unsplash Collections',
				value: 'unsplash-images-coll',
			},
			{
				name: 'Unsplash Tags',
				value: 'unsplash-images-tags',
			},
		],
	},
	{
		optgroup: 'Pixabay',
		options: [
			{
				name: 'Pixabay Tags',
				value: 'pixabay-images-tags',
			},
		],
	},
]

const VIDEOS: Provider[] = [
	{
		optgroup: 'Bonjourr',
		options: [
			{
				name: 'Bonjourr Daylight',
				value: 'bonjourr-videos-daylight',
			},
		],
	},
	{
		optgroup: 'Pixabay',
		options: [
			{
				name: 'Pixabay Tags',
				value: 'pixabay-videos-tags',
			},
		],
	},
]

//

interface Provider {
	optgroup: string
	options: {
		name: string
		value: string
	}[]
}

export const PROVIDERS = { IMAGES, VIDEOS }
