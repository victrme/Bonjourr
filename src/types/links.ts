declare namespace Links {
	type Folder = {
		type: 'folder'
		_id: string
		ids: string[]
		order?: number
		title: string
	}

	type Elem = {
		type: 'elem'
		_id: string
		order?: number
		title: string
		icon?: string
		url: string
	}

	type Link = Elem | Folder

	type Tabs = {
		selected: number
		list: Tab[]
	}

	type Tab = {
		title: string
		ids: string[]
	}
}
