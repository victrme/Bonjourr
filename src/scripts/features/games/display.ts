import { tradThis } from '../../utils/translations.ts'

import type { GameReleaseItem } from '../../../types/shared.ts'

const list = document.getElementById('games_list')
const LOADING_MORE_SELECTOR = '.games-loading-more'
const SENTINEL_SELECTOR = '.games-sentinel'

export function displayGames(
    items: GameReleaseItem[],
    preserveScroll = false,
    interactive = false,
    loadingMore = false,
): void {
    if (!list) {
        return
    }

    const previousScrollLeft = preserveScroll ? list.scrollLeft : 0

    list.textContent = ''

    if (items.length === 0) {
        displayGamesMessage(tradThis('No upcoming releases.'), 'games-empty')
        return
    }

    let currentMonth = ''

    for (const release of items) {
        const releaseMonth = formatMonth(release.releaseDate)

        if (releaseMonth !== currentMonth) {
            currentMonth = releaseMonth
            list.appendChild(createMonthSeparator(releaseMonth))
        }
        list.appendChild(createGameItem(release, interactive))
    }

    if (loadingMore) {
        list.appendChild(createLoadingIndicator())
    }

    list.appendChild(createScrollSentinel())

    syncGamesScroller(preserveScroll, previousScrollLeft)
}

export function appendGames(items: GameReleaseItem[], interactive = false): void {
    if (!list || items.length === 0) {
        toggleGamesLoadingMore(false)
        return
    }

    const previousScrollLeft = list.scrollLeft
    let currentMonth = getLastRenderedMonth()

    removeLoadingIndicator()

    for (const release of items) {
        const releaseMonth = formatMonth(release.releaseDate)

        if (releaseMonth !== currentMonth) {
            currentMonth = releaseMonth
            list.appendChild(createMonthSeparator(releaseMonth))
        }

        list.appendChild(createGameItem(release, interactive))
    }

    list.appendChild(createScrollSentinel())

    syncGamesScroller(true, previousScrollLeft)
}

export function toggleGamesLoadingMore(show: boolean): void {
    if (!list) {
        return
    }

    const previousScrollLeft = list.scrollLeft

    removeLoadingIndicator()

    if (show) {
        list.appendChild(createLoadingIndicator())
    }

    list.appendChild(createScrollSentinel())

    syncGamesScroller(true, previousScrollLeft)
}

export function getGamesSentinel(): Element | null {
    return list?.querySelector(SENTINEL_SELECTOR) ?? null
}

export function displayGamesLoading(): void {
    displayGamesMessage(tradThis('Loading upcoming releases...'), 'games-loading')
}

export function displayGamesError(): void {
    displayGamesMessage(tradThis('Game releases are unavailable right now.'), 'games-error')
}

export function displayGamesSetup(): void {
    displayGamesMessage(tradThis('Add your IGDB credentials in settings.'), 'games-error')
}

function displayGamesMessage(text: string, className: string): void {
    if (!list) {
        return
    }

    list.textContent = ''

    const item = document.createElement('li')
    item.className = className
    item.textContent = text
    list.appendChild(item)
    list.appendChild(createScrollSentinel())

    syncGamesScroller(false, 0)
}

function formatDate(value: string): string {
    const date = createUtcDate(value)

    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
    }).format(date)
}

function formatMonth(value: string): string {
    const date = createUtcDate(value)

    return new Intl.DateTimeFormat(undefined, {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(date)
}

function createUtcDate(value: string): Date {
    if (value.includes('T')) {
        return new Date(value)
    }

    return new Date(`${value}T00:00:00Z`)
}

function createMonthSeparator(text: string): HTMLLIElement {
    const item = document.createElement('li')
    const label = document.createElement('span')

    item.className = 'games-separator'
    item.dataset.month = text
    label.className = 'games-separator-label'
    label.textContent = text
    item.appendChild(label)

    return item
}

function createLoadingIndicator(): HTMLLIElement {
    const item = document.createElement('li')
    const spinner = document.createElement('span')
    const text = document.createElement('span')

    item.className = 'games-loading-more'
    spinner.className = 'games-loading-more-spinner'
    text.className = 'games-loading-more-text'
    text.textContent = tradThis('Loading')
    item.append(spinner, text)

    return item
}

function createScrollSentinel(): HTMLLIElement {
    const item = document.createElement('li')
    item.className = 'games-sentinel'
    item.setAttribute('aria-hidden', 'true')
    return item
}

function createGameItem(release: GameReleaseItem, interactive: boolean): HTMLLIElement {
    const item = document.createElement('li')
    const cover = release.cover ? document.createElement('img') : document.createElement('div')
    const coverUrl = release.cover
    const body = document.createElement('div')
    const title = document.createElement('span')
    const meta = document.createElement('span')
    const date = document.createElement('span')

    item.className = 'games-item'
    item.dataset.title = release.title
    item.classList.toggle('interactive', interactive)

    if (interactive) {
        item.tabIndex = 0
        item.setAttribute('role', 'link')
        item.setAttribute('aria-label', release.title)
    }

    cover.className = 'games-item-cover'
    body.className = 'games-item-body'
    title.className = 'games-item-title'
    meta.className = 'games-item-meta'
    date.className = 'games-item-date'

    if (cover instanceof HTMLImageElement && coverUrl) {
        cover.src = coverUrl
        cover.alt = ''
        cover.decoding = 'async'
        cover.loading = 'lazy'
    }

    title.textContent = release.title
    meta.textContent = release.platform
    date.textContent = formatDate(release.releaseDate)

    body.append(title, meta, date)
    item.append(cover, body)

    return item
}

function getLastRenderedMonth(): string {
    const separators = list?.querySelectorAll<HTMLLIElement>('.games-separator')
    const separator = separators ? separators[separators.length - 1] : undefined
    return separator?.dataset.month ?? ''
}

function removeLoadingIndicator(): void {
    list?.querySelector(LOADING_MORE_SELECTOR)?.remove()
    list?.querySelector(SENTINEL_SELECTOR)?.remove()
}

function syncGamesScroller(preserveScroll: boolean, previousScrollLeft: number): void {
    if (!list) {
        return
    }

    requestAnimationFrame(() => {
        const hasOverflow = list.scrollWidth > list.clientWidth + 1
        list.classList.toggle('centered', !hasOverflow)

        if (preserveScroll && hasOverflow) {
            list.scrollLeft = previousScrollLeft
        }

        if (!preserveScroll && hasOverflow && list.scrollLeft !== 0) {
            list.scrollLeft = 0
        }
    })
}
