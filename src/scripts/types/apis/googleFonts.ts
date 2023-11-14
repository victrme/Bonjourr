export declare namespace google.fonts {
	interface WebfontList {
		kind: string
		items: WebfontFamily[]
	}

	interface WebfontFamily {
		category?: string | undefined
		kind: string
		family: string
		subsets: string[]
		variants: string[]
		version: string
		lastModified: string
		axes?: {
			tag: 'wght' | 'wdth'
			start: number
			end: number
		}[]
		files: { [variant: string]: string }
	}
}
