import type { Move, Sync } from '../../../types/sync.ts'
import type { WidgetName } from '../../../types/shared.ts'

type Grid = string[][]

export type Direction = 'up' | 'down' | 'left' | 'right'

export const MOVE_WIDGETS: WidgetName[] = [
	'time',
	'main',
	'quicklinks',
	'notes',
	'quotes',
	'searchbar',
	'pomodoro',
]

export const MOVE_DEFAULT: string[][] = [
	['time'],
	['main'],
	['quicklinks'],
]

export const elements = {
	time: globalThis.document.getElementById('time'),
	main: globalThis.document.getElementById('main'),
	quicklinks: globalThis.document.getElementById('linkblocks'),
	searchbar: globalThis.document.getElementById('sb_container'),
	notes: globalThis.document.getElementById('notes_container'),
	quotes: globalThis.document.getElementById('quotes_container'),
	pomodoro: globalThis.document.getElementById('pomodoro_container'),
} as const

export function isEditing(): boolean {
	return document.getElementById('interface')?.classList.contains('move-edit') ?? false
}

export function hasDuplicateInArray(arr: string[], id?: string): boolean {
	return arr.filter((a) => a === id).length > 1
}

//	Grid

export function columnsAmount(grid: Grid): number {
	return grid[0]?.length || 1
}

function gridValidate(grid: Grid): boolean {
	const cells = grid.flat()
	const cellsAreWidgets = cells.every((val) => val === '.' || MOVE_WIDGETS.includes(val as WidgetName))
	return cellsAreWidgets
}

export function gridParse(area = ''): Grid {
	const stringToGrid = (split: string): string[][] => {
		const rows = area.split(split).filter((a) => a.length > 1)
		const grid = rows.map((r) => r.split(' '))
		return grid
	}

	const result = stringToGrid("'")

	if (gridValidate(result)) {
		return result
	}

	return stringToGrid(`\"`)
}

export function gridStringify(grid: Grid) {
	const rows = grid.map((items) => {
		const columns = items.reduce((a, b) => `${a} ${b}`)
		return `'${columns}'`
	})

	const areas = rows.join(' ')

	return areas.trimEnd()
}

export function gridFind(grid: Grid, id: string): [number, number][] {
	const positions: [number, number][] = []

	grid.flat().forEach((a, i) => {
		if (a !== id) {
			return
		}

		const column = i % grid[0].length
		const row = Math.floor(i / grid[0].length)

		positions.push([column, row])
	})

	return positions
}

export interface WidgetInGrid {
	width: number
	height: number
	positions: {
		col: number
		row: number
	}[]
}

export function gridFindObject(grid: Grid, id: string): WidgetInGrid {
	const positions = gridFind(grid, id)
	const pos = positions.map(([c, r]) => ({
		col: c,
		row: r,
	}))

	const rowsAmount = [...new Set(pos.map((p) => p.row))].length
	const colsAmount = [...new Set(pos.map((p) => p.col))].length

	return {
		width: colsAmount,
		height: rowsAmount,
		positions: pos,
	}
}

/**
 * <!> The first line is never detected as the offending one
 * <!> because its used as the control row.
 *
 * Can be a problem, let's see if it is often the case.
 */
export function findOffendingRow(grid: Grid, id: string): number | undefined {
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

export function isRectangle(grid: Grid, id: string): boolean {
	return !findOffendingRow(grid, id)
}

//	Alignment

export function alignStringify(align: { box: string; text: string }): string {
	return align.box + (align.box && align.text ? ' & ' : '') + align.text
}

export function alignParse(string = ''): { box: string; text: string } {
	const arr = string.split(' & ')
	return { box: arr[0] ?? '', text: arr[1] ?? '' }
}

//	Span

function getSpanDirection(grid: Grid, id: string): 'none' | 'columns' | 'rows' {
	const poses = gridFind(grid, id)
	const rows = Object.values(poses).map(([_, row]) => row)

	if (poses.length < 2) {
		return 'none'
	}
	if (rows[0] !== rows[1]) {
		return 'columns'
	}

	return 'rows'
}

export function isRowEmpty(grid: Grid, index: number): boolean {
	if (grid[index] === undefined) {
		return false
	}

	return grid[index].every((cell) => cell === '.')
}

export function isColumnEmpty(grid: Grid, index: number): boolean {
	return grid.every((row) => row[index] === '.')
}

export function spansInGridArea(
	grid: Grid,
	id: WidgetName,
	{ toggle, remove }: { toggle?: 'row' | 'col'; remove?: true },
) {
	function addSpans(row: string[]) {
		const target = row.indexOf(id)
		const stopper = [false, false]
		let arr = row

		function replaceWithId(a: string[], i: number, lim: number) {
			// not stopping and elem exit
			if (!stopper[lim] && a[i]) {
				if (a[i] === '.') {
					a[i] = id // replaces dot with id
				} else if (a[i] !== id) {
					stopper[lim] = true // other ? stop
				}
			}

			return a
		}

		// in [., a, ., ., target, ., b, ., .]
		for (let ii = 1; ii < arr.length; ii++) {
			arr = replaceWithId(arr, target + ii, 0) // replaces until b
			arr = replaceWithId(arr, target - ii, 1) // replaces until a
		}

		return arr
	}

	function removeSpans(arr: string[]) {
		let keepfirst = true
		return arr.map((a) => {
			if (a === id) {
				if (keepfirst) {
					keepfirst = false
				}
				return '.'
			}
			return a
		})
	}

	/*
		For columns and rows:
		mutate column by adding / removing duplicates
		mutate grid with new column
		update buttons with recheck duplication (don't assume duped work everytime)
	*/

	const [x, y] = gridFind(grid, id)[0]
	let col = grid.map((g) => g[x])
	let row = [...grid[y]]

	if (remove) {
		col = removeSpans(col)
		row = removeSpans(row)
	}

	if (toggle) {
		if (toggle === 'col') {
			col = hasDuplicateInArray(col, id) ? removeSpans(col) : addSpans(col)
		}
		if (toggle === 'row') {
			row = hasDuplicateInArray(row, id) ? removeSpans(row) : addSpans(row)
		}
	}

	grid.forEach((_, i) => {
		grid[i][x] = col[i] // Row changes
	})

	grid[y].forEach((_, i) => {
		grid[y][i] = row[i] // Column changes
	})

	return grid
}

//	Widgets

export function getWidgetsStorage(data: Sync): WidgetName[] {
	// BAD: DO NOT CHANGE THIS OBJECT ORDER AS IT WILL BREAK LAYOUT RESET
	// Time & main in first place ensures grid size is enough to add quotes & links
	const displayed = {
		time: data.time,
		main: data.main,
		notes: !!data.notes?.on,
		searchbar: !!data.searchbar?.on,
		pomodoro: !!data.pomodoro?.on,
		quicklinks: data.quicklinks,
		quotes: !!data.quotes?.on,
	}

	return Object.entries(displayed)
		.filter(([_, val]) => val)
		.map(([key, _]) => key as WidgetName)
}

export function updateWidgetsStorage(states: [WidgetName, boolean][], data: Sync): Sync {
	//

	for (const [id, on] of states) {
		if (id === 'time') {
			data.time = on
		}
		if (id === 'main') {
			data.main = on
		}
		if (id === 'quicklinks') {
			data.quicklinks = on
		}
		if (id === 'quotes') {
			data.quotes = { ...data.quotes, on: on }
		}
		if (id === 'pomodoro') {
			data.pomodoro = { ...data.pomodoro, on: on }
		}
		if (id === 'searchbar') {
			data.searchbar = { ...data.searchbar, on: on }
		}
		if (id === 'notes' && data.notes) {
			data.notes = { ...data.notes, on: on }
		}
	}

	return data
}

export function getGridWidgets(area: string): WidgetName[] {
	const list = area.replaceAll("'", '').replaceAll('.', '').split(' ')
	const widgets = list.filter((str, i) => str && list.indexOf(str) === i) // remove duplicates
	return widgets as WidgetName[]
}

export function addGridWidget(grid: string, id: WidgetName): string {
	const newrow = addGridRow(id)
	let rows = grid.split("'").filter((row) => !(row === ' ' || row === ''))
	let position = 0

	if (grid === '') {
		return `'${newrow}'`
	}

	const isFirstWidgetTime = rows[0].includes('time')
	const isLastWidgetQuotes = rows.at(-1)?.includes('quotes')

	if (id === 'time') {
		position = 0
	}
	if (id === 'main') {
		position = isFirstWidgetTime ? 1 : 0
	}
	if (id === 'notes') {
		position = rows.length === 1 ? 1 : 2
	}
	if (id === 'searchbar') {
		position = rows.length === 1 ? 1 : 2
	}
	if (id === 'pomodoro') {
		position = rows.length === 1 ? 1 : 2
	}
	if (id === 'quicklinks') {
		position = rows.length - (isLastWidgetQuotes ? 1 : 0)
	}
	if (id === 'quotes') {
		position = rows.length
	}

	rows.splice(position, 0, newrow)
	rows = rows.map((row) => `'${row}'`)

	return rows.join(' ')
}

export function removeGridWidget(grid: string, id: WidgetName, _: Move['selection']): string {
	let rows = grid.split("'").filter((row) => !(row === ' ' || row === ''))

	rows = rows.filter((row) => !row.includes(id))
	rows = rows.map((row) => `'${row}'`)

	return rows.join(' ')
}

function addGridRow(id: WidgetName): string {
	const firstcolumn = selection === 'triple' ? '. ' : ''
	const lastcolumn = selection === 'triple' || selection === 'double' ? ' .' : ''

	return `${firstcolumn}${id}${lastcolumn}`
}
