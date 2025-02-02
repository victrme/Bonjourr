declare namespace Quotes {
	type Item = {
		author: string
		content: string
	}

	type Types = 'classic' | 'kaamelott' | 'inspirobot' | 'stoic' | 'hitokoto' | 'the-office' | 'user' | 'url'

	type Sync = {
		on: boolean
		author: boolean
		last?: number
		type: Types
		frequency: Frequency
		userlist?: string
		url?: string
	}

	type UserInput = [string, string][]
}
