const EVERY = <const>['tabs', 'hour', 'day', 'period', 'pause']

const isEvery = (s = ''): s is Shared.Frequency => s in EVERY

declare namespace Quotes {
	type Item = {
		author: string
		content: string
	}

	type Sync = {
		on: boolean
		author: boolean
		last: number
		type: 'classic' | 'kaamelott' | 'inspirobot' | 'user'
		frequency: Shared.Frequency
		userlist?: string
	}

	type UserInput = [string, string][]
}

declare namespace Shared {
	type Frequency = (typeof EVERY)[number]
}
