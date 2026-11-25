import { stringMaxSize } from '../../shared/generic.ts'
import { API_DOMAIN } from '../../defaults.ts'
import { tradThis } from '../../utils/translations.ts'

import type { Link, LinkElem, LinkIconType } from '../../../types/shared.ts'
import type { Sync } from '../../../types/sync.ts'

export function isLocalUrl(url: string): boolean {
    try {
        const { hostname } = new URL(url)
        const localTlds = ['.local', '.lan', '.internal', '.home.arpa', '.home', '.corp', '.localhost']

        if (hostname === 'localhost' || hostname === '[::1]' || !hostname.includes('.')) {
            return true
        }

        if (localTlds.some((tld) => hostname.endsWith(tld))) {
            return true
        }

        return /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[0-1])\.|100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\.)/
            .test(
                hostname,
            )
    } catch (_) {
        return false
    }
}

export function getDefaultIcon(url: string, refresh?: number): string {
    if (isLocalUrl(url)) {
        try {
            const { origin } = new URL(url)
            return refresh ? `${origin}/apple-touch-icon.png?r=${refresh}` : `${origin}/apple-touch-icon.png`
        } catch (_) {
            //
        }
    }

    if (refresh) {
        return `${API_DOMAIN}/favicon/blob/${url}?r=${refresh}`
    }

    return `${API_DOMAIN}/favicon/blob/${url}`
}

export function applyLocalIconFallback(img: HTMLImageElement, linkUrl: string, giveUp?: boolean): void {
    const fallbackIcon = isLocalUrl(linkUrl)
        ? `${API_DOMAIN}/favicon/blob/http://localhost`
        : `${API_DOMAIN}/favicon/blob/error`
    let origin = ''

    try {
        origin = new URL(linkUrl).origin
    } catch (_) {
        //
    }

    if (!giveUp && origin) {
        if (img.src.startsWith(API_DOMAIN)) {
            img.onerror = () => applyLocalIconFallback(img, linkUrl)
            img.src = `${origin}/apple-touch-icon.png`
            return
        }

        if (img.src.includes('/apple-touch-icon.png')) {
            img.onerror = () => applyLocalIconFallback(img, linkUrl)
            img.src = `${origin}/favicon.svg`
            return
        }

        if (img.src.includes('/favicon.svg')) {
            img.onerror = () => applyLocalIconFallback(img, linkUrl)
            img.src = `${origin}/favicon.png`
            return
        }

        if (img.src.includes('/favicon.png')) {
            img.onerror = () => applyLocalIconFallback(img, linkUrl, true)
            img.src = `${origin}/favicon.ico`
            return
        }
    }

    img.onerror = null
    img.src = fallbackIcon
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
    const isInline = document.getElementById('linkblocks')?.classList.contains('inline')
    const isText = document.getElementById('linkblocks')?.classList.contains('text')

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
export function isNumber(value: string): boolean {
    return !isNaN(parseFloat(value))
}

// to know if the user is writing in something
export function isTypingTarget(target: EventTarget | null): boolean {
    return (
        target instanceof HTMLElement &&
        (
            target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement ||
            target.isContentEditable
        )
    )
}
