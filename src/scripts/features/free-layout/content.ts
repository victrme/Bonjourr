import { gridMetrics, gridToRect, rectToGrid } from './geometry.ts'
import type { MinimumSize, Viewport } from './geometry.ts'
import type { FreeLayoutRect } from '../../../types/sync.ts'

/** Keep one off-screen copy during a gesture so wrapping can be measured without changing the live tile. */
export function contentSizer(element: HTMLElement, viewport: Viewport): {
    measure: (width: number) => MinimumSize
    remove: () => void
} {
    const grid = gridMetrics(viewport)
    const clone = element.cloneNode(true) as HTMLElement
    clone.removeAttribute('data-free-layout')
    clone.removeAttribute('data-floating')
    clone.setAttribute('aria-hidden', 'true')
    Object.assign(clone.style, {
        position: 'absolute',
        left: '-100000px',
        top: '0',
        bottom: 'auto',
        width: 'min-content',
        height: 'auto',
        minWidth: '0',
        minHeight: '0',
        maxWidth: 'none',
        maxHeight: 'none',
        visibility: 'hidden',
        pointerEvents: 'none',
        margin: '0',
        transform: 'none',
    })
    const notes = clone.querySelector<HTMLElement>('#pocket-editor')
    if (notes) {
        Object.assign(notes.style, {
            height: 'auto',
            minHeight: '0',
            maxHeight: 'none',
            overflow: 'visible',
            wordBreak: 'normal',
        })
    }
    const search = clone.querySelector<HTMLElement>('#searchbar-wrapper')
    if (search) search.style.height = 'auto'
    const input = clone.querySelector<HTMLElement>('#searchbar')
    if (input) input.style.height = '2.5em'
    element.parentElement!.append(clone)
    const intrinsic = Math.max(120, Math.ceil(clone.getBoundingClientRect().width), clone.scrollWidth)
    const width = Math.min(grid.width, Math.ceil((intrinsic + grid.gap) / grid.columnStep) * grid.columnStep - grid.gap)
    if (notes) notes.style.removeProperty('word-break')
    return {
        measure: (requested: number): MinimumSize => {
            clone.style.width = `${Math.max(width, Math.min(grid.width, requested))}px`
            return { width, height: Math.max(48, Math.ceil(clone.getBoundingClientRect().height), clone.scrollHeight) }
        },
        remove: () => clone.remove(),
    }
}

/** Measure the flow children, not scrollHeight, which includes the tile's allocated empty space. */
export function linksContentHeight(element: HTMLElement): number {
    let height = 0
    let top = Infinity
    for (const child of element.children) {
        if (!(child instanceof HTMLElement)) continue
        const style = getComputedStyle(child)
        if (style.display === 'none' || child.hidden) continue
        top = Math.min(top, child.offsetTop)
        height = Math.max(height, child.offsetTop + child.offsetHeight + (parseFloat(style.marginBottom) || 0))
    }
    const style = getComputedStyle(element)
    const offset = Number.isFinite(top) ? top : 0
    return height - offset + (parseFloat(style.paddingBottom) || 0) + (parseFloat(style.borderBottomWidth) || 0)
}

/** Keep the user's minimum height while allowing wrapped links to grow and shrink with their content. */
export function fitLinksRect(
    rect: FreeLayoutRect,
    height: number,
    viewport: Viewport,
): FreeLayoutRect {
    const grid = gridMetrics(viewport)
    const position = rectToGrid(rect, viewport)
    const minRows = rect.minRows ?? position.rows
    const rows = Math.max(minRows, Math.ceil((height + grid.gap) / grid.rowStep))
    return gridToRect({ ...position, rows }, viewport, { ...rect, minRows })
}
