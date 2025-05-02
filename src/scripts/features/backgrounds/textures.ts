import type { Backgrounds } from '../../../types/sync.ts'

interface TextureRanges {
	opacity: TextureRangeInput
	size: TextureRangeInput
}

export const TEXTURE_RANGES: Record<Backgrounds['texture']['type'], TextureRanges> = {
	grain: {
		opacity: {
			min: '0.02',
			max: '0.3',
			step: '0.01',
			value: '0.1',
		},
		size: {
			min: '140',
			max: '300',
			step: '5',
			value: '220',
		},
	},
	dots: {
		opacity: {
			min: '0.1',
			max: '1.0',
			step: '0.1',
			value: '0.3',
		},
		size: {
			min: '10',
			max: '100',
			step: '1',
			value: '30',
		},
	},
	topographic: {
		opacity: {
			min: '0.3',
			max: '1.0',
			step: '0.05',
			value: '0.6',
		},
		size: {
			min: '400',
			max: '600',
			step: '10',
			value: '500',
		},
	},

	none: {
		opacity: {
			min: '',
			max: '',
			value: '',
			step: '',
		},
		size: {
			min: '',
			max: '',
			value: '',
			step: '',
		},
	},
}

interface TextureRangeInput {
	min: string
	max: string
	value: string
	step: string
}
