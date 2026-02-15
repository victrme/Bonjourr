import { gridFind, gridFindObject, MOVE_WIDGETS } from './helpers.ts'
import { setGridAreas } from './dom.ts'
import { storage } from '../../storage.ts'

import type { Direction, Grid, WidgetInGrid } from './helpers.ts'
import type { SimpleMove } from '../../../types/sync.ts'
import type { WidgetName } from '../../../types/shared.ts'

type WidgetSize = { width: number; height: number }
type WidgetSizes = Map<WidgetName, WidgetSize>

//

export function gridChange(move: SimpleMove, id: WidgetName, direction: Direction): void {
	const widget = gridFindObject(move.grid, id)
	const sizes = toSizeMap(move)

	if (!widget.positions.length) {
		return
	}

	// Mutates move steps by steps
	addGridEdges(move, direction, widget)
	optimisticSwap(move, id, widget, direction)
	fixGridCollisions(move, sizes, id)
	trimGridEdges(move)
	setGridAreas(move.grid)

	storage.sync.set({ move })
}

/** Step 1 */
function addGridEdges(move: SimpleMove, dir: Direction, widget: WidgetInGrid): void {
	const grid = move.grid

	const isBottom = isWidgetAtEdge(move.grid, widget, 'down')
	const isRight = isWidgetAtEdge(move.grid, widget, 'right')
	const isLeft = isWidgetAtEdge(move.grid, widget, 'left')
	const isTop = isWidgetAtEdge(grid, widget, 'up')

	if (dir === 'up' && isTop) {
		move.grid.unshift(rowOfDots(move))

		for (const position of widget.positions) {
			position.row++
		}
	}

	if (dir === 'left' && isLeft) {
		for (const row of move.grid) {
			row.unshift('.')
		}
		for (const position of widget.positions) {
			position.col++
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

/** Step 2 */
function optimisticSwap(move: SimpleMove, id: WidgetName, widget: WidgetInGrid, dir: Direction): void {
	for (const { col, row } of widget.positions) {
		let targetRow = row
		let targetCol = col

		if (dir === 'up') {
			targetRow--
		}
		if (dir === 'down') {
			targetRow++
		}
		if (dir === 'left') {
			targetCol--
		}
		if (dir === 'right') {
			targetCol++
		}

		const displacedCellContent = move.grid[targetRow][targetCol]

		move.grid[targetRow][targetCol] = id

		if (move.grid[row][col] === id) {
			move.grid[row][col] = displacedCellContent
		}
	}
}

/** Step 3 */
function fixGridCollisions(move: SimpleMove, sizes: WidgetSizes, id: WidgetName): void {
	for (let _ = 0; _ < 100; _++) {
		let isLayoutStable = true

		for (const collidingId of MOVE_WIDGETS) {
			const notWidget = id !== collidingId
			const notRectangle = !isRectangle(move.grid, collidingId)

			if (notWidget && notRectangle) {
				pushWidgetDown(move, sizes, id, collidingId)
				isLayoutStable = false
			}
		}

		if (isLayoutStable) {
			break
		}
	}
}

/** Step 3.1 */
function pushWidgetDown(move: SimpleMove, sizes: WidgetSizes, pushedId: WidgetName, lockedId: WidgetName) {
	const pushedInGrid = gridFind(move.grid, pushedId)

	if (!pushedInGrid.length) {
		return
	}

	const pushed = sizes.get(pushedId) || { width: 1, height: 1 }
	const topRow = Math.min(...pushedInGrid.map((p) => p[1]))
	const leftCol = Math.min(...pushedInGrid.map((p) => p[0]))

	for (const [col, row] of pushedInGrid) {
		move.grid[row][col] = '.'
	}

	let newTopRow = topRow + 1

	for (let attempt = 0; attempt < 100; attempt++) {
		const bottomBoundary = newTopRow + pushed.height
		const bottomOverflow = bottomBoundary - move.grid.length
		const neededRows = Math.max(0, bottomOverflow)

		for (let i = 0; i < neededRows; i++) {
			move.grid.push(rowOfDots(move))
		}

		let collisionWithLocked = false

		for (let r = newTopRow; r < newTopRow + pushed.height; r++) {
			for (let c = leftCol; c < leftCol + pushed.width; c++) {
				if (lockedId === move.grid[r][c] as WidgetName) {
					collisionWithLocked = true
					break
				}
			}
			if (collisionWithLocked) {
				break
			}
		}

		if (collisionWithLocked) {
			newTopRow++
		} else {
			break
		}
	}

	for (let r = newTopRow; r < newTopRow + pushed.height; r++) {
		for (let c = leftCol; c < leftCol + pushed.width; c++) {
			const collidingId = move.grid[r][c]

			if (collidingId !== '.' && collidingId !== pushedId) {
				pushWidgetDown(move, sizes, lockedId, collidingId as WidgetName)
			}

			move.grid[r][c] = pushedId
		}
	}
}

/** Step 4 */
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
		move.grid.forEach((r) => (r.shift()))
	}
	if (multipleCols && emptyRight) {
		move.grid.forEach((r) => (r.pop()))
	}
}

/**
 * helpers
 */

/** */
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
	const cols = widget.positions.map((p) => (p.col))
	const rows = widget.positions.map((p) => (p.row))
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

export function findOffendingRow(grid: Grid, id: string): number | undefined {
	/**
	 * <!> The first line is never detected as the offending one
	 * <!> because its used as the control row.
	 *
	 * Can be a problem, let's see if it is often the case.
	 */

	let lastWidth: number | undefined

	for (let ii = 0; ii < grid.length; ii++) {
		const row = grid[ii]
		let currentWidth = 0

		for (const col of row) {
			if (col === id) {
				currentWidth++
			}
		}

		if (lastWidth && currentWidth) {
			if (currentWidth !== lastWidth) {
				return ii
			}
		}

		lastWidth = currentWidth
	}
}

function isRectangle(grid: Grid, id: string): boolean {
	return !findOffendingRow(grid, id)
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
