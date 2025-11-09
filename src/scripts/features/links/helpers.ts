import { stringMaxSize } from '../../shared/generic.ts'
import { API_DOMAIN } from '../../defaults.ts'
import { tradThis } from '../../utils/translations.ts'

import type { Link, LinkElem, LinkIconType } from '../../../types/shared.ts'
import type { Sync } from '../../../types/sync.ts'

export function getDefaultIcon(url: string, refresh?: number) {
	if (refresh) {
		return `${API_DOMAIN}/favicon/blob/${url}?r=${refresh}`
	}

	return `${API_DOMAIN}/favicon/blob/${url}`
}

export function getSelectedIds(): string[] {
	const selected = document.querySelectorAll<HTMLLIElement>('li.selected')
	return Object.values(selected).map((li) => li.id)
}

export function getLiFromEvent(event: Event): HTMLLIElement | undefined {
	const path = event.composedPath() as Element[]
	const li = path.find((el) => el.tagName === 'LI' && el.className?.includes('link'))

	if (li) {
		return li as HTMLLIElement
	}
}

export function getTitleFromEvent(event: Event): HTMLElement | undefined {
	const path = event.composedPath() as Element[]
	const title = path.find((el) => el.className?.includes('link-title'))

	if (title) {
		return title as HTMLElement
	}
}

export function createTitle(link: Link): string {
	const isInline = document.getElementById('linkblocks')?.className.includes('inline')
	const isText = document.getElementById('linkblocks')?.className.includes('text')

	if (!(isInline || isText) || link?.title !== '') {
		return stringMaxSize(link.title ?? '', 64)
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

export function getLink(data: Sync, id: string): Link | undefined {
	const val = data[id]

	if (isLink(val)) {
		return val
	}
}

export function getLinksInGroup(data: Sync, group?: string): Link[] {
	const groupName = group ?? data.linkgroups.selected
	const links: Link[] = []

	for (const value of Object.values(data)) {
		if (isLink(value) && (value?.parent ?? 0) === groupName) {
			links.push(value)
		}
	}

	links.sort((a, b) => a.order - b.order)

	return links
}

export function getLinksInFolder(data: Sync, id: string): LinkElem[] {
	const links: LinkElem[] = []

	for (const value of Object.values(data)) {
		if (isElem(value) && value?.parent === id) {
			links.push(value)
		}
	}

	links.sort((a, b) => a.order - b.order)

	return links
}

// Links typing validation

export function isLink(link: unknown): link is Link {
	return ((link as Link)?._id ?? '').startsWith('links')
}

export function isElem(link: unknown): link is LinkElem {
	return (link as Link)?.folder !== true
}

export function isLinkIconType(type: string): type is LinkIconType {
	return ['auto', 'library', 'file', 'url'].includes(type)
}

// to figure out if a string is a valid number
export function isNumber(value: string) {
	return !isNaN(parseFloat(value))
}
