const IMAGES: Provider[] = [
	{
		optgroup: 'Bonjourr',
		options: [
			{
				name: 'Bonjourr Daylight',
				value: 'daylight-images',
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
				value: 'daylight-videos',
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

export default { IMAGES, VIDEOS }
