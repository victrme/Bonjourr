import { assert, assertEquals } from '@std/assert'
import { click, flush, selectWidget, setupLayout, setViewport, VIEWPORT, widget } from '../helpers/free-layout.ts'
import { gridMetrics, overlaps, rectToGrid, validateLayout } from '../../src/scripts/features/free-layout/geometry.ts'

// Happy DOM does not calculate content sizes or dispatch real resize notifications.
const contentResizes: (() => void)[] = []
const NativeResizeObserver = ResizeObserver
globalThis.ResizeObserver = class extends NativeResizeObserver {
    constructor(callback: ResizeObserverCallback) {
        super(callback)
        contentResizes.push(() => callback([], this))
    }
}
setupLayout()
const canvas = document.getElementById('interface')!
const time = widget('time')
let firstCapture = true
Object.defineProperty(canvas, 'offsetLeft', { get: () => firstCapture ? 100 : 0 })
canvas.getBoundingClientRect = () => firstCapture ? new DOMRect(0, -50, 1000, 800) : new DOMRect(0, 0, 1200, 800)
for (const element of canvas.children) {
    element.getBoundingClientRect = () => firstCapture ? new DOMRect(0, 50, 300, 200) : new DOMRect(100, 100, 300, 200)
}
const { storage } = await import('../../src/scripts/storage.ts')
const { freeLayout } = await import('../../src/scripts/features/free-layout/index.ts')
storage.type.init()
freeLayout()
freeLayout()
document.getElementById('b_editmove')!.addEventListener('click', () => freeLayout(undefined, { edit: true }))
const open = (): void => click('#b_editmove')
const cancel = (): void => click('#free-layout-toolbar > button')
const save = async (): Promise<void> => {
    click('.free-layout-primary')
    await flush()
}
const cell = (name: string): number => Number(time.style.getPropertyValue('--tile-' + name))
const grid = gridMetrics(VIEWPORT)

function startDrag(handle: string): void {
    const overlay = document.querySelector<HTMLElement>('[data-widget="time"]')!
    overlay.setPointerCapture = () => undefined
    overlay.hasPointerCapture = () => false
    overlay.querySelector(`[data-handle="${handle}"]`)!.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 7, clientX: 200, clientY: 200 }),
    )
}
function movePointer(dx: number, dy: number): void {
    document.dispatchEvent(new PointerEvent('pointermove', { pointerId: 7, clientX: 200 + dx, clientY: 200 + dy }))
}
function drag(handle: string, dx: number, dy: number, cancelled = false): void {
    startDrag(handle)
    movePointer(dx, dy)
    document.dispatchEvent(new PointerEvent(cancelled ? 'pointercancel' : 'pointerup', { pointerId: 7 }))
}

Deno.test({
    name: 'Layout editing preserves geometry, alignment and content through save, cancel and settings changes',
    sanitizeResources: false,
    sanitizeOps: false,
    fn: async (test) => {
        await test.step('Initial capture accounts for page translation and initializes only once', () => {
            open()
            firstCapture = false
            assertEquals(document.querySelectorAll('#free-layout-toolbar').length, 1)
            assertEquals([cell('column'), cell('columns'), cell('rows')], [3, 7, 6])
            assert(document.getElementById('free-layout-alignment')!.hidden)
        })
        await test.step('Pointer motion is continuous before snapping and resizing to saved cells', async () => {
            const column = cell('column')
            startDrag('move')
            movePointer(7, 9)
            await flush()
            assertEquals(time.style.getPropertyValue('--floating-x'), '107px')
            assertEquals(cell('column'), column)
            document.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7 }))
            assertEquals(time.dataset.floating, undefined)
            drag('move', grid.columnStep, grid.rowStep)
            drag('se', grid.columnStep * 2, grid.rowStep)
            assertEquals([cell('column'), cell('columns'), cell('rows')], [column + 1, 9, 7])
            await save()
            const layout = (await storage.sync.get()).freeLayout!
            const positions = Object.values(layout.widgets).map((rect) => rectToGrid(rect!, layout.viewport))
            for (let a = 0; a < positions.length; a++) {
                for (let b = a + 1; b < positions.length; b++) assert(!overlaps(positions[a], positions[b]))
            }
        })
        await test.step('Selecting a tile edits only its contents; saved alignment is validated and restored on Cancel', async () => {
            const before = (await storage.sync.get()).freeLayout!
            open()
            selectWidget('time')
            click('#free-layout-text-alignment [data-align="right"]')
            selectWidget('main')
            assertEquals(
                document.querySelector('#free-layout-text-alignment [data-align="right"]')!.getAttribute(
                    'aria-pressed',
                ),
                'false',
            )
            await save()
            const saved = (await storage.sync.get()).freeLayout!
            assertEquals(saved.widgets.time!.textAlign, 'right')
            assertEquals(document.querySelector('#free-layout-box-alignment'), null)
            assertEquals(
                rectToGrid(saved.widgets.time!, saved.viewport),
                rectToGrid(before.widgets.time!, before.viewport),
            )
            assertEquals(validateLayout(saved), saved)
            open()
            selectWidget('time')
            click('#free-layout-text-alignment [data-align="left"]')
            cancel()
            assertEquals(time.style.getPropertyValue('--content-text'), 'right')
            assertEquals((await storage.sync.get()).freeLayout, saved)
        })
        await test.step('Pointer interruption and Cancel roll back all affected modules', async () => {
            const before = (await storage.sync.get()).freeLayout!
            open()
            drag('se', -grid.columnStep * 6, -grid.rowStep * 4, true)
            assertEquals(document.querySelectorAll('#time').length, 1)
            await save()
            assertEquals((await storage.sync.get()).freeLayout, before)
            open()
            drag('move', grid.columnStep * 2, grid.rowStep * 2)
            cancel()
            assertEquals((await storage.sync.get()).freeLayout, before)
        })
        await test.step('Link growth shrinks back to automatic and keyboard-chosen minimums', async () => {
            const links = widget('quicklinks')
            const minimum = Number(links.style.getPropertyValue('--tile-rows'))
            links.innerHTML = '<div class="link-group"></div><div id="link-mini"></div>'
            let height = 900
            Object.defineProperties(links.children[0], { offsetTop: { value: 0 }, offsetHeight: { get: () => height } })
            Object.defineProperties(links.children[1], {
                offsetTop: { get: () => height },
                offsetHeight: { value: 60 },
            })
            contentResizes.forEach((notify) => notify())
            await flush()
            assert(parseFloat(canvas.style.getPropertyValue('--tile-grid-page-height')) > VIEWPORT.height)
            open()
            await save()
            assert((await storage.sync.get()).freeLayout!.widgets.quicklinks!.height >= 960)
            height = 40
            contentResizes.forEach((notify) => notify())
            await flush()
            assertEquals(Number(links.style.getPropertyValue('--tile-rows')), minimum)
            height = 900
            contentResizes.forEach((notify) => notify())
            await flush()
            open()
            const requestedRows = Number(links.style.getPropertyValue('--tile-rows')) - 1
            const cloneNode = links.cloneNode
            links.cloneNode = (deep?: boolean): Node => {
                const clone = cloneNode.call(links, deep) as HTMLElement
                clone.getBoundingClientRect = () => new DOMRect(0, 0, 120, height + 60)
                return clone
            }
            try {
                document.querySelector('[data-widget="quicklinks"] [data-handle="s"]')!
                    .dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
            } finally {
                links.cloneNode = cloneNode
            }
            await save()
            height = 40
            contentResizes.forEach((notify) => notify())
            await flush()
            assertEquals(Number(links.style.getPropertyValue('--tile-rows')), requestedRows)
        })
        await test.step('Existing width settings persist; mobile fallback preserves the desktop layout', async () => {
            widget('notes').classList.remove('hidden')
            open()
            await save()
            widget('notes').style.fontSize = '16px'
            freeLayout(undefined, { width: { widget: 'notes', em: 30 } })
            await new Promise<void>((resolve) => setTimeout(resolve, 450))
            const saved = (await storage.sync.get()).freeLayout!
            assertEquals(rectToGrid(saved.widgets.notes!, saved.viewport).columns, 10)
            open()
            setViewport(375)
            globalThis.dispatchEvent(new Event('resize'))
            assert(!canvas.classList.contains('free-layout'))
            assert(!document.body.classList.contains('free-layout-editing'))
            setViewport(VIEWPORT.width)
            globalThis.dispatchEvent(new Event('resize'))
            await flush()
            assert(canvas.classList.contains('free-layout'))
            assertEquals((await storage.sync.get()).freeLayout, saved)
        })
        await test.step('Failed saves keep the previous layout and an editable draft until Cancel', async () => {
            const before = (await storage.sync.get()).freeLayout!
            const originalSet = storage.sync.set
            const originalLog = console.error
            try {
                storage.sync.set = () => Promise.reject(new Error('Storage quota exceeded'))
                console.error = () => undefined
                open()
                drag('move', grid.columnStep, 0)
                click('#free-layout-text-alignment [data-align="left"]')
                await save()
                assert(document.body.classList.contains('free-layout-editing'))
                assert(document.getElementById('free-layout-status')!.textContent)
                assertEquals(document.querySelector<HTMLButtonElement>('.free-layout-primary')!.disabled, false)
                assertEquals((await storage.sync.get()).freeLayout, before)
            } finally {
                storage.sync.set = originalSet
                console.error = originalLog
                cancel()
            }
            assertEquals(time.style.getPropertyValue('--content-text'), 'right')
        })
    },
})
