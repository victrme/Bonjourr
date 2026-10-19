import type { FreeLayout, FreeLayoutRect, MoveAlign } from '../../../types/sync.ts'
import type { Widgets } from '../../../types/shared.ts'

export type Viewport = FreeLayout['viewport']
export type Handle = 'move' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'
export type MinimumSize = Pick<FreeLayoutRect, 'width' | 'height'>
export interface GridPosition {
    column: number
    row: number
    columns: number
    rows: number
}

export const FREE_WIDGETS = ['time', 'main', 'quicklinks', 'searchbar', 'notes', 'quotes', 'pomodoro'] as const
export const GRID_COLUMNS = 24
export const GRID_ROWS = 16

export function gridMetrics(viewport: Viewport): {
    left: number
    top: number
    bottom: number
    width: number
    height: number
    gap: number
    columnStep: number
    rowStep: number
} {
    const left = Math.min(24, viewport.width * 0.04)
    const top = Math.min(104, viewport.height * 0.3)
    const bottom = Math.min(88, viewport.height * 0.12)
    const width = Math.max(1, viewport.width - left * 2)
    const height = Math.max(1, viewport.height - top - bottom)
    const gap = Math.min(12, width / (GRID_COLUMNS * 2), height / (GRID_ROWS * 2))
    return {
        left,
        top,
        bottom,
        width,
        height,
        gap,
        columnStep: (width + gap) / GRID_COLUMNS,
        rowStep: (height + gap) / GRID_ROWS,
    }
}

export function rectToGrid(rect: FreeLayoutRect, viewport: Viewport, cover = false): GridPosition {
    const grid = gridMetrics(viewport)
    const round = cover ? Math.ceil : Math.round
    const columns = Math.max(2, Math.min(GRID_COLUMNS, round((rect.width + grid.gap) / grid.columnStep)))
    const rows = Math.max(1, round((rect.height + grid.gap) / grid.rowStep))
    return {
        column: Math.max(0, Math.min(GRID_COLUMNS - columns, Math.round((rect.x - grid.left) / grid.columnStep))),
        row: Math.max(0, Math.round((rect.y - grid.top) / grid.rowStep)),
        columns,
        rows,
    }
}

export function gridToRect(position: GridPosition, viewport: Viewport, original: FreeLayoutRect): FreeLayoutRect {
    const grid = gridMetrics(viewport)
    return {
        ...original,
        x: grid.left + position.column * grid.columnStep,
        y: grid.top + position.row * grid.rowStep,
        width: position.columns * grid.columnStep - grid.gap,
        height: position.rows * grid.rowStep - grid.gap,
    }
}

export function clampRect(rect: FreeLayoutRect, viewport: Viewport, cover = false): FreeLayoutRect {
    return gridToRect(rectToGrid(rect, viewport, cover), viewport, rect)
}

/** Preserve the centre line of initially centred widgets when expanding them to whole cells. */
export function initialRect(rect: FreeLayoutRect, viewport: Viewport): FreeLayoutRect {
    const width = Math.max(120, rect.width)
    const height = Math.max(48, rect.height)
    const natural = {
        ...rect,
        x: rect.x + (rect.width - width) / 2,
        y: rect.y + (rect.height - height) / 2,
        width,
        height,
    }
    const position = rectToGrid(natural, viewport, true)
    if (Math.abs(rect.x + rect.width / 2 - viewport.width / 2) < 1) {
        // An even column count needs an even span to place both edges on grid lines around the centre.
        position.columns += position.columns % 2
        position.column = (GRID_COLUMNS - position.columns) / 2
    }
    return gridToRect(position, viewport, natural)
}

export function projectRect(rect: FreeLayoutRect, from: Viewport, to: Viewport): FreeLayoutRect {
    return gridToRect(rectToGrid(rect, from), to, rect)
}

export function changeRect(
    original: FreeLayoutRect,
    handle: Handle,
    dx: number,
    dy: number,
    viewport: Viewport,
    minimum?: MinimumSize,
): FreeLayoutRect {
    const grid = gridMetrics(viewport)
    const position = rectToGrid(original, viewport)
    const x = Math.round(dx / grid.columnStep)
    const y = Math.round(dy / grid.rowStep)
    const minColumns = Math.min(
        GRID_COLUMNS,
        Math.max(2, Math.ceil(((minimum?.width ?? 0) + grid.gap) / grid.columnStep - 1e-6)),
    )
    const minRows = Math.max(1, Math.ceil(((minimum?.height ?? 0) + grid.gap) / grid.rowStep - 1e-6))
    const right = Math.max(position.column + position.columns, minColumns)
    const bottom = Math.max(position.row + position.rows, minRows)

    if (handle === 'move') {
        position.column = Math.max(0, Math.min(GRID_COLUMNS - position.columns, position.column + x))
        position.row = Math.max(0, position.row + y)
    } else {
        if (handle.includes('e')) {
            position.columns = Math.max(minColumns, Math.min(GRID_COLUMNS - position.column, position.columns + x))
        }
        if (handle.includes('s')) position.rows = Math.max(minRows, position.rows + y)
        if (handle.includes('w')) {
            position.column = Math.max(0, Math.min(right - minColumns, position.column + x))
            position.columns = right - position.column
        }
        if (handle.includes('n')) {
            position.row = Math.max(0, Math.min(bottom - minRows, position.row + y))
            position.rows = bottom - position.row
        }
    }
    if (handle !== 'move') {
        position.columns = Math.max(position.columns, minColumns)
        position.rows = Math.max(position.rows, minRows)
    }
    position.column = Math.min(position.column, GRID_COLUMNS - position.columns)
    return gridToRect(position, viewport, original)
}

/** Pointer-following geometry stays continuous; the layout underneath still uses aligned cells. */
export function continuousRect(
    original: FreeLayoutRect,
    handle: Handle,
    dx: number,
    dy: number,
    viewport: Viewport,
    minimum?: MinimumSize,
): FreeLayoutRect {
    const grid = gridMetrics(viewport)
    const minWidth = Math.min(grid.width, minimum?.width ?? Math.min(120, original.width))
    const minHeight = minimum?.height ?? Math.min(48, original.height, grid.height)
    const right = Math.max(original.x + original.width, grid.left + minWidth)
    const bottom = Math.max(original.y + original.height, grid.top + minHeight)
    const result = { ...original }
    if (handle === 'move') {
        result.x = Math.max(grid.left, Math.min(grid.left + grid.width - result.width, original.x + dx))
        result.y = Math.max(grid.top, original.y + dy)
        return result
    }
    if (handle.includes('e')) {
        result.width = Math.max(minWidth, Math.min(grid.left + grid.width - original.x, original.width + dx))
    }
    if (handle.includes('s')) {
        result.height = Math.max(minHeight, original.height + dy)
    }
    if (handle.includes('w')) {
        result.x = Math.max(grid.left, Math.min(right - minWidth, original.x + dx))
        result.width = right - result.x
    }
    if (handle.includes('n')) {
        result.y = Math.max(grid.top, Math.min(bottom - minHeight, original.y + dy))
        result.height = bottom - result.y
    }
    result.width = Math.max(result.width, minWidth)
    result.height = Math.max(result.height, minHeight)
    result.x = Math.min(result.x, grid.left + grid.width - result.width)
    return result
}

export function overlaps(a: GridPosition, b: GridPosition): boolean {
    return a.column < b.column + b.columns && a.column + a.columns > b.column &&
        a.row < b.row + b.rows && a.row + a.rows > b.row
}

function distance(a: GridPosition, b: GridPosition): number {
    return Math.abs(a.row - b.row) * 1.1 + Math.abs(a.column - b.column) +
        (b.row < a.row ? 0.01 : 0) + (b.column < a.column ? 0.01 : 0)
}

/** Native row order remains vertical when whole-cell rounding makes adjacent widgets overlap. */
export function arrangeRows(
    widgets: FreeLayout['widgets'],
    viewport: Viewport,
    order: readonly Widgets[],
): FreeLayout['widgets'] {
    const result = { ...widgets }
    const placed: GridPosition[] = []
    for (const id of order) {
        const rect = widgets[id]
        if (!rect) continue
        const position = rectToGrid(rect, viewport)
        let collisions = placed.filter((other) => overlaps(position, other))
        while (collisions.length) {
            position.row = Math.max(...collisions.map((other) => other.row + other.rows))
            collisions = placed.filter((other) => overlaps(position, other))
        }
        placed.push(position)
        result[id] = gridToRect(position, viewport, rect)
    }
    return result
}

/** Keep the held tile fixed, choosing the nearest arrangement including cascaded neighbors. */
export function arrangeWidgets(
    widgets: FreeLayout['widgets'],
    viewport: Viewport,
    visible: readonly Widgets[],
    active?: Widgets,
): FreeLayout['widgets'] {
    const ids = visible.filter((id) => widgets[id])
    const positions = new Map<Widgets, GridPosition>()
    for (const id of ids) positions.set(id, rectToGrid(widgets[id]!, viewport))
    const activePosition = active ? positions.get(active) : undefined
    const fixed = activePosition ? [active!] : []
    const others = ids.filter((id) => !activePosition || id !== active)
    const untouched = others.filter((id) => !activePosition || !overlaps(positions.get(id)!, activePosition))
    const collided = others.filter((id) => activePosition && overlaps(positions.get(id)!, activePosition))
    const largest = [...others].sort((a, b) => {
        const left = positions.get(a)!
        const right = positions.get(b)!
        return right.columns * right.rows - left.columns * left.rows
    })
    const orders = [[...fixed, ...untouched, ...collided], [...fixed, ...collided, ...untouched], [
        ...fixed,
        ...largest,
    ]]
    let best = widgets
    let bestDistance = Infinity

    for (const ordered of orders) {
        const placed: GridPosition[] = []
        const result = { ...widgets }
        let totalDistance = 0
        for (const id of ordered) {
            const original = positions.get(id)!
            let target = original
            if (placed.some((position) => overlaps(position, target))) {
                // Rows are unbounded: below all placed tiles is always a valid candidate.
                let nearest = { ...original, row: Math.max(...placed.map((position) => position.row + position.rows)) }
                let nearestDistance = Infinity
                // A nearest free position lies at the original coordinate or an obstacle edge.
                // Test those edges directly so long link lists don't make pointer handling scan every page row.
                const rows = new Set([0, original.row])
                const columns = new Set([0, original.column, GRID_COLUMNS - original.columns])
                for (const position of placed) {
                    rows.add(Math.max(0, position.row - original.rows))
                    rows.add(position.row + position.rows)
                    columns.add(Math.max(0, position.column - original.columns))
                    columns.add(Math.min(GRID_COLUMNS - original.columns, position.column + position.columns))
                }
                for (const row of Array.from(rows).sort((a, b) => a - b)) {
                    for (const column of Array.from(columns).sort((a, b) => a - b)) {
                        const candidate = { ...original, column, row }
                        const nextDistance = distance(original, candidate)
                        if (
                            nextDistance < nearestDistance && !placed.some((position) => overlaps(position, candidate))
                        ) {
                            nearest = candidate
                            nearestDistance = nextDistance
                        }
                    }
                }
                target = nearest
            }
            totalDistance += distance(original, target)
            placed.push(target)
            result[id] = gridToRect(target, viewport, widgets[id]!)
        }
        if (totalDistance < bestDistance) {
            best = result
            bestDistance = totalDistance
        }
        if (bestDistance === 0) break
    }
    return best
}

export function validateLayout(value: unknown): FreeLayout | undefined {
    if (!value || typeof value !== 'object') return
    const candidate = value as FreeLayout
    if (!candidate.viewport || !candidate.widgets || typeof candidate.widgets !== 'object') return
    if (![candidate.viewport.width, candidate.viewport.height].every((n) => Number.isFinite(n) && n > 0)) return

    const widgets: FreeLayout['widgets'] = {}
    for (const id of FREE_WIDGETS) {
        const rect = candidate.widgets[id]
        if (!rect || typeof rect !== 'object') continue
        if (
            !['x', 'y', 'width', 'height'].every((key) => Number.isFinite(rect[key as keyof FreeLayoutRect]))
        ) continue
        if ([rect.width, rect.height].some((n) => n <= 0)) {
            continue
        }
        const normalized: FreeLayoutRect = {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
        }
        if (id === 'quicklinks' && Number.isFinite(rect.minRows) && rect.minRows! >= 1) {
            normalized.minRows = Math.floor(rect.minRows!)
        }
        const text = rect.textAlign ?? (rect as FreeLayoutRect & { align?: MoveAlign }).align?.text
        if (text === 'left' || text === 'center' || text === 'right') normalized.textAlign = text
        widgets[id] = clampRect(
            normalized,
            candidate.viewport,
            candidate.mode !== 'grid',
        )
    }

    return {
        enabled: candidate.enabled === true,
        mode: 'grid',
        viewport: { ...candidate.viewport },
        widgets,
    }
}
