import type { Backgrounds } from '../../../types/sync.ts'

interface TextureRanges {
	opacity: TextureRangeInput
	size: TextureRangeInput
	color: string | undefined
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
		color: undefined,
	},
	verticalDots: {
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
		color: '#ffffff',
	},
	diagonalDots: {
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
		color: '#ffffff',
	},
	checkerboard: {
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
		color: '#ffffff',
	},
	isometric: {
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
		color: '#ffffff',
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
		color: '#ffffff',
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
		color: undefined,
	},
}

interface TextureRangeInput {
	min: string
	max: string
	value: string
	step: string
}
