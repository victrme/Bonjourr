import { storage } from '../../storage.ts'
import { tradThis } from '../../utils/translations.ts'
import { debounce } from '../../utils/debounce.ts'
import { togglePomodoroFocus } from '../pomodoro.ts'
import { elements, getGridWidgets, removeGridWidget } from '../move/helpers.ts'
import {
    arrangeRows,
    arrangeWidgets,
    changeRect,
    clampRect,
    continuousRect,
    FREE_WIDGETS,
    GRID_ROWS,
    gridMetrics,
    gridToRect,
    initialRect,
    projectRect,
    rectToGrid,
    validateLayout,
} from './geometry.ts'
import { animateTiles, keepToolbarVisible, measureTiles, moveToolbar, stopTileMotion } from './motion.ts'
import { contentSizer, fitLinksRect, linksContentHeight } from './content.ts'
import { applyContentAlignment, contentAlignment, createAlignmentControls, showAlignmentControls } from './alignment.ts'
import type { GridPosition, Handle, Viewport } from './geometry.ts'
import type { FreeLayout, FreeLayoutRect } from '../../../types/sync.ts'
import type { Widgets } from '../../../types/shared.ts'

const LABELS: Record<Widgets, string> = {
    time: 'Clock and date',
    main: 'Weather & Greetings',
    quicklinks: 'Quick Links',
    searchbar: 'Search bar',
    notes: 'Notes',
    quotes: 'Quotes',
    pomodoro: 'Pomodoro',
}
const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
const container = document.getElementById('interface')
let saved: FreeLayout | undefined
let draft: FreeLayout | undefined
let saving = false
let selected: Widgets | undefined
let active: {
    id: Widgets
    handle: Handle
    pointer: number
    x: number
    y: number
    origin: FreeLayoutRect
    raw: FreeLayoutRect
    visible: Widgets[]
    sizer?: ReturnType<typeof contentSizer>
    before: FreeLayout['widgets']
} | undefined
let pendingPointer: { x: number; y: number } | undefined
let pointerFrame = 0
let contentFrame = 0
let toolbar: HTMLElement
let status: HTMLElement
let saveButton: HTMLButtonElement
const overlays = new Map<Widgets, HTMLElement>()
const nativePositions: Partial<Record<Widgets, GridPosition>> = {}
let nativeVisible: Widgets[] = []
let nativeInitialized = false
let initialized = false
const persistWidth = debounce(() => {
    if (saved) void persistAutomaticLayout(saved)
}, 400)

type FreeLayoutEvent = {
    edit?: true
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
    if (event.edit) beginEdit()
    if (event.width) {
        const layout = draft ?? saved
        const { widget: id, em } = event.width
        const rect = layout?.widgets[id]
        const element = elements[id]
        if (!layout?.enabled || !rect || !element || !Number.isFinite(em) || em <= 0) return
        rebase(layout)
        const width = em * Number.parseFloat(getComputedStyle(element).fontSize)
        const candidate = { ...layout.widgets, [id]: clampRect({ ...layout.widgets[id]!, width }, viewport()) }
        layout.widgets = arrangeWidgets(candidate, viewport(), visibleWidgets(), id)
        render(true)
        if (!draft) persistWidth()
    }
}

function initFreeLayout(value?: FreeLayout): void {
    saved = validateLayout(value)
    createControls()
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
        if (active) endGesture(true)
        if (draft && isNarrow()) cancelEdit()
        if (saved?.enabled && !isNarrow()) syncWidgets(saved)
        render()
    })
    document.addEventListener('pointermove', pointerMove)
    document.addEventListener('pointerup', (event) => {
        if (active?.pointer === event.pointerId) endGesture(false)
    })
    document.addEventListener('pointercancel', (event) => {
        if (active?.pointer === event.pointerId) endGesture(true)
    })
    globalThis.addEventListener('blur', () => endGesture(true))
    document.addEventListener('keydown', editorKey, true)
    document.addEventListener('keyup', (event) => {
        if (event.key === 'Escape' && toolbar.dataset.escaped) {
            event.stopImmediatePropagation()
            delete toolbar.dataset.escaped
        }
    }, true)

    // Module switches and asynchronous weather/clock/link initialization stay compatible.
    const observer = new MutationObserver(() => {
        const layout = draft ?? saved
        if (!layout?.enabled || isNarrow() || !syncWidgets(layout)) return
        render(true)
        if (layout === saved) {
            // Module switches already save their settings; persist the corresponding layout as well.
            void persistAutomaticLayout(layout)
        }
    })
    for (const id of FREE_WIDGETS) {
        const element = elements[id]
        if (element) observer.observe(element, { attributes: true, attributeFilter: ['class'] })
    }

    const resizer = new ResizeObserver(scheduleContentFit)
    const observeFlow = (): void => {
        resizer.disconnect()
        for (const id of FREE_WIDGETS) {
            const element = elements[id]
            if (!element) continue
            resizer.observe(element)
            for (const child of element.children) resizer.observe(child)
        }
        scheduleContentFit()
    }
    const links = elements['quicklinks']
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

function visible(element: HTMLElement): boolean {
    return !element.classList.contains('hidden') && getComputedStyle(element).display !== 'none'
}

function button(label: string, action?: () => void): HTMLButtonElement {
    const element = document.createElement('button')
    element.type = 'button'
    element.textContent = tradThis(label)
    element.classList.add('trn')
    if (action) element.addEventListener('click', action)
    return element
}

function createControls(): void {
    toolbar = document.createElement('section')
    toolbar.id = 'free-layout-toolbar'
    toolbar.hidden = true
    toolbar.setAttribute('aria-label', tradThis('Page layout'))
    const title = document.createElement('strong')
    title.className = 'trn'
    title.textContent = tradThis('Page layout')
    const cancel = button('Cancel', cancelEdit)
    saveButton = button('Apply changes', () => void save())
    saveButton.classList.add('free-layout-primary')
    status = document.createElement('span')
    status.id = 'free-layout-status'
    status.setAttribute('role', 'status')
    const alignment = createAlignmentControls((value) => {
        const rect = selected && draft?.widgets[selected]
        if (!rect || !selected || saving) return
        rect.textAlign = value
        status.textContent = ''
        render()
    })
    toolbar.append(title, cancel, saveButton, status, alignment)
    document.body.append(toolbar)
    moveToolbar(toolbar)
}

function beginEdit(): void {
    if (draft || saving) return
    selected = undefined
    if (document.body.classList.contains('pomodoro-focus')) togglePomodoroFocus(false)
    if (document.getElementById('show-settings')?.classList.contains('shown')) {
        document.dispatchEvent(new CustomEvent('toggle-settings'))
    }
    draft = saved
        ? { ...structuredClone(saved), enabled: true }
        : { enabled: true, mode: 'grid', viewport: viewport(), widgets: {} }
    // Rebase the draft to the actual window, preserving the stored layout on Cancel.
    rebase(draft)
    syncWidgets(draft)
    toolbar.setAttribute('aria-label', tradThis('Page layout'))
    for (const [id, overlay] of overlays) setOverlayLabels(overlay, id)
    status.textContent = ''
    render()
    saveButton.focus()
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
    if (active) endGesture(true)
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
            layout.widgets[id] = gridToRect(
                { ...current, column: position.column, row: position.row },
                layout.viewport,
                rect,
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
    const measured: FreeLayout['widgets'] = {}
    try {
        for (const id of ids) applyContentAlignment(id)
        container.style.setProperty('transition', 'none')
        container.classList.remove('free-layout')
        if (excluded.length) {
            let previous = grid
            for (const id of excluded) {
                previous = removeGridWidget(previous, id, 'single')
                elements[id]!.classList.add('hidden')
            }
            root.style.setProperty('--grid', previous)
        }
        const bounds = container.getBoundingClientRect()
        for (const id of ids) {
            const element = elements[id]!
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
            for (const id of excluded) elements[id]!.classList.remove('hidden')
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
        const element = elements[id]
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
            next = fitLinksRect(rect, linksContentHeight(elements[id]!), viewport())
        } else {
            const sizer = contentSizer(elements[id]!, viewport())
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
        const layout = draft ?? saved
        if (!layout?.enabled || isNarrow() || active) return
        rebase(layout)
        const candidate = fitContent(layout.widgets)
        if (candidate === layout.widgets) return
        layout.widgets = arrangeWidgets(candidate, viewport(), visibleWidgets())
        render(true)
    })
}

function render(animate = false): void {
    if (!container) return
    const tiles = Array.from(
        container.querySelectorAll<HTMLElement>(':scope > [data-free-layout], :scope > .free-layout-overlay'),
    )
        .filter((element) => !active || (element !== elements[active.id] && element !== overlays.get(active.id)))
    const previous = animate ? measureTiles(tiles) : new Map<HTMLElement, DOMRect>()
    const layout = draft ?? saved
    const enabled = layout?.enabled === true && !isNarrow()
    container.classList.toggle('free-layout', enabled)
    document.body.classList.toggle('free-layout-editing', !!draft)
    toolbar.hidden = !draft
    if (!draft || !selected || !visibleWidgets().includes(selected)) selected = undefined
    showAlignmentControls(
        selected ? tradThis(LABELS[selected]) : undefined,
        selected ? contentAlignment(selected, draft?.widgets[selected]?.textAlign) : undefined,
    )
    keepToolbarVisible(toolbar)
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
    for (const overlay of overlays.values()) overlay.hidden = true

    for (const id of FREE_WIDGETS) {
        const element = elements[id]
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
        setFloating(element, active?.id === id ? active.raw : undefined)
        if (draft && visible(element)) {
            const overlay = overlays.get(id) ?? createOverlay(id)
            overlay.hidden = false
            overlay.classList.toggle('selected', selected === id)
            setRect(overlay, projected)
            setFloating(overlay, active?.id === id ? active.raw : undefined)
        }
    }
    if (animate) animateTiles(previous)
    scheduleContentFit()
}

function setFloating(element: HTMLElement, rect?: FreeLayoutRect): void {
    if (!rect) {
        delete element.dataset.floating
        return
    }
    element.dataset.floating = 'true'
    for (const key of ['x', 'y', 'width', 'height'] as const) {
        element.style.setProperty(`--floating-${key}`, `${rect[key]}px`)
    }
}

function setRect(element: HTMLElement, rect: FreeLayoutRect): void {
    const cells = rectToGrid(rect, viewport())
    element.style.setProperty('--tile-column', String(cells.column + 1))
    element.style.setProperty('--tile-row', String(cells.row + 1))
    element.style.setProperty('--tile-columns', String(cells.columns))
    element.style.setProperty('--tile-rows', String(cells.rows))
}

function createOverlay(id: Widgets): HTMLElement {
    const overlay = document.createElement('div')
    overlay.className = 'move-overlay free-layout-overlay'
    overlay.dataset.widget = id
    const drag = button('')
    drag.dataset.handle = 'move'
    drag.className = 'free-layout-drag'
    drag.setAttribute('aria-keyshortcuts', 'ArrowUp ArrowDown ArrowLeft ArrowRight')
    overlay.append(drag)
    for (const handle of HANDLES) {
        const resize = button('')
        resize.dataset.handle = handle
        resize.className = `free-layout-resize free-layout-${handle}`
        resize.setAttribute('aria-keyshortcuts', 'ArrowUp ArrowDown ArrowLeft ArrowRight')
        overlay.append(resize)
    }
    setOverlayLabels(overlay, id)
    overlay.addEventListener('pointerdown', (event) => pointerDown(event, id))
    overlay.addEventListener('lostpointercapture', () => endGesture(true))
    overlay.addEventListener('keydown', (event) => handleKey(event, id))
    overlay.addEventListener('focusin', () => {
        if (draft && selected !== id) {
            selected = id
            render()
        }
    })
    container?.append(overlay)
    overlays.set(id, overlay)
    return overlay
}

function setOverlayLabels(overlay: HTMLElement, id: Widgets): void {
    const label = tradThis(LABELS[id])
    overlay.setAttribute('aria-label', label)
    for (const handle of overlay.querySelectorAll<HTMLElement>('[data-handle]')) {
        const move = handle.dataset.handle === 'move'
        handle.title = tradThis(move ? 'Move' : 'Size')
        handle.setAttribute('aria-label', move ? label : `${tradThis('Size')} ${label} ${handle.dataset.handle}`)
    }
}

function pointerDown(event: PointerEvent, id: Widgets): void {
    const handle = (event.target as HTMLElement).closest<HTMLElement>('[data-handle]')?.dataset.handle as Handle
    if (!draft || saving || !handle || event.button !== 0 || active) return
    selected = id
    rebase(draft)
    const rect = draft.widgets[id]
    if (!rect) return
    event.preventDefault()
    event.stopPropagation()
    const bounds = elements[id]?.getBoundingClientRect()
    const parent = container?.getBoundingClientRect()
    const origin = bounds?.width && parent
        ? {
            ...rect,
            x: bounds.x - parent.x,
            y: bounds.y - parent.y,
            width: bounds.width,
            height: bounds.height,
        }
        : { ...rect }
    stopTileMotion(elements[id])
    stopTileMotion(overlays.get(id))
    active = {
        id,
        handle,
        pointer: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        origin,
        raw: origin,
        visible: visibleWidgets(),
        before: structuredClone(draft.widgets),
        sizer: handle === 'move' ? undefined : contentSizer(elements[id]!, viewport()),
    }
    overlays.get(id)?.setPointerCapture(event.pointerId)
    overlays.get(id)?.classList.add('active')
    render()
}

function pointerMove(event: PointerEvent): void {
    if (!draft || !active || event.pointerId !== active.pointer) return
    event.preventDefault()
    pendingPointer = { x: event.clientX, y: event.clientY }
    if (!pointerFrame) pointerFrame = requestAnimationFrame(() => flushPointer())
}

function flushPointer(paint = true): void {
    if (pointerFrame) cancelAnimationFrame(pointerFrame)
    pointerFrame = 0
    if (!draft || !active || !pendingPointer) return
    const point = pendingPointer
    pendingPointer = undefined
    const dx = point.x - active.x
    const dy = point.y - active.y
    const requested = changeRect(active.before[active.id]!, active.handle, dx, dy, viewport())
    let resized = requested
    let raw = continuousRect(active.origin, active.handle, dx, dy, viewport())
    if (active.sizer) {
        resized = changeRect(
            active.before[active.id]!,
            active.handle,
            dx,
            dy,
            viewport(),
            active.sizer.measure(requested.width),
        )
        raw = continuousRect(active.origin, active.handle, dx, dy, viewport(), active.sizer.measure(raw.width))
    }
    if (active.id === 'quicklinks' && /[ns]/.test(active.handle)) {
        resized.minRows = rectToGrid(requested, viewport()).rows
    }
    const candidate = { ...active.before, [active.id]: resized }
    const current = draft.widgets[active.id]
    active.raw = raw
    if (
        current &&
        ['x', 'y', 'width', 'height', 'minRows'].every((key) =>
            current[key as keyof FreeLayoutRect] === resized[key as keyof FreeLayoutRect]
        )
    ) {
        if (paint) {
            const element = elements[active.id]
            const overlay = overlays.get(active.id)
            if (element) setFloating(element, active.raw)
            if (overlay) setFloating(overlay, active.raw)
        }
        return
    }
    draft.widgets = arrangeWidgets(candidate, viewport(), active.visible, active.id)
    status.textContent = ''
    if (paint) render(true)
}

function endGesture(cancel: boolean): void {
    if (!active) return
    if (!cancel) flushPointer(false)
    if (pointerFrame) cancelAnimationFrame(pointerFrame)
    pointerFrame = 0
    pendingPointer = undefined
    const gesture = active
    active = undefined
    gesture.sizer?.remove()
    if (cancel && draft) draft.widgets = gesture.before
    const overlay = overlays.get(gesture.id)
    overlay?.classList.remove('active')
    if (overlay?.hasPointerCapture(gesture.pointer)) overlay.releasePointerCapture(gesture.pointer)
    render(true)
}

function handleKey(event: KeyboardEvent, id: Widgets): void {
    if (!draft || saving || !event.key.startsWith('Arrow')) return
    const handle = (event.target as HTMLElement).dataset.handle as Handle
    if (!handle) return
    selected = id
    event.preventDefault()
    event.stopPropagation()
    rebase(draft)
    const rect = draft.widgets[id]
    if (!rect) return
    const step = event.shiftKey ? 2 : 1
    const grid = gridMetrics(viewport())
    const dx = event.key === 'ArrowLeft'
        ? -step * grid.columnStep
        : event.key === 'ArrowRight'
        ? step * grid.columnStep
        : 0
    const dy = event.key === 'ArrowUp' ? -step * grid.rowStep : event.key === 'ArrowDown' ? step * grid.rowStep : 0
    const requested = changeRect(rect, handle, dx, dy, viewport())
    let resized = requested
    if (handle !== 'move') {
        const sizer = contentSizer(elements[id]!, viewport())
        try {
            resized = changeRect(rect, handle, dx, dy, viewport(), sizer.measure(requested.width))
        } finally {
            sizer.remove()
        }
    }
    if (id === 'quicklinks' && /[ns]/.test(handle)) resized.minRows = rectToGrid(requested, viewport()).rows
    const candidate = { ...draft.widgets, [id]: resized }
    draft.widgets = arrangeWidgets(candidate, viewport(), visibleWidgets(), id)
    render(true)
}

function editorKey(event: KeyboardEvent): void {
    if (!draft || event.key !== 'Escape') return
    event.preventDefault()
    event.stopImmediatePropagation()
    toolbar.dataset.escaped = 'true'
    if (active) endGesture(true)
    else cancelEdit()
}

function cancelEdit(): void {
    if (saving) return
    endGesture(true)
    draft = undefined
    render()
    document.getElementById('b_editmove')?.focus()
}

async function save(): Promise<void> {
    if (!draft || saving) return
    endGesture(false)
    rebase(draft)
    const next = structuredClone(draft)
    saving = true
    saveButton.disabled = true
    try {
        await storage.sync.set({ freeLayout: next })
        saved = next
        draft = undefined
        status.textContent = ''
        render()
        document.getElementById('b_editmove')?.focus()
    } catch (error) {
        console.error('Could not save free layout', error)
        status.textContent = tradThis('Could not save. Your previous layout is unchanged.')
    } finally {
        saving = false
        saveButton.disabled = false
    }
}
