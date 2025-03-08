declare namespace Quotes {
	type Item = {
		author: string
		content: string
	}

	type Types = 'classic' | 'kaamelott' | 'inspirobot' | 'user'

	type Sync = {
		on: boolean
		author: boolean
		last: number
		type: Types
		frequency: Frequency
		userlist?: string
	}

	type UserInput = [string, string][]
}
