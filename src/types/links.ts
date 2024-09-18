declare namespace Links {
	interface Elem {
		_id: string
		parent?: string | number
		folder?: false
		order: number
		title: string
		url: string
		icon?: string
	}

	interface Folder {
		_id: string
		parent?: string
		folder: true
		order: number
		title: string
	}

	type Link = Folder | Elem
}
