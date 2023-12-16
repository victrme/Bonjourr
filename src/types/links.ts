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

	type Tabs = {
		selected: number
		list: Tab[]
	}

	type Tab = {
		title: string
		ids: string[]
	}
}
