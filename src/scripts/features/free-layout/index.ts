import { storage } from '../../storage.ts'
import { debounce } from '../../utils/debounce.ts'
import { elements, getGridWidgets, removeGridWidget } from '../move/helpers.ts'
import {
    arrangeRows,
    arrangeWidgets,
    changeRect,
    clampRect,
    FREE_WIDGETS,
    GRID_ROWS,
    gridMetrics,
    gridToRect,
    initialRect,
    projectRect,
    rectToGrid,
    validateLayout,
} from './geometry.ts'
import { animateTiles, measureTiles } from './motion.ts'
import { contentSizer, fitLinksRect, linksContentHeight } from './content.ts'
import { applyContentAlignment } from './alignment.ts'
import type { GridPosition, Viewport } from './geometry.ts'
import type { FreeLayout, FreeLayoutRect } from '../../../types/sync.ts'
import type { Widgets } from '../../../types/shared.ts'

const container = document.getElementById('interface')
let saved: FreeLayout | undefined
let contentFrame = 0
const nativePositions: Partial<Record<Widgets, GridPosition>> = {}
let nativeVisible: Widgets[] = []
let nativeInitialized = false
let initialized = false
const persistWidth = debounce(() => {
    if (saved) void persistAutomaticLayout(saved)
}, 400)

type FreeLayoutEvent = {
    width?: { widget: 'notes' | 'searchbar'; em: number }
}

export function freeLayout(init?: FreeLayout, event?: FreeLayoutEvent): void {
    if (!container) return
    if (event) {
        updateFreeLayout(event)
        return
    }
    if (initialized) return
    initialized = true
    initFreeLayout(init)
}

function updateFreeLayout(event: FreeLayoutEvent): void {
    if (!initialized) freeLayout()
    if (isNarrow()) return
    if (event.width) {
        const layout = saved
        const { widget: id, em } = event.width
        const rect = layout?.widgets[id]
        const element = widget(id)
        if (!layout?.enabled || !rect || !element || !Number.isFinite(em) || em <= 0) return
        rebase(layout)
        const width = em * Number.parseFloat(getComputedStyle(element).fontSize)
        const candidate = { ...layout.widgets, [id]: clampRect({ ...layout.widgets[id]!, width }, viewport()) }
        layout.widgets = arrangeWidgets(candidate, viewport(), visibleWidgets(), id)
        render(true)
        persistWidth()
    }
}

function initFreeLayout(value?: FreeLayout): void {
    saved = validateLayout(value)
    if (saved?.enabled && !isNarrow()) syncWidgets(saved)
    render()
    // Fit natural content before the first frame; later resize notifications keep dynamic content visible.
    if (saved?.enabled && !isNarrow()) {
        const fitted = fitContent(saved.widgets)
        if (fitted !== saved.widgets) {
            saved.widgets = arrangeWidgets(fitted, viewport(), visibleWidgets(), 'quicklinks')
            render()
        }
    }

    globalThis.addEventListener('resize', () => {
        if (saved?.enabled && !isNarrow()) syncWidgets(saved)
        render()
    })
    // Module switches and asynchronous weather/clock/link initialization stay compatible.
    const observer = new MutationObserver(() => {
        const layout = saved
        if (!layout?.enabled || isNarrow() || !syncWidgets(layout)) return
        render(true)
        if (layout === saved) {
            // Module switches already save their settings; persist the corresponding layout as well.
            void persistAutomaticLayout(layout)
        }
    })
    for (const id of FREE_WIDGETS) {
        const element = widget(id)
        if (element) observer.observe(element, { attributes: true, attributeFilter: ['class'] })
    }

    const resizer = new ResizeObserver(scheduleContentFit)
    const observeFlow = (): void => {
        resizer.disconnect()
        for (const id of FREE_WIDGETS) {
            const element = widget(id)
            if (!element) continue
            resizer.observe(element)
            for (const child of element.children) resizer.observe(child)
        }
        scheduleContentFit()
    }
    const links = widget('quicklinks')
    if (links) new MutationObserver(observeFlow).observe(links, { childList: true, subtree: true, characterData: true })
    observeFlow()
}

function viewport(): Viewport {
    return { width: document.documentElement.clientWidth || globalThis.innerWidth, height: globalThis.innerHeight }
}

function isNarrow(): boolean {
    // Match the upstream mobile breakpoint without overwriting the saved desktop layout.
    return viewport().width <= 600
}

function widget(id: Widgets): HTMLElement | null {
    return elements[id]
}

function visible(element: HTMLElement): boolean {
    return !element.classList.contains('hidden') && getComputedStyle(element).display !== 'none'
}

function rebase(layout: FreeLayout): void {
    const current = viewport()
    for (const id of FREE_WIDGETS) {
        const rect = layout.widgets[id]
        if (rect) layout.widgets[id] = projectRect(rect, layout.viewport, current)
    }
    layout.viewport = current
}

function syncWidgets(layout: FreeLayout): boolean {
    const ids = visibleWidgets()
    const changed = ids.length !== nativeVisible.length || ids.some((id, index) => id !== nativeVisible[index])
    if (!container || (!changed && ids.every((id) => layout.widgets[id]))) return false
    rebase(layout)
    const missing = ids.filter((id) => !layout.widgets[id])
    const existing = ids.filter((id) => layout.widgets[id])
    if (
        !nativeInitialized && missing.length && existing.length &&
        document.documentElement.style.getPropertyValue('--grid')
    ) {
        // Older saved layouts may predate enabled modules. Recover the native positions before those insertions.
        const before = measureNativeWidgets(layout, existing, missing)
        for (const id of existing) nativePositions[id] = rectToGrid(before[id]!, layout.viewport)
    }
    const measured = measureNativeWidgets(layout, ids)
    for (const id of ids) {
        const next = measured[id]!
        const rect = layout.widgets[id]
        const previous = nativePositions[id]
        const position = rectToGrid(next, layout.viewport)
        if (!rect) {
            layout.widgets[id] = next
        } else if (nativeInitialized && !nativeVisible.includes(id)) {
            // Re-enabling follows upstream insertion rather than reviving an obsolete hidden position.
            const current = rectToGrid(rect, layout.viewport)
            layout.widgets[id] = clampRect(
                gridToRect({ ...current, column: position.column, row: position.row }, layout.viewport, rect),
                layout.viewport,
            )
        } else if (previous) {
            const current = rectToGrid(rect, layout.viewport)
            // Follow upstream insert/remove reflow, retaining manual offsets and sizes.
            layout.widgets[id] = clampRect(
                gridToRect(
                    {
                        ...current,
                        column: current.column + position.column - previous.column,
                        row: current.row + position.row - previous.row,
                    },
                    layout.viewport,
                    rect,
                ),
                layout.viewport,
            )
        }
    }
    const requested = layout.widgets
    layout.widgets = arrangeRows(requested, layout.viewport, nativeOrder(ids))
    for (const id of ids) {
        const baseline = rectToGrid(measured[id]!, layout.viewport)
        const wanted = rectToGrid(requested[id]!, layout.viewport)
        const actual = rectToGrid(layout.widgets[id]!, layout.viewport)
        // Collision displacement is automatic, so subsequent switches must not accumulate it as a manual offset.
        nativePositions[id] = {
            ...baseline,
            column: baseline.column + actual.column - wanted.column,
            row: baseline.row + actual.row - wanted.row,
        }
    }
    nativeVisible = ids
    nativeInitialized = true
    return true
}

function nativeOrder(ids: Widgets[]): Widgets[] {
    const ordered = getGridWidgets(document.documentElement.style.getPropertyValue('--grid')).filter((id) =>
        ids.includes(id)
    )
    return [...ordered, ...ids.filter((id) => !ordered.includes(id))]
}

async function persistAutomaticLayout(layout: FreeLayout): Promise<void> {
    try {
        await storage.sync.set({ freeLayout: structuredClone(layout) })
    } catch (error) {
        console.error('Could not save layout after a settings change', error)
    }
}

/** Read upstream named areas in one synchronous pass; implicit cells in the custom grid are not widget positions. */
function measureNativeWidgets(layout: FreeLayout, ids: Widgets[], excluded: Widgets[] = []): FreeLayout['widgets'] {
    if (!container) return {}
    const enabled = container.classList.contains('free-layout')
    const transition = container.style.getPropertyValue('transition')
    const priority = container.style.getPropertyPriority('transition')
    const root = document.documentElement
    const grid = root.style.getPropertyValue('--grid')
    const gridPriority = root.style.getPropertyPriority('--grid')
    const hidden = excluded.map((id) => widget(id)!.classList.contains('hidden'))
    const measured: FreeLayout['widgets'] = {}
    try {
        for (const id of ids) applyContentAlignment(id)
        container.style.setProperty('transition', 'none')
        container.classList.remove('free-layout')
        if (excluded.length) {
            let previous = grid
            for (const id of excluded) {
                previous = removeGridWidget(previous, id, 'single')
                widget(id)!.classList.add('hidden')
            }
            root.style.setProperty('--grid', previous)
        }
        const bounds = container.getBoundingClientRect()
        for (const id of ids) {
            const element = widget(id)!
            const rect = element.getBoundingClientRect()
            measured[id] = initialRect({
                // Exclude the settings translation and scrolling, retaining the centred page margin.
                x: rect.x - bounds.x + container.offsetLeft,
                y: rect.y - bounds.y + container.offsetTop,
                width: rect.width,
                height: rect.height,
            }, viewport())
            const stored = layout.widgets[id]
            if (stored) {
                const target = rectToGrid(measured[id], layout.viewport)
                const { columns, rows } = rectToGrid(stored, layout.viewport)
                measured[id] = clampRect(
                    gridToRect({ ...target, columns, rows }, layout.viewport, stored),
                    layout.viewport,
                )
            }
        }
    } finally {
        if (excluded.length) {
            if (grid) root.style.setProperty('--grid', grid, gridPriority)
            else root.style.removeProperty('--grid')
            excluded.forEach((id, index) => widget(id)!.classList.toggle('hidden', hidden[index]))
        }
        container.classList.toggle('free-layout', enabled)
        if (enabled) {
            for (const id of ids) applyContentAlignment(id, layout.widgets[id]?.textAlign)
        }
        if (transition) container.style.setProperty('transition', transition, priority)
        else container.style.removeProperty('transition')
    }
    return arrangeRows(measured, layout.viewport, nativeOrder(ids))
}

function visibleWidgets(): Widgets[] {
    return FREE_WIDGETS.filter((id) => {
        const element = widget(id)
        return element && visible(element)
    })
}

function fitContent(widgets: FreeLayout['widgets']): FreeLayout['widgets'] {
    let fitted = widgets
    for (const id of visibleWidgets()) {
        const rect = widgets[id]
        if (!rect) continue
        let next: FreeLayoutRect
        if (id === 'quicklinks') {
            next = fitLinksRect(rect, linksContentHeight(widget(id)!), viewport())
        } else {
            const sizer = contentSizer(widget(id)!, viewport())
            try {
                next = changeRect(rect, 'se', 0, 0, viewport(), sizer.measure(rect.width))
            } finally {
                sizer.remove()
            }
        }
        if (
            ['x', 'y', 'width', 'height', 'minRows'].every((key) =>
                next[key as keyof FreeLayoutRect] === rect[key as keyof FreeLayoutRect]
            )
        ) continue
        fitted = { ...fitted, [id]: next }
    }
    return fitted
}

function scheduleContentFit(): void {
    if (contentFrame) return
    contentFrame = requestAnimationFrame(() => {
        contentFrame = 0
        const layout = saved
        if (!layout?.enabled || isNarrow()) return
        rebase(layout)
        const candidate = fitContent(layout.widgets)
        if (candidate === layout.widgets) return
        layout.widgets = arrangeWidgets(candidate, viewport(), visibleWidgets())
        render(true)
    })
}

function render(animate = false): void {
    if (!container) return
    const elements = Array.from(
        container.querySelectorAll<HTMLElement>(':scope > [data-free-layout]'),
    )
    const previous = animate ? measureTiles(elements) : new Map<HTMLElement, DOMRect>()
    const layout = saved
    const enabled = layout?.enabled === true && !isNarrow()
    container.classList.toggle('free-layout', enabled)
    const grid = gridMetrics(viewport())
    for (const key of ['left', 'top', 'bottom', 'gap'] as const) {
        container.style.setProperty(`--tile-grid-${key}`, `${grid[key]}px`)
    }
    const rows = Math.max(
        GRID_ROWS,
        ...visibleWidgets().map((id) => {
            const rect = layout?.widgets[id]
            if (!rect) return 0
            const position = rectToGrid(rect, layout.viewport)
            return position.row + position.rows
        }),
    )
    container.style.setProperty('--tile-grid-rows', String(rows))
    container.style.setProperty('--tile-grid-row-size', `${grid.rowStep - grid.gap}px`)
    container.style.setProperty(
        '--tile-grid-page-height',
        `${grid.top + grid.bottom + rows * grid.rowStep - grid.gap}px`,
    )

    for (const id of FREE_WIDGETS) {
        const element = widget(id)
        if (!element) continue
        const rect = layout?.widgets[id]
        applyContentAlignment(id, enabled ? rect?.textAlign : undefined)
        if (!enabled || !rect) {
            element.removeAttribute('data-free-layout')
            continue
        }
        element.dataset.freeLayout = ''
        const projected = projectRect(rect, layout.viewport, viewport())
        setRect(element, projected)
    }
    if (animate) animateTiles(previous)
    scheduleContentFit()
}

function setRect(element: HTMLElement, rect: FreeLayoutRect): void {
    const cells = rectToGrid(rect, viewport())
    element.style.setProperty('--tile-column', String(cells.column + 1))
    element.style.setProperty('--tile-row', String(cells.row + 1))
    element.style.setProperty('--tile-columns', String(cells.columns))
    element.style.setProperty('--tile-rows', String(cells.rows))
}
