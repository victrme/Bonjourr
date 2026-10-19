import { assert, assertEquals } from '@std/assert'
import { click, flush, setupLayout, VIEWPORT, widget } from '../helpers/free-layout.ts'
import { initialRect, rectToGrid } from '../../src/scripts/features/free-layout/geometry.ts'
import type { GridPosition } from '../../src/scripts/features/free-layout/geometry.ts'
import type { MoveLayout } from '../../src/types/sync.ts'
import type { Widgets } from '../../src/types/shared.ts'

setupLayout()
const { addGridWidget, removeGridWidget, gridParse, getGridWidgets, elements } = await import(
    '../../src/scripts/features/move/helpers.ts'
)
// Dispatch visibility changes deterministically: Happy DOM does not run a browser layout engine.
const mutations: { observer: MutationObserver; callback: MutationCallback }[] = []
const NativeMutationObserver = MutationObserver
globalThis.MutationObserver = class extends NativeMutationObserver {
    constructor(private readonly callback: MutationCallback) {
        super(callback)
    }
    override observe(target: Node, options?: MutationObserverInit): void {
        super.observe(target, options)
        if (options?.attributeFilter?.includes('class') && !mutations.some((entry) => entry.observer === this)) {
            mutations.push({ observer: this, callback: this.callback })
        }
    }
}
const { storage } = await import('../../src/scripts/storage.ts')
const { moveElements } = await import('../../src/scripts/features/move/index.ts')
const { freeLayout } = await import('../../src/scripts/features/free-layout/index.ts')
const canvas = document.getElementById('interface')!
const root = document.documentElement
const areas = (): string => root.style.getPropertyValue('--grid')
let spacing = 160
function nativeBounds(id: Widgets): DOMRect {
    const row = gridParse(areas()).findIndex((items) => items.includes(id))
    return new DOMRect(450, 120 + row * spacing, 300, 100)
}
canvas.getBoundingClientRect = () => new DOMRect(0, 0, VIEWPORT.width, VIEWPORT.height)
for (const [id, element] of Object.entries(elements)) {
    element!.getBoundingClientRect = () =>
        canvas.classList.contains('free-layout') ? new DOMRect(1180, 1800, 20, 20) : nativeBounds(id as Widgets)
}
const offsets: Partial<Record<Widgets, Partial<GridPosition>>> = {}
async function assertPositions(): Promise<void> {
    const saved = (await storage.sync.get()).freeLayout!
    for (const id of getGridWidgets(areas())) {
        const { x, y, width, height } = nativeBounds(id)
        const expected = rectToGrid(initialRect({ x, y, width, height }, VIEWPORT), VIEWPORT)
        for (const key of ['column', 'row', 'columns', 'rows'] as const) expected[key] += offsets[id]?.[key] ?? 0
        assertEquals(rectToGrid(saved.widgets[id]!, saved.viewport), expected, id)
    }
}
async function toggle(id: Widgets, enabled: boolean): Promise<void> {
    root.style.setProperty('--grid', (enabled ? addGridWidget : removeGridWidget)(areas(), id, 'single'))
    widget(id).classList.toggle('hidden', !enabled)
    for (const { callback, observer } of mutations) callback([], observer)
    await flush()
}
async function save(): Promise<void> {
    click('.free-layout-primary')
    await flush()
}

Deno.test({
    name: 'Native layout compatibility preserves insertion order, stored settings and manual adjustments',
    sanitizeResources: false,
    sanitizeOps: false,
    fn: async (test) => {
        storage.type.init()
        await test.step('Old multi-column layouts and alignment still initialize through the native entry', () => {
            for (const selection of ['double', 'triple'] as const) {
                moveElements({
                    selection,
                    layouts: {
                        [selection]: {
                            grid: [['time', ...Array(selection === 'double' ? 1 : 2).fill('.')]],
                            items: { time: { box: 'end', text: 'left' } } as MoveLayout['items'],
                        },
                    },
                })
                assertEquals(gridParse(areas())[0].length, selection === 'double' ? 2 : 3)
                assertEquals(widget('time').style.placeSelf, 'end')
                assert(widget('time').classList.contains('layout-text-left'))
            }
            moveElements({
                selection: 'single',
                layouts: {
                    single: {
                        grid: [['time'], ['main'], ['quicklinks']],
                        items: { time: undefined } as MoveLayout['items'],
                    },
                },
            })
        })
        const stored = {
            enabled: true,
            mode: 'grid' as const,
            viewport: VIEWPORT,
            widgets: {
                ...Object.fromEntries(['time', 'main', 'quicklinks'].map((id) => {
                    const { x, y, width, height } = nativeBounds(id as Widgets)
                    return [id, initialRect({ x, y, width, height }, VIEWPORT)]
                })),
                notes: initialRect({ x: 450, y: 1800, width: 300, height: 100 }, VIEWPORT),
            },
        }
        // These enabled modules were missing from an older saved free layout.
        for (const id of ['searchbar', 'quotes', 'pomodoro'] as const) {
            root.style.setProperty('--grid', addGridWidget(areas(), id, 'single'))
            widget(id).classList.remove('hidden')
        }
        freeLayout(stored)
        freeLayout(undefined, { edit: true })
        await save()
        await assertPositions()
        for (const id of ['searchbar', 'quotes', 'pomodoro'] as const) await toggle(id, false)
        await test.step('New and re-enabled modules use native rows without accumulating drift', async () => {
            for (const id of ['notes', 'searchbar', 'quotes', 'pomodoro'] as const) {
                await toggle(id, true)
                await assertPositions()
            }
            spacing = 110
            await toggle('notes', false)
            await toggle('notes', true)
            const first = (await storage.sync.get()).freeLayout!
            const positions = getGridWidgets(areas()).map((id) => rectToGrid(first.widgets[id]!, first.viewport))
            for (let index = 1; index < positions.length; index++) {
                assert(positions[index].row >= positions[index - 1].row + positions[index - 1].rows)
                assertEquals(positions[index].column, positions[0].column)
            }
            for (let cycle = 0; cycle < 2; cycle++) {
                await toggle('notes', false)
                await toggle('notes', true)
                assertEquals((await storage.sync.get()).freeLayout!.widgets, first.widgets)
            }
        })
        await test.step('Module switches retain manual movement and resizing', async () => {
            spacing = 160
            await toggle('notes', false)
            await toggle('notes', true)
            freeLayout(undefined, { edit: true })
            for (const handle of ['move', 'e']) {
                document.querySelector(`[data-widget="time"] [data-handle="${handle}"]`)!
                    .dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
            }
            offsets.time = { column: 1, columns: 1 }
            await save()
            await toggle('notes', false)
            await toggle('notes', true)
            await assertPositions()
        })
    },
})
