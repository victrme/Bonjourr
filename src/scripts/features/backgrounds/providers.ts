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
				value: 'unsplash-images-collections',
			},
			{
				name: 'Unsplash Search',
				value: 'unsplash-images-search',
			},
		],
	},
	{
		optgroup: 'Pixabay',
		options: [
			{
				name: 'Pixabay Search',
				value: 'pixabay-images-search',
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
				name: 'Pixabay Search',
				value: 'pixabay-videos-search',
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
