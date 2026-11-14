import { getDefaultIcon } from './helpers.ts'
import { tradThis } from '../../utils/translations.ts'
import { storage } from '../../storage.ts'

import type { LinkElem } from '../../../types/shared.ts'
import type { Sync } from '../../../types/sync.ts'

export const CHROME_GROUP_COLORS: Record<string, string> = {
    grey: '#8a8d91',
    blue: '#1a73e8',
    red: '#d93025',
    yellow: '#f9ab00',
    green: '#188038',
    pink: '#e52592',
    purple: '#af5cf7',
    cyan: '#12b5cb',
    orange: '#fa903e',
}

interface CachedTabGroup {
    id: number
    title: string
    color: string
    tabs: LinkElem[]
}

let cachedTabGroups: CachedTabGroup[] = []
let listenersAttached = false
let updateCallback: (() => void) | undefined
let debounceTimer: ReturnType<typeof setTimeout> | undefined

export function isTabGroupsAvailable(): boolean {
    return typeof chrome !== 'undefined' && !!chrome?.tabGroups && !!chrome?.tabs
}

export function isTabGroup(groupTitle: string): boolean {
    return cachedTabGroups.some((g) => g.title === groupTitle)
}

export function getTabGroupLinks(groupTitle: string): LinkElem[] | undefined {
    const found = cachedTabGroups.find((g) => g.title === groupTitle)
    return found ? [...found.tabs] : undefined
}

export function getTabGroupColor(groupTitle: string): string | undefined {
    return cachedTabGroups.find((g) => g.title === groupTitle)?.color
}

export async function initTabGroupsSync(sync: Sync, onUpdate?: () => void): Promise<boolean> {
    if (onUpdate) {
        updateCallback = onUpdate
    }

    if (!isTabGroupsAvailable()) {
        return false
    }

    try {
        const [tabGroups, tabs] = await Promise.all([
            chrome.tabGroups.query({}),
            chrome.tabs.query({}),
        ])

        const newCachedGroups: CachedTabGroup[] = []
        const colors = sync.linkgroups.groupColors ?? {}

        for (const tg of tabGroups) {
            const rawTitle = tg.title?.trim()
            const groupTitle = rawTitle || `${tradThis('Group')} ${tg.id}`
            const hexColor = CHROME_GROUP_COLORS[tg.color] ?? tg.color ?? '#1a73e8'

            colors[groupTitle] = hexColor

            const groupTabs = tabs.filter((t) => t.groupId === tg.id)
            const mappedLinks: LinkElem[] = groupTabs.map((t) => ({
                _id: `tab_${t.id ?? Math.random().toString(36).substring(2, 9)}`,
                parent: groupTitle,
                folder: false,
                order: t.index,
                title: t.title || t.url || tradThis('New tab'),
                url: t.url || '',
                tabId: t.id,
                windowId: t.windowId,
                icon: {
                    type: 'url',
                    value: t.favIconUrl || (t.url ? getDefaultIcon(t.url) : ''),
                },
            }))

            newCachedGroups.push({
                id: tg.id,
                title: groupTitle,
                color: hexColor,
                tabs: mappedLinks,
            })
        }

        cachedTabGroups = newCachedGroups
        sync.linkgroups.groupColors = colors

        // If syncTabGroups is enabled, ensure groups exist in sync.linkgroups.groups
        if (sync.linkgroups.syncTabGroups ?? true) {
            const currentTabGroupTitles = newCachedGroups.map((g) => g.title)
            for (const title of currentTabGroupTitles) {
                if (!sync.linkgroups.groups.includes(title)) {
                    sync.linkgroups.groups.push(title)
                }
            }
            if (currentTabGroupTitles.length > 0) {
                const defaultIndex = sync.linkgroups.groups.indexOf('default')
                if (defaultIndex !== -1 && sync.linkgroups.groups.length > 1) {
                    sync.linkgroups.groups.splice(defaultIndex, 1)
                }
                if (sync.linkgroups.selected === 'default' && currentTabGroupTitles[0]) {
                    sync.linkgroups.selected = currentTabGroupTitles[0]
                }
            }
        }

        attachTabGroupListeners()
        return true
    } catch (error) {
        console.warn('Failed to sync Chrome tab groups:', error)
        return false
    }
}

function attachTabGroupListeners(): void {
    if (listenersAttached || !isTabGroupsAvailable()) {
        return
    }

    const triggerUpdate = (): void => {
        if (debounceTimer) {
            clearTimeout(debounceTimer)
        }
        debounceTimer = setTimeout(async () => {
            try {
                const data = await storage.sync.get()
                await initTabGroupsSync(data)
                await storage.sync.set(data)
            } catch (_) {
                // Ignore storage error
            }
            if (updateCallback) {
                updateCallback()
            }
        }, 150)
    }

    try {
        chrome.tabGroups.onCreated?.addListener(triggerUpdate)
        chrome.tabGroups.onUpdated?.addListener(triggerUpdate)
        chrome.tabGroups.onRemoved?.addListener(triggerUpdate)
        chrome.tabGroups.onMoved?.addListener(triggerUpdate)

        chrome.tabs.onCreated?.addListener(triggerUpdate)
        chrome.tabs.onUpdated?.addListener(triggerUpdate)
        chrome.tabs.onRemoved?.addListener(triggerUpdate)
        chrome.tabs.onMoved?.addListener(triggerUpdate)
        chrome.tabs.onAttached?.addListener(triggerUpdate)
        chrome.tabs.onDetached?.addListener(triggerUpdate)

        listenersAttached = true
    } catch (e) {
        console.warn('Failed to attach Chrome tab groups listeners:', e)
    }
}

export function focusChromeTab(tabId: number, windowId?: number): void {
    if (!isTabGroupsAvailable()) {
        return
    }

    try {
        chrome.tabs.update(tabId, { active: true }, () => {
            if (windowId && chrome.windows) {
                chrome.windows.update(windowId, { focused: true })
            }
        })
    } catch (_) {
        // Fallback
    }
}
