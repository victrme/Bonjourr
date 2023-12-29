declare namespace Links {
	type Base = {
		_id: string
		order?: number
		title: string
	}

	interface Folder extends Base {
		ids: string[]
	}

	interface Elem extends Base {
		icon?: string
		url: string
	}

	type Link = Links.Folder | Links.Elem

	type TabList = {
		name: string
		ids: string[]
	}[]
}
