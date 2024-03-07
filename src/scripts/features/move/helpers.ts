import { BROWSER } from '../../defaults'
import { activeID } from '.'

export const elements = <const>{
	time: document.getElementById('time'),
	main: document.getElementById('main'),
	quicklinks: document.getElementById('linkblocks'),
	searchbar: document.getElementById('sb_container'),
	notes: document.getElementById('notes_container'),
	quotes: document.getElementById('quotes_container'),
}

export function isEditing(): boolean {
	return document.getElementById('interface')?.classList.contains('move-edit') || false
}

export function widgetStatesToData(states: [Widgets, boolean][], data: Sync.Storage): Sync.Storage {
	const widgets: { [key in Widgets]?: boolean } = {}
	states.forEach(([id, on]) => (widgets[id] = on))

	if (widgets?.time !== undefined) {
		data.time = widgets.time
	}

	if (widgets?.main !== undefined) {
		data.main = widgets.main
	}

	if (widgets?.quicklinks !== undefined) {
		data.quicklinks = widgets.quicklinks
	}

	if (widgets?.searchbar !== undefined) {
		data.searchbar = { ...data.searchbar, on: widgets.searchbar }
	}

	if (widgets?.quotes !== undefined) {
		data.quotes = { ...data.quotes, on: widgets.quotes }
	}

	if (widgets?.notes !== undefined && data.notes) {
		data.notes = { ...data.notes, on: widgets.notes }
	}

	return data
}

export function areaStringToLayoutGrid(area: string): string[][] {
	let splitchar = BROWSER === 'safari' ? `\"` : "'"
	let rows = area.split(splitchar).filter((a) => a.length > 1)
	let grid = rows.map((r) => r.split(' '))

	return grid
}

export function layoutToGridAreas(grid: string[][]) {
	let areas = ``

	const itemListToString = (row: string[]) => row.reduce((a, b) => `${a} ${b}`) // 2
	grid.forEach((row: string[]) => (areas += `'${itemListToString(row)}' `)) // 1

	return areas
}

export function getEnabledWidgetsFromStorage(data: Sync.Storage): Widgets[] {
	// BAD: DO NOT CHANGE THIS OBJECT ORDER AS IT WILL BREAK LAYOUT RESET
	// Time & main in first place ensures grid size is enough to add quotes & links
	let displayed = {
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

export function getEnabledWidgetsFromGrid(area: string): Widgets[] {
	const list = area.replaceAll("'", '').replaceAll('.', '').split(' ')
	const widgets = list.filter((str, i) => list.indexOf(str) === i) // remove duplicates

	return widgets as Widgets[]
}

export function findIdPositions(
	grid: Grid,
	id: string
): {
	posCol: number
	posRow: number
}[] {
	const allpos: { posCol: number; posRow: number }[] = []

	grid.flat().forEach((a, i) => {
		if (a !== id) return
		allpos.push({
			posCol: i % grid[0].length,
			posRow: Math.floor(i / grid[0].length),
		})
	})

	return allpos
}

function getSpanDirection(grid: Grid, id: string): 'none' | 'columns' | 'rows' {
	const poses = findIdPositions(grid, id)
	const rows = Object.values(poses).map(({ posRow }) => posRow)

	if (poses.length < 2) return 'none'
	if (rows[0] !== rows[1]) return 'columns'
	else return 'rows'
}

export function hasDuplicateInArray(arr: string[], id?: string): boolean {
	return arr.filter((a) => a === (id || activeID())).length > 1
}

export function isRowEmpty(grid: Grid, index: number) {
	if (grid[index] === undefined) return false

	let row = grid[index]
	let empty = true

	row.forEach((cell) => {
		if (cell !== '.' && getSpanDirection(grid, cell) !== 'columns') {
			empty = false
		}
	})

	return empty
}

export function spansInGridArea(grid: string[][], id: Widgets, { toggle, remove }: { toggle?: 'row' | 'col'; remove?: true }) {
	function addSpans(arr: string[]) {
		let target = arr.indexOf(id)
		let stopper = [false, false]

		function replaceWithId(a: string[], i: number, lim: number) {
			// not stopping and elem exit
			if (!stopper[lim] && a[i]) {
				if (a[i] === '.') a[i] = id // replaces dot with id
				else if (a[i] !== id) stopper[lim] = true // other ? stop
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
				if (keepfirst) keepfirst = false
				else return '.'
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

	const { posCol, posRow } = findIdPositions(grid, id)[0]
	let col = grid.map((g) => g[posCol])
	let row = [...grid[posRow]]

	if (remove) {
		col = removeSpans(col)
		row = removeSpans(row)
	}

	if (toggle) {
		if (toggle === 'col') col = hasDuplicateInArray(col) ? removeSpans(col) : addSpans(col)
		if (toggle === 'row') row = hasDuplicateInArray(row) ? removeSpans(row) : addSpans(row)
	}

	grid.forEach((_, i) => (grid[i][posCol] = col[i])) // Row changes
	grid[posRow].forEach((_, i) => (grid[posRow][i] = row[i])) // Column changes

	return grid
}

export function gridWidget(grid: Grid, selection: Sync.Move['column'], id: Key, add: boolean) {
	function addWidget() {
		if (grid.length === 0) {
			if (selection === 'single') return [[id]]
			if (selection === 'double') return [[id, '.']]
			if (selection === 'triple') return [['.', id, '.']]
		}

		// in triple column, default column is [x, here, x]
		const targetCol = grid[0].length === 3 ? 1 : 0
		let index = grid.length === 1 ? 1 : 2

		if (id === 'time') index = 0
		if (id === 'main') index = grid[0][targetCol] === 'time' ? 1 : 0
		if (id === 'quotes') index = grid.length
		if (id === 'quicklinks') {
			const isLastQuotes = grid[grid.length - 1][targetCol] === 'quotes'
			index = isLastQuotes ? grid.length - 1 : grid.length
		}

		//
		// Apply
		//

		function fillNewRow(cell: string, i: number) {
			if (!cell || cell === '.') return

			const positions = findIdPositions(grid, cell)

			// remove spans on targeted cell
			if (i === targetCol && positions.length > 1) {
				grid = spansInGridArea(grid, cell as Key, { remove: true })
				return
			}

			// keep column spans on adjacent columns
			if (getSpanDirection(grid, cell) === 'columns') {
				newrow[i] = cell
			}
		}

		// Adding last row, duplicates above and replace middle id
		let newrow = grid[0].map(() => '.')
		const isLastRow = grid[index] === undefined

		grid[index - (isLastRow ? 1 : 0)].forEach((cell, i) => fillNewRow(cell, i))
		grid.splice(index, 0, newrow as any) // Todo: typeof JeComprendPasLa
		grid[index][targetCol] = id

		return grid
	}

	function removeWidget() {
		// remove id from grid
		for (const i in grid) {
			for (const k in grid[i]) {
				if (grid[i][k] === id) grid[i][k] = '.'
			}
		}

		grid.forEach((_, i) => {
			if (isRowEmpty(grid, i)) {
				grid.splice(i, 1)
			}
		})

		return grid
	}

	return add ? addWidget() : removeWidget()
}
