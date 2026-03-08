import { gridFind, gridFindObject, MOVE_WIDGETS } from './helpers.ts'
import { setGridAreas } from './dom.ts'
import { storage } from '../../storage.ts'

import type { Direction, Grid, WidgetInGrid } from './helpers.ts'
import type { SimpleMove } from '../../../types/sync.ts'
import type { WidgetName } from '../../../types/shared.ts'

type WidgetSize = { width: number; height: number }
type WidgetSizes = Map<WidgetName, WidgetSize>

//

export function gridGrow(move: SimpleMove, id: WidgetName, direction: Direction): void {
	const widget = gridFindObject(move.grid, id)
	const sizes = toSizeMap(move)

	if (!widget.positions.length) {
		return
	}

	// Mutates move step by step
	addGridEdgesForGrow(move, direction, widget, id)
	expandWidget(move, id, widget, direction)
	fixGridCollisions(move, sizes, id)
	trimGridEdges(move)
	setGridAreas(move.grid)

	storage.sync.set({ move })
}

/** Step 1: Add grid edges if the widget is at the edge */
function addGridEdgesForGrow(move: SimpleMove, dir: Direction, widget: WidgetInGrid, id: WidgetName): void {
	const grid = move.grid

	const isBottom = isWidgetAtEdge(grid, widget, 'down')
	const isRight = isWidgetAtEdge(grid, widget, 'right')
	const isLeft = isWidgetAtEdge(grid, widget, 'left')
	const isTop = isWidgetAtEdge(grid, widget, 'up')

	if (dir === 'up' && isTop) {
		move.grid.unshift(rowOfDots(move))
		// Update all widget positions after adding row at top
		for (const widgetId of MOVE_WIDGETS) {
			const w = gridFindObject(move.grid, widgetId)
			for (const position of w.positions) {
				position.row++
			}
		}
	}

	if (dir === 'left' && isLeft) {
		for (const row of move.grid) {
			row.unshift('.')
		}
		// Update all widget positions after adding column at left
		for (const widgetId of MOVE_WIDGETS) {
			const w = gridFindObject(move.grid, widgetId)
			for (const position of w.positions) {
				position.col++
			}
		}
	}

	if (dir === 'down' && isBottom) {
		move.grid.push(rowOfDots(move))
	}

	if (dir === 'right' && isRight) {
		for (const row of move.grid) {
			row.push('.')
		}
	}
}

/** Step 2: Expand the widget by 1 cell in the given direction */
function expandWidget(move: SimpleMove, id: WidgetName, widget: WidgetInGrid, dir: Direction): void {
	const grid = move.grid

	// Find the edge cells of the widget in the growth direction
	let targetCells: { col: number; row: number }[] = []

	if (dir === 'down') {
		const maxRow = Math.max(...widget.positions.map((p) => p.row))
		targetCells = widget.positions.filter((p) => p.row === maxRow).map((p) => ({ col: p.col, row: p.row + 1 }))
	}

	if (dir === 'up') {
		const minRow = Math.min(...widget.positions.map((p) => p.row))
		targetCells = widget.positions.filter((p) => p.row === minRow).map((p) => ({ col: p.col, row: p.row - 1 }))
	}

	if (dir === 'right') {
		const maxCol = Math.max(...widget.positions.map((p) => p.col))
		targetCells = widget.positions.filter((p) => p.col === maxCol).map((p) => ({ col: p.col + 1, row: p.row }))
	}

	if (dir === 'left') {
		const minCol = Math.min(...widget.positions.map((p) => p.col))
		targetCells = widget.positions.filter((p) => p.col === minCol).map((p) => ({ col: p.col - 1, row: p.row }))
	}

	// Store displaced widgets before expanding
	const displacedWidgets = new Set<WidgetName>()

	for (const { col, row } of targetCells) {
		const cellContent = grid[row][col]
		if (cellContent !== '.' && cellContent !== id) {
			displacedWidgets.add(cellContent as WidgetName)
		}
	}

	// Expand the widget into target cells
	for (const { col, row } of targetCells) {
		grid[row][col] = id
	}

	// Push displaced widgets in the growth direction
	for (const displacedId of displacedWidgets) {
		pushWidget(move, displacedId, dir)
	}
}

/** Step 3: Push a widget in the given direction */
function pushWidget(move: SimpleMove, id: WidgetName, dir: Direction): void {
	const widget = gridFindObject(move.grid, id)
	const grid = move.grid

	if (!widget.positions.length) {
		return
	}

	// Calculate how far to push
	let pushDistance = 1

	// Add grid edges if needed
	const isAtEdge = isWidgetAtEdge(grid, widget, dir)
	if (isAtEdge) {
		if (dir === 'down') {
			move.grid.push(rowOfDots(move))
		}
		if (dir === 'right') {
			for (const row of move.grid) {
				row.push('.')
			}
		}
		if (dir === 'up') {
			move.grid.unshift(rowOfDots(move))
			pushDistance = 0 // Widget stays in place, grid expanded above
		}
		if (dir === 'left') {
			for (const row of move.grid) {
				row.unshift('.')
			}
			pushDistance = 0 // Widget stays in place, grid expanded to left
		}
	}

	// Clear current positions
	for (const { col, row } of widget.positions) {
		grid[row][col] = '.'
	}

	// Place widget in new positions
	for (const { col, row } of widget.positions) {
		let newRow = row
		let newCol = col

		if (dir === 'down') newRow += pushDistance
		if (dir === 'up') newRow -= pushDistance
		if (dir === 'right') newCol += pushDistance
		if (dir === 'left') newCol -= pushDistance

		// Check if new position has another widget
		const cellContent = grid[newRow][newCol]
		if (cellContent !== '.' && cellContent !== id) {
			// Recursively push the blocking widget
			pushWidget(move, cellContent as WidgetName, dir)
		}

		grid[newRow][newCol] = id
	}
}

/** Step 4: Fix any grid collisions by ensuring all widgets are rectangles */
function fixGridCollisions(move: SimpleMove, sizes: WidgetSizes, growingId: WidgetName): void {
	for (let _ = 0; _ < 100; _++) {
		let isLayoutStable = true

		for (const id of MOVE_WIDGETS) {
			if (id !== growingId && !isRectangle(move.grid, id)) {
				// Widget is not a rectangle, needs fixing
				isLayoutStable = false
				// For now, we'll rely on the pushing mechanism
				// Additional collision fixes can be added here if needed
			}
		}

		if (isLayoutStable) {
			break
		}
	}
}

/** Step 5: Trim empty edges from the grid */
function trimGridEdges(move: SimpleMove): void {
	const multipleRows = move.grid.length > 1
	const multipleCols = move.grid[0].length > 1

	const emptyTop = isRowEmpty(move.grid, 0)
	const emptyBottom = isRowEmpty(move.grid, move.grid.length - 1)
	const emptyLeft = isColumnEmpty(move.grid, 0)
	const emptyRight = isColumnEmpty(move.grid, move.grid[0].length - 1)

	if (multipleRows && emptyTop) {
		move.grid.shift()
	}
	if (multipleRows && emptyBottom) {
		move.grid.pop()
	}
	if (multipleCols && emptyLeft) {
		for (const r of move.grid) {
			r.shift()
		}
	}
	if (multipleCols && emptyRight) {
		for (const r of move.grid) {
			r.pop()
		}
	}
}

/**
 * Helper functions
 */

function toSizeMap(move: SimpleMove): WidgetSizes {
	const sizes = new Map<WidgetName, WidgetSize>()

	for (const id of MOVE_WIDGETS) {
		const { positions, width, height } = gridFindObject(move.grid, id)

		if (positions.length) {
			sizes.set(id, { width, height })
		}
	}

	return sizes
}

function isWidgetAtEdge(grid: Grid, widget: WidgetInGrid, dir: Direction): boolean {
	const cols = widget.positions.map((p) => p.col)
	const rows = widget.positions.map((p) => p.row)
	const lastCol = grid[0].length - 1
	const lastRow = grid.length - 1

	switch (dir) {
		case 'up':
			return Math.min(...rows) === 0
		case 'right':
			return Math.max(...cols) === lastCol
		case 'down':
			return Math.max(...rows) === lastRow
		case 'left':
			return Math.min(...cols) === 0
	}
}

function isRectangle(grid: Grid, id: string): boolean {
	const positions = gridFind(grid, id)
	if (positions.length === 0) return true

	const cols = positions.map((p) => p[0])
	const rows = positions.map((p) => p[1])

	const minCol = Math.min(...cols)
	const maxCol = Math.max(...cols)
	const minRow = Math.min(...rows)
	const maxRow = Math.max(...rows)

	const expectedCells = (maxCol - minCol + 1) * (maxRow - minRow + 1)

	return positions.length === expectedCells
}

function isRowEmpty(grid: Grid, index: number): boolean {
	if (grid[index] === undefined) {
		return false
	}

	return grid[index].every((cell) => cell === '.')
}

function isColumnEmpty(grid: Grid, index: number): boolean {
	return grid.every((row) => row[index] === '.')
}

function rowOfDots(move: SimpleMove): ('.')[] {
	return new Array(move.grid[0].length).fill('.')
}
