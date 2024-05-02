import { stringMaxSize } from '../../utils'
import { MAIN_API } from '../../defaults'
import { tradThis } from '../../utils/translations'

export function getDefaultIcon(url: string) {
	return `${MAIN_API}/favicon/blob/${url}`
}

export function getSelectedIds(): string[] {
	const selected = document.querySelectorAll<HTMLLIElement>('#linkblocks li.selected')
	return Array.from(selected).map((li) => li.id)
}

export function getLiFromEvent(event: Event): HTMLLIElement | undefined {
	const path = event.composedPath() as Element[]
	const filtered = path.filter((el) => el.tagName === 'LI' && el.className?.includes('block'))
	const li = !!filtered[0] ? (filtered[0] as HTMLLIElement) : undefined
	return li
}

export function createTitle(link: Links.Link): string {
	const isInline = document.getElementById('linkblocks')?.className.includes('inline')
	const isText = document.getElementById('linkblocks')?.className.includes('text')

	if ((!isInline && !isText) || link.title !== '') {
		return stringMaxSize(link.title, 64)
	}

	try {
		if (isElem(link)) {
			link.title = new URL(link.url)?.hostname.replace('www.', '')
		} else {
			link.title = tradThis('folder')
		}
	} catch (_) {
		//
	}

	return link.title
}

// Get Links

export function getLink(data: Sync.Storage, id: string): Links.Link | undefined {
	const val = data[id]

	if (isLink(val)) {
		return val
	}
}

export function getLinksInTab(data: Sync.Storage, index?: number): Links.Link[] {
	const selection = index ?? data.linktabs.selected ?? 0
	const links: Links.Link[] = []

	for (const value of Object.values(data)) {
		if (isLink(value) && (value?.parent ?? 0) === selection) {
			links.push(value)
		}
	}

	links.sort((a, b) => a.order - b.order)

	return links
}

export function getLinksInFolder(data: Sync.Storage, id: string): Links.Elem[] {
	const links: Links.Elem[] = []

	for (const value of Object.values(data)) {
		if (isElem(value) && value?.parent === id) {
			links.push(value)
		}
	}

	links.sort((a, b) => a.order - b.order)

	return links
}

// Links typing validation

export function isLink(link: unknown): link is Links.Link {
	return ((link as Links.Link)?._id ?? '').startsWith('links')
}

export function isElem(link: unknown): link is Links.Elem {
	return (link as Links.Link)?.folder !== true
}
