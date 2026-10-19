import { assert, assertAlmostEquals, assertEquals } from '@std/assert'
import { setViewport } from '../helpers/free-layout.ts'
import { fitLinksRect, linksContentHeight } from '../../src/scripts/features/free-layout/content.ts'
import { animateTiles, measureTiles, moveToolbar } from '../../src/scripts/features/free-layout/motion.ts'
import {
    arrangeRows,
    arrangeWidgets,
    changeRect,
    continuousRect,
    gridMetrics,
    gridToRect,
    initialRect,
    overlaps,
    projectRect,
    rectToGrid,
    validateLayout,
} from '../../src/scripts/features/free-layout/geometry.ts'
import type { FreeLayoutRect } from '../../src/types/sync.ts'

const viewport = { width: 1200, height: 800 }
const natural: FreeLayoutRect = {
    x: 0,
    y: 0,
    width: 300,
    height: 200,
}
const position = { column: 4, row: 3, columns: 6, rows: 4 }
const rect = gridToRect(position, viewport, natural)
const grid = gridMetrics(viewport)

Deno.test('Every resize handle respects measured content dimensions in both live and snapped geometry', () => {
    for (const minimum of [{ width: 190, height: 95 }, { width: 390, height: 295 }]) {
        for (const handle of ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const) {
            const dx = handle.includes('w') ? 9999 : -9999
            const dy = handle.includes('n') ? 9999 : -9999
            for (
                const resized of [
                    changeRect(rect, handle, dx, dy, viewport, minimum),
                    continuousRect(rect, handle, dx, dy, viewport, minimum),
                ]
            ) {
                assert(resized.width >= minimum.width)
                assert(resized.height >= minimum.height)
                if (handle.includes('w') && minimum.width <= rect.x + rect.width - grid.left) {
                    assertAlmostEquals(resized.x + resized.width, rect.x + rect.width)
                }
                if (handle.includes('n') && minimum.height + grid.rowStep <= rect.y + rect.height - grid.top) {
                    assertAlmostEquals(resized.y + resized.height, rect.y + rect.height)
                }
            }
        }
    }
})

Deno.test('The layout toolbar can be dragged by its title and stays inside the viewport', () => {
    setViewport(viewport.width, viewport.height)
    const toolbar = document.createElement('section')
    toolbar.innerHTML = '<strong>Page layout</strong><button>Save</button>'
    toolbar.getBoundingClientRect = () =>
        new DOMRect(parseFloat(toolbar.style.left) || 20, parseFloat(toolbar.style.top) || 30, 300, 100)
    toolbar.setPointerCapture = () => undefined
    toolbar.hasPointerCapture = () => false
    moveToolbar(toolbar)
    toolbar.firstElementChild!.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 1, clientX: 100, clientY: 100 }),
    )
    toolbar.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 160, clientY: 180 }))
    assertEquals([toolbar.style.left, toolbar.style.top], ['80px', '110px'])
    toolbar.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: -1000, clientY: -1000 }))
    assertEquals([toolbar.style.left, toolbar.style.top], ['8px', '8px'])
    toolbar.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }))
})

Deno.test('Text alignment is validated, and earlier component alignment migrates only its text setting', () => {
    const layout = { enabled: true, mode: 'grid', viewport, widgets: { time: { ...rect, textAlign: 'left' } } }
    assertEquals(validateLayout(layout)?.widgets.time?.textAlign, 'left')
    for (const textAlign of [null, 'invalid', { text: 'left' }]) {
        assertEquals(
            validateLayout({ ...layout, widgets: { time: { ...rect, textAlign } } })?.widgets.time?.textAlign,
            undefined,
        )
    }
    const migrated = validateLayout({ ...layout, widgets: { time: { ...rect, align: { box: 'end', text: 'right' } } } })
    assertEquals(migrated?.widgets.time?.textAlign, 'right')
    assert(!('align' in migrated!.widgets.time!))
})

Deno.test('Native flow resolves rounded row overlap vertically without moving centred widgets sideways', () => {
    const widgets = {
        time: gridToRect({ column: 9, row: 0, columns: 6, rows: 3 }, viewport, natural),
        main: gridToRect({ column: 8, row: 2, columns: 8, rows: 4 }, viewport, natural),
        pomodoro: gridToRect({ column: 8, row: 5, columns: 8, rows: 4 }, viewport, natural),
    }
    const arranged = arrangeRows(widgets, viewport, ['time', 'main', 'pomodoro'])
    assertEquals(rectToGrid(arranged.time!, viewport), { column: 9, row: 0, columns: 6, rows: 3 })
    assertEquals(rectToGrid(arranged.main!, viewport), { column: 8, row: 3, columns: 8, rows: 4 })
    assertEquals(rectToGrid(arranged.pomodoro!, viewport), { column: 8, row: 7, columns: 8, rows: 4 })
})

Deno.test('Initially centred widgets keep one centre line across different widths and viewports', () => {
    for (const screen of [viewport, { width: 3732, height: 1851 }, { width: 600, height: 400 }]) {
        for (const width of [0, 70, 120, 237, 300, 499]) {
            const original = { ...natural, width, x: (screen.width - width) / 2 }
            const captured = initialRect(original, screen)
            assertAlmostEquals(captured.x + captured.width / 2, screen.width / 2)
            assertEquals(rectToGrid(captured, screen).columns % 2, 0)
            assert(captured.width >= original.width)
        }
    }
    const offCentre = initialRect(natural, viewport)
    assertEquals(rectToGrid(offCentre, viewport), rectToGrid(natural, viewport, true))
})

Deno.test('The held module follows sub-cell pointer movement and resizing continuously', () => {
    const moved = continuousRect(rect, 'move', 7, 9, viewport)
    assertEquals(moved.x, rect.x + 7)
    assertEquals(moved.y, rect.y + 9)
    assertEquals(changeRect(rect, 'move', 7, 9, viewport), rect)
    const resized = continuousRect(rect, 'se', 13, 11, viewport)
    assertEquals(resized.width, rect.width + 13)
    assertEquals(resized.height, rect.height + 11)
    const west = continuousRect(rect, 'w', 17, 0, viewport)
    assertEquals(west.x + west.width, rect.x + rect.width)
})

Deno.test('Dragging stays within the columns and can extend the page vertically', () => {
    assertEquals(rectToGrid(changeRect(rect, 'move', 37, 53, viewport), viewport), { ...position, column: 5, row: 4 })
    assertEquals(rectToGrid(changeRect(rect, 'move', -9999, grid.rowStep * 20, viewport), viewport), {
        ...position,
        column: 0,
        row: 23,
    })
})

Deno.test('Eight resize handles change occupied cells while anchoring the opposite edge', () => {
    assertEquals(rectToGrid(changeRect(rect, 'se', grid.columnStep * 2, grid.rowStep, viewport), viewport), {
        ...position,
        columns: 8,
        rows: 5,
    })
    assertEquals(rectToGrid(changeRect(rect, 'nw', grid.columnStep, grid.rowStep, viewport), viewport), {
        column: 5,
        row: 4,
        columns: 5,
        rows: 3,
    })
    for (const handle of ['n', 'ne', 'e', 's', 'sw', 'w'] as const) {
        const result = rectToGrid(changeRect(rect, handle, grid.columnStep, grid.rowStep, viewport), viewport)
        assert(result.columns >= 2 && result.rows >= 1)
        if (handle.includes('w')) assertEquals(result.column + result.columns, 10)
        if (handle.includes('n')) assertEquals(result.row + result.rows, 7)
    }
    assertEquals(rectToGrid(changeRect(rect, 'nw', 9999, 9999, viewport), viewport), {
        column: 8,
        row: 6,
        columns: 2,
        rows: 1,
    })
})

Deno.test('Growing a tile relocates conflicting neighbors without changing their sizes', () => {
    const widgets = {
        time: gridToRect({ column: 0, row: 0, columns: 6, rows: 4 }, viewport, natural),
        main: gridToRect({ column: 6, row: 0, columns: 6, rows: 4 }, viewport, natural),
        notes: gridToRect({ column: 18, row: 12, columns: 6, rows: 4 }, viewport, natural),
    }
    const candidate = { ...widgets, time: changeRect(widgets.time, 'e', grid.columnStep * 4, 0, viewport) }
    const arranged = arrangeWidgets(candidate, viewport, ['time', 'main', 'notes'], 'time')
    assertEquals(rectToGrid(arranged.time!, viewport), { column: 0, row: 0, columns: 10, rows: 4 })
    assertEquals(rectToGrid(arranged.main!, viewport).columns, 6)
    assertEquals(rectToGrid(arranged.main!, viewport).rows, 4)
    assertEquals(arranged.notes, widgets.notes)
    const positions = Object.values(arranged).map((item) => rectToGrid(item!, viewport))
    for (let a = 0; a < positions.length; a++) {
        for (let b = a + 1; b < positions.length; b++) assert(!overlaps(positions[a], positions[b]))
    }
    assertEquals(widgets.time.width, grid.columnStep * 6 - grid.gap)
})

Deno.test('A full-screen tile moves its neighbor below the initial grid without changing its size', () => {
    const full = gridToRect({ column: 0, row: 0, columns: 24, rows: 16 }, viewport, natural)
    const widgets = { time: full, notes: rect }
    const before = structuredClone(widgets)
    const arranged = arrangeWidgets(widgets, viewport, ['time', 'notes'], 'time')
    assertEquals(arranged.time, full)
    const notes = rectToGrid(arranged.notes!, viewport)
    assert(notes.row >= 16)
    assertEquals(notes.columns, position.columns)
    assertEquals(notes.rows, position.rows)
    assertEquals(widgets, before)
})

Deno.test('Resizing cascades nearby tiles instead of jumping a neighbor across the page', () => {
    const widgets = {
        time: gridToRect({ column: 0, row: 0, columns: 24, rows: 6 }, viewport, natural),
        main: gridToRect({ column: 0, row: 4, columns: 24, rows: 4 }, viewport, natural),
        notes: gridToRect({ column: 0, row: 8, columns: 24, rows: 4 }, viewport, natural),
    }
    const arranged = arrangeWidgets(widgets, viewport, ['time', 'main', 'notes'], 'time')
    assertEquals(rectToGrid(arranged.main!, viewport).row, 6)
    assertEquals(rectToGrid(arranged.notes!, viewport).row, 10)
    assertEquals(arranged.time, widgets.time)
    assertEquals(rectToGrid(widgets.notes, viewport).row, 8)
})

Deno.test('Viewport changes retain cell positions and spans without cumulative drift', () => {
    const narrow = { width: 600, height: 400 }
    assertEquals(rectToGrid(projectRect(rect, viewport, narrow), narrow), position)
    assertEquals(projectRect(projectRect(rect, viewport, narrow), narrow, viewport), rect)
    const tiny = projectRect(rect, viewport, { width: 100, height: 60 })
    assert(tiny.x >= 0 && tiny.x + tiny.width <= 100)
    assert(tiny.y >= 0 && tiny.y + tiny.height <= 60)
})

Deno.test('Layout validation discards invalid modules and obsolete fields without moving valid tiles', () => {
    assertEquals(validateLayout({ viewport: { width: 0, height: 800 }, widgets: {} }), undefined)
    const layout = validateLayout({
        enabled: true,
        snap: false,
        viewport,
        showGrid: true,
        widgets: {
            time: { ...rect, fontSize: 16, naturalWidth: 300, naturalHeight: 200 },
            main: rect,
            notes: { ...rect, x: NaN },
            quotes: { ...rect, width: -1 },
        },
    })!
    assertEquals(layout.mode, 'grid')
    assert(!('snap' in layout) && !('showGrid' in layout))
    assert(!('naturalWidth' in layout.widgets.time!))
    assert(!('fontSize' in layout.widgets.time!))
    assertEquals(Object.keys(layout.widgets), ['time', 'main'])
    assertEquals(layout.widgets.time, layout.widgets.main)
    assertEquals(validateLayout(JSON.parse(JSON.stringify(layout))), layout)
})

Deno.test('Stored hidden modules cannot displace a visible module during validation', () => {
    const widgets = {
        time: gridToRect({ column: 0, row: 0, columns: 6, rows: 3 }, viewport, natural),
        main: gridToRect({ column: 0, row: 13, columns: 6, rows: 4 }, viewport, natural),
        notes: gridToRect({ column: 0, row: 6, columns: 24, rows: 10 }, viewport, natural),
    }
    const validated = validateLayout({ enabled: true, mode: 'grid', viewport, widgets })!
    assertEquals(validated.widgets, widgets)
    const visible = arrangeRows(validated.widgets, viewport, ['time', 'main'])
    assertEquals(visible.main, widgets.main)
})

const linksRect = gridToRect({ column: 0, row: 5, columns: 12, rows: 3 }, viewport, natural)

Deno.test('Wrapped links grow and shrink back to the manually chosen minimum height', () => {
    const grown = fitLinksRect(linksRect, 900, viewport)
    assert(grown.height >= 900)
    assertEquals(grown.width, linksRect.width)
    assertEquals(grown.minRows, 3)
    assertEquals(fitLinksRect(grown, 40, viewport), { ...linksRect, minRows: 3 })
    const restored = validateLayout({ enabled: true, mode: 'grid', viewport, widgets: { quicklinks: grown } })!
    assertEquals(restored.widgets.quicklinks, grown)
    assertEquals(
        rectToGrid(projectRect(grown, viewport, { width: 600, height: 400 }), { width: 600, height: 400 }),
        rectToGrid(grown, viewport),
    )
})

Deno.test('Content height accounts for pinned groups and the wrapping group bar, excluding allocated blank space', () => {
    const links = document.createElement('div')
    document.body.append(links)
    links.innerHTML = '<div class="link-group"></div><div id="link-mini"></div><div hidden></div>'
    links.style.paddingBottom = '8px'
    Object.defineProperty(links, 'scrollHeight', { value: 900 })
    const children = Array.from(links.children) as HTMLElement[]
    Object.defineProperties(children[0], { offsetTop: { value: 0 }, offsetHeight: { value: 180 } })
    children[0].style.marginBottom = '20px'
    Object.defineProperties(children[1], { offsetTop: { value: 200 }, offsetHeight: { value: 68 } })
    Object.defineProperties(children[2], { offsetTop: { value: 268 }, offsetHeight: { value: 999 } })
    assertEquals(linksContentHeight(links), 276)
    links.remove()
})

Deno.test('Vertically aligned links exclude leading free space when fitting their tile', () => {
    const links = document.createElement('div')
    links.innerHTML = '<div></div><div></div>'
    document.body.append(links)
    const children = Array.from(links.children) as HTMLElement[]
    let offset = 100
    Object.defineProperties(children[0], { offsetTop: { get: () => offset }, offsetHeight: { value: 80 } })
    Object.defineProperties(children[1], { offsetTop: { get: () => offset + 80 }, offsetHeight: { value: 20 } })
    assertEquals(linksContentHeight(links), 100)
    offset = 200
    assertEquals(linksContentHeight(links), 100)
    links.remove()
})

Deno.test('Interrupted reflow starts at the current visual position and honors reduced motion', () => {
    const element = document.createElement('div')
    let x = 0
    let cancelled = 0
    const transitions: Keyframe[][] = []
    element.getBoundingClientRect = () => new DOMRect(x, 0, 200, 100)
    Object.defineProperty(element, 'animate', {
        value: (frames: Keyframe[]): Animation => {
            transitions.push(frames)
            return {
                cancel: () => {
                    cancelled++
                },
                finished: Promise.resolve(),
            } as unknown as Animation
        },
    })
    const first = measureTiles([element])
    x = 80
    animateTiles(first)
    assertEquals(transitions[0][0].transform, 'translate(-80px, 0px) scale(1, 1)')
    x = 20 // The first transition is still in flight when the next target changes.
    const second = measureTiles([element])
    x = 120
    animateTiles(second)
    assertEquals(cancelled, 1)
    assertEquals(transitions[1][0].transform, 'translate(-100px, 0px) scale(1, 1)')

    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'matchMedia')!
    try {
        Object.defineProperty(globalThis, 'matchMedia', { configurable: true, value: () => ({ matches: true }) })
        const third = measureTiles([element])
        x = 200
        animateTiles(third)
        assertEquals(transitions.length, 2)
        assertEquals(cancelled, 2)
    } finally {
        Object.defineProperty(globalThis, 'matchMedia', descriptor)
    }
})

Deno.test('Layout save errors are translated and every locale has the English source key set', () => {
    const key = 'Could not save. Your previous layout is unchanged.'
    const source = JSON.parse(Deno.readTextFileSync('_locales/en/translations.json'))
    assertEquals(source[key], key)
    for (const locale of Deno.readDirSync('_locales')) {
        if (!locale.isDirectory) continue
        const translations = JSON.parse(Deno.readTextFileSync(`_locales/${locale.name}/translations.json`))
        assertEquals(Object.keys(translations).sort(), Object.keys(source).sort(), locale.name)
        assert(typeof translations[key] === 'string' && translations[key].trim(), `${locale.name}: ${key}`)
    }
})
