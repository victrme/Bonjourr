import type { Move, MoveLayout, Sync } from '../../../types/sync.ts'
import type { Widgets } from '../../../types/shared.ts'

type Grid = string[][]

type Defaults = {
	single: MoveLayout
	double: MoveLayout
	triple: MoveLayout
}

const MOVE_WIDGETS = ['time', 'main', 'quicklinks', 'notes', 'quotes', 'searchbar']

export const elements = {
	time: globalThis.document.getElementById('time'),
	main: globalThis.document.getElementById('main'),
	quicklinks: globalThis.document.getElementById('linkblocks'),
	searchbar: globalThis.document.getElementById('sb_container'),
	notes: globalThis.document.getElementById('notes_container'),
	quotes: globalThis.document.getElementById('quotes_container'),
} as const

export const defaultLayouts: Defaults = {
	single: {
		grid: [['time'], ['main'], ['quicklinks']],
		items: {} as MoveLayout['items'],
	},
	double: {
		grid: [
			['time', '.'],
			['main', '.'],
			['quicklinks', '.'],
		],
		items: {} as MoveLayout['items'],
	},
	triple: {
		grid: [
			['time', '.', '.'],
			['main', '.', '.'],
			['quicklinks', '.', '.'],
		],
		items: {} as MoveLayout['items'],
	},
}

export function isEditing(): boolean {
	return document.getElementById('interface')?.classList.contains('move-edit') ?? false
}

export function hasDuplicateInArray(arr: string[], id?: string): boolean {
	return arr.filter((a) => a === id).length > 1
}

export function getLayout(data: Move | Sync, selection?: Move['selection']): MoveLayout {
	if ('move' in data) {
		const layouts = data.move.layouts
		const selec = selection ?? data.move.selection
		return layouts[selec] ?? defaultLayouts[selec]
	}

	const layouts = data.layouts
	const selec = selection ?? data.selection
	return layouts?.[selec] ?? defaultLayouts[selec]
}

//	Grid

function gridValidate(grid: Grid): boolean {
	const cells = grid.flat()
	const cellsAreWidgets = cells.every((val) => val === '.' || MOVE_WIDGETS.includes(val))
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
	let areas = ''

	// 2
	const itemListToString = (row: string[]) => row.reduce((a, b) => `${a} ${b}`)

	// 1
	areas = grid.map((row) => `'${itemListToString(row)}'`).join(' ')

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

export function isRowEmpty(grid: Grid, index: number) {
	if (grid[index] === undefined) {
		return false
	}

	const row = grid[index]
	let empty = true

	row.some((cell) => {
		if (cell !== '.' && getSpanDirection(grid, cell) !== 'columns') {
			empty = false
		}
	})

	return empty
}

export function spansInGridArea(
	grid: Grid,
	id: Widgets,
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

export function getWidgetsStorage(data: Sync): Widgets[] {
	// BAD: DO NOT CHANGE THIS OBJECT ORDER AS IT WILL BREAK LAYOUT RESET
	// Time & main in first place ensures grid size is enough to add quotes & links
	const displayed = {
		time: data.time,
		main: data.main,
		notes: !!data.notes?.on,
		searchbar: !!data.searchbar?.on,
		quicklinks: data.quicklinks,
		quotes: !!data.quotes?.on,
	}

	return Object.entries(displayed)
		.filter(([_, val]) => val)
		.map(([key, _]) => key as Widgets)
}

export function updateWidgetsStorage(states: [Widgets, boolean][], data: Sync): Sync {
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
		if (id === 'searchbar') {
			data.searchbar = { ...data.searchbar, on: on }
		}
		if (id === 'notes' && data.notes) {
			data.notes = { ...data.notes, on: on }
		}
	}

	return data
}

export function getGridWidgets(area: string): Widgets[] {
	const list = area.replaceAll("'", '').replaceAll('.', '').split(' ')
	const widgets = list.filter((str, i) => str && list.indexOf(str) === i) // remove duplicates
	return widgets as Widgets[]
}

export function addGridWidget(grid: string, id: Widgets, selection: Move['selection']): string {
	const newrow = addGridRow(selection, id)
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

export function removeGridWidget(grid: string, id: Widgets, _: Move['selection']): string {
	let rows = grid.split("'").filter((row) => !(row === ' ' || row === ''))

	rows = rows.filter((row) => !row.includes(id))
	rows = rows.map((row) => `'${row}'`)

	return rows.join(' ')
}

function addGridRow(selection: Move['selection'], id: Widgets): string {
	const firstcolumn = selection === 'triple' ? '. ' : ''
	const lastcolumn = selection === 'triple' || selection === 'double' ? ' .' : ''

	return `${firstcolumn}${id}${lastcolumn}`
}
