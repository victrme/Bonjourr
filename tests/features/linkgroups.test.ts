import { assertEquals, assertNotEquals } from '@std/assert'
import '../init.ts'

import {
    changeGroupColumns,
    changeGroupLayout,
    toggleGroupMode,
    toggleHideEmpty,
} from '../../src/scripts/features/links/groups.ts'
import { initblocks } from '../../src/scripts/features/links/index.ts'
import { CHROME_GROUP_COLORS } from '../../src/scripts/features/links/tabgroups.ts'
import { SYNC_DEFAULT } from '../../src/scripts/defaults.ts'
import { storage } from '../../src/scripts/storage.ts'
import type { Sync } from '../../src/types/sync.ts'
import type { LinkElem } from '../../src/types/shared.ts'

storage.type.init()

function setupDOM(): void {
    document.body.innerHTML = `
        <template id="link-group-template">
            <div class="link-group">
                <button class="link-title" tabindex="-1"></button>
                <ul class="link-list"></ul>
            </div>
        </template>
        <template id="link-elem-template">
            <li class="link link-elem">
                <a href="">
                    <div class="link-icon">
                        <img src="" alt="" />
                    </div>
                    <span class="link-elem-title"></span>
                </a>
            </li>
        </template>
        <template id="link-folder-template">
            <li class="link link-folder">
                <a href="">
                    <div class="link-icon">
                        <img src="" alt="" />
                        <img src="" alt="" />
                        <img src="" alt="" />
                        <img src="" alt="" />
                    </div>
                    <span class="link-elem-title"></span>
                </a>
            </li>
        </template>
        <main id="interface">
            <div id="linkblocks">
                <div id="link-mini">
                    <div></div>
                </div>
            </div>
        </main>
        <dialog id="contextmenu"></dialog>
    `
}

function createMockSync(): Sync {
    const data = structuredClone(SYNC_DEFAULT) as Sync
    data.linkgroups.on = true
    data.linkgroups.groups = ['Group 1', 'Group 2', 'Group 3', 'Empty Group']
    data.linkgroups.selected = 'Group 1'
    data.linkgroups.pinned = []
    data.linkgroups.showAll = false
    data.linkgroups.layout = 'horizontal'
    data.linkgroups.columns = 'auto'
    data.linkgroups.hideEmpty = false

    // Links for Group 1
    const link1: LinkElem = {
        _id: 'links000001',
        parent: 'Group 1',
        title: 'Link 1-1',
        url: 'https://example1.com',
        order: 1,
        folder: false,
    }
    const link2: LinkElem = {
        _id: 'links000002',
        parent: 'Group 1',
        title: 'Link 1-2',
        url: 'https://example2.com',
        order: 2,
        folder: false,
    }

    // Links for Group 2
    const link3: LinkElem = {
        _id: 'links000003',
        parent: 'Group 2',
        title: 'Link 2-1',
        url: 'https://example3.com',
        order: 1,
        folder: false,
    }

    // Links for Group 3
    const link4: LinkElem = {
        _id: 'links000004',
        parent: 'Group 3',
        title: 'Link 3-1',
        url: 'https://example4.com',
        order: 1,
        folder: false,
    }

    data['links000001'] = link1
    data['links000002'] = link2
    data['links000003'] = link3
    data['links000004'] = link4

    return data
}

Deno.test({
    name: 'Standard mode displays only selected/pinned groups',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: () => {
        setupDOM()
        const data = createMockSync()
        data.linkgroups.showAll = false

        const local = {} as any
        initblocks(data, local)

        const linkblocks = document.getElementById('linkblocks')!
        assertEquals(linkblocks.classList.contains('show-all'), false)

        const renderedGroups = document.querySelectorAll('#linkblocks .link-group')
        // In standard mode with no pinned groups, only 1 group (selected) is shown
        assertEquals(renderedGroups.length, 1)
        assertEquals((renderedGroups[0] as HTMLElement).dataset.group, 'Group 1')
    },
})

Deno.test({
    name: 'All groups mode displays all groups simultaneously',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: () => {
        setupDOM()
        const data = createMockSync()
        data.linkgroups.showAll = true
        data.linkgroups.hideEmpty = false

        const local = {} as any
        initblocks(data, local)

        const linkblocks = document.getElementById('linkblocks')!
        assertEquals(linkblocks.classList.contains('show-all'), true)

        const renderedGroups = document.querySelectorAll('#linkblocks .link-group')
        // All 4 groups should be rendered simultaneously
        assertEquals(renderedGroups.length, 4)

        const groupTitles = Array.from(renderedGroups).map((g) => (g as HTMLElement).dataset.group)
        assertEquals(groupTitles.includes('Group 1'), true)
        assertEquals(groupTitles.includes('Group 2'), true)
        assertEquals(groupTitles.includes('Group 3'), true)
        assertEquals(groupTitles.includes('Empty Group'), true)
    },
})

Deno.test({
    name: 'Hide empty groups setting filters out groups with no links',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: () => {
        setupDOM()
        const data = createMockSync()
        data.linkgroups.showAll = true
        data.linkgroups.hideEmpty = true

        const local = {} as any
        initblocks(data, local)

        const renderedGroups = document.querySelectorAll('#linkblocks .link-group')
        // 'Empty Group' should be omitted, so 3 groups remain
        assertEquals(renderedGroups.length, 3)

        const groupTitles = Array.from(renderedGroups).map((g) => (g as HTMLElement).dataset.group)
        assertEquals(groupTitles.includes('Empty Group'), false)
    },
})

Deno.test({
    name: 'toggleGroupMode updates state and class correctly',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: () => {
        setupDOM()
        const data = createMockSync()

        toggleGroupMode(true, data)
        assertEquals(data.linkgroups.showAll, true)
        assertEquals(document.getElementById('linkblocks')!.classList.contains('show-all'), true)

        toggleGroupMode(false, data)
        assertEquals(data.linkgroups.showAll, false)
        assertEquals(document.getElementById('linkblocks')!.classList.contains('show-all'), false)
    },
})

Deno.test({
    name: 'changeGroupLayout updates layout between horizontal and vertical',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: () => {
        setupDOM()
        const data = createMockSync()
        data.linkgroups.showAll = true

        changeGroupLayout('vertical', data)
        assertEquals(data.linkgroups.layout, 'vertical')
        assertEquals(document.getElementById('linkblocks')!.classList.contains('layout-vertical'), true)

        changeGroupLayout('horizontal', data)
        assertEquals(data.linkgroups.layout, 'horizontal')
        assertEquals(document.getElementById('linkblocks')!.classList.contains('layout-vertical'), false)
    },
})

Deno.test({
    name: 'changeGroupColumns and toggleHideEmpty update data correctly',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: () => {
        setupDOM()
        const data = createMockSync()

        changeGroupColumns('4', data)
        assertEquals(data.linkgroups.columns, '4')

        toggleHideEmpty(true, data)
        assertEquals(data.linkgroups.hideEmpty, true)
    },
})

Deno.test({
    name: 'Chrome group colors mapping and custom group color application',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: () => {
        setupDOM()
        const data = createMockSync()
        data.linkgroups.showAll = true
        data.linkgroups.groupColors = {
            'Group 1': CHROME_GROUP_COLORS.blue,
            'Group 2': CHROME_GROUP_COLORS.red,
        }

        const local = {} as any
        initblocks(data, local)

        const g1 = document.querySelector<HTMLElement>('.link-group[data-group="Group 1"]')!
        assertEquals(g1.dataset.color, CHROME_GROUP_COLORS.blue)
        assertEquals(g1.style.getPropertyValue('--group-color'), CHROME_GROUP_COLORS.blue)

        const g2 = document.querySelector<HTMLElement>('.link-group[data-group="Group 2"]')!
        assertEquals(g2.dataset.color, CHROME_GROUP_COLORS.red)
        assertEquals(g2.style.getPropertyValue('--group-color'), CHROME_GROUP_COLORS.red)
    },
})

Deno.test({
    name: 'Add group button is attached to the last group card and styled with plus icon and title tooltip',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: () => {
        setupDOM()
        const data = createMockSync()
        data.linkgroups.showAll = true
        data.linkgroups.on = true

        const local = {} as any
        initblocks(data, local)

        const addBtn = document.querySelector<HTMLButtonElement>('.add-group-btn')!
        assertEquals(!!addBtn, true)
        assertEquals(addBtn.textContent, '+')
        assertEquals(addBtn.classList.contains('add-group'), true)
        assertEquals(addBtn.hasAttribute('title'), true)

        // It should be attached inside the last group card to avoid affecting flex centering
        const allGroups = document.querySelectorAll<HTMLElement>('.link-group')
        const lastGroup = allGroups[allGroups.length - 1]!
        assertEquals(lastGroup.contains(addBtn), true)
    },
})

Deno.test({
    name: 'Disabling quicklinks correctly hides linkblocks even when showAll and linkgroups are enabled',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: () => {
        setupDOM()
        const data = createMockSync()
        data.linkgroups.showAll = true
        data.linkgroups.on = true
        data.quicklinks = false

        const local = {} as any
        initblocks(data, local)

        const linkblocks = document.getElementById('linkblocks')!
        assertEquals(linkblocks.classList.contains('hidden'), true)
    },
})
