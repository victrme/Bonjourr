import { toolboxEvents, alignButtons, gridButtons, layoutButtons, resetButton, spanButtons, showSpanButtons } from './toolbox'
import { setAlign, addOverlay, removeOverlay, setGridAreas, setAllAligns, removeSelection, interfaceFade } from './dom'
import { SYNC_DEFAULT } from '../../defaults'
import onSettingsLoad from '../../utils/onsettingsload'
import transitioner from '../../utils/transitioner'
import { tradThis } from '../../utils/translations'
import toggleWidget from './widgets'
import storage from '../../storage'

import {
	isEditing,
	isRowEmpty,
	gridFind,
	gridParse,
	alignParse,
	gridStringify,
	alignStringify,
	spansInGridArea,
	addGridWidget,
	updateWidgetsStorage,
	getGridWidgets,
	getWidgetsStorage,
} from './helpers'

type UpdateMove = {
	widget?: [Widgets, boolean]
	span?: 'col' | 'row'
	reset?: true
	toggle?: true
	box?: string
	text?: string
	layout?: string
	select?: string
	responsive?: true
	overlay?: boolean
	grid?: { x?: string; y?: string }
}

const dominterface = document.querySelector<HTMLElement>('#interface')
let widget: Widgets | undefined
let smallWidth = false

export default function moveElements(init?: Sync.Move, events?: UpdateMove) {
	if (!init && !events) {
		updateMoveElement({ reset: true })
		return
	}

	if (events) {
		updateMoveElement(events)
		return
	}

	if (init) {
		setAllAligns(init[init.column])
		setGridAreas(init[init.column]?.grid)
		onSettingsLoad(toolboxEvents)
	}
}

export async function updateMoveElement(event: UpdateMove) {
	const data = await storage.sync.get()

	if (!data.move) data.move = structuredClone(SYNC_DEFAULT.move)

	if (smallWidth) data.move.column = 'single'

	if (event.grid) gridChange(data.move, event.grid)
	if (event.span) toggleGridSpans(data.move, event.span)
	if (event.layout) layoutChange(data, event.layout)
	if (event.reset) layoutReset(data)
	if (event.toggle) toggleMoveStatus(data)
	if (event.widget) toggleWidget(data, event.widget)
	if (event.overlay) pageWidthOverlay(data.move, event.overlay)
	if (event.select) elementSelection(data.move, event.select)
	if (event.box !== undefined) alignChange(data.move, event.box, 'box')
	if (event.text !== undefined) alignChange(data.move, event.text, 'text')
}

function gridChange(move: Sync.Move, gridpos: { x?: string; y?: string }) {
	if (!widget) return

	// Get button move amount
	const y = parseInt(gridpos?.y || '0')
	const x = parseInt(gridpos?.x || '0')

	let grid = gridParse(move[move.column]?.grid ?? '')
	const allActivePos = gridFind(grid, widget)
	const allAffectedIds: Widgets[] = []

	// step 0: Adds new line
	const isGridOverflowing = allActivePos.some(({ posRow }) => grid[posRow + y] === undefined)

	if (isGridOverflowing) {
		if (move.column === 'single') grid.push(['.'])
		if (move.column === 'double') grid.push(['.', '.'])
		if (move.column === 'triple') grid.push(['.', '.', '.'])
	}

	// step 1: Find elements affected by grid change
	allActivePos.forEach(({ posRow, posCol }) => {
		const newposition = grid[posRow + y][posCol + x]

		if (newposition !== '.') {
			allAffectedIds.push(newposition as Widgets)
		}
	})

	// step 2: remove conflicting fillings on affected elements
	allAffectedIds.forEach((id) => {
		if (gridFind(grid, id).length > 1) {
			grid = spansInGridArea(grid, id, { remove: true })
		}
	})

	// step 3: replace all active position with affected
	allActivePos.forEach(({ posRow, posCol }) => {
		const newRow = Math.min(Math.max(posRow + y, 0), grid.length - 1)
		const newCol = Math.min(Math.max(posCol + x, 0), grid[0].length - 1)

		let tempItem = grid[posRow][posCol]
		grid[posRow][posCol] = grid[newRow][newCol]
		grid[newRow][newCol] = tempItem
	})

	// step 4: remove empty lines
	grid.forEach((_, i) => {
		if (isRowEmpty(grid, i)) {
			grid.splice(i, 1)
		}
	})

	// step 5: profit ??????????????
	const areas = gridStringify(grid)

	move[move.column].grid = areas
	storage.sync.set({ move: move })

	gridButtons(widget)
	setGridAreas(areas)
}

function alignChange(move: Sync.Move, value: string, type: 'box' | 'text') {
	if (!widget) {
		return
	}

	const column = move[move.column]
	const align = alignParse(column[widget])

	if (type === 'box') align.box = value
	if (type === 'text') align.text = value

	column[widget] = alignStringify(align)
	move[move.column] = column
	storage.sync.set({ move: move })

	alignButtons(column[widget])
	setAlign(widget, column[widget])
}

function layoutChange(data: Sync.Storage, column: string) {
	// Only update selection if coming from user
	if (column === 'single' || column === 'double' || column === 'triple') {
		data.move.column = column
	}

	const layout = data.move[data.move.column]
	const widgetsInGrid = getGridWidgets(layout.grid)

	const list: [Widgets, boolean][] = [
		['time', widgetsInGrid.includes('time')],
		['main', widgetsInGrid.includes('main')],
		['notes', widgetsInGrid.includes('notes')],
		['quotes', widgetsInGrid.includes('quotes')],
		['searchbar', widgetsInGrid.includes('searchbar')],
		['quicklinks', widgetsInGrid.includes('quicklinks')],
	]

	data = updateWidgetsStorage(list, data)
	storage.sync.set({ ...data })

	const interfaceTransition = transitioner()

	interfaceTransition.first(() => {
		interfaceFade('out')
	})

	interfaceTransition.then(async () => {
		setAllAligns(layout)
		setGridAreas(layout.grid)
		layoutButtons(data.move.column)
		showSpanButtons(data.move.column)
		removeSelection()

		// Toggle overlays if we are editing
		if (dominterface?.classList.contains('move-edit')) {
			removeOverlay()
			widgetsInGrid.forEach((id) => addOverlay(id))
		}

		if (widget) {
			gridButtons(widget)
			alignButtons(layout[widget])
		}
	})

	interfaceTransition.finally(() => {
		interfaceFade('in')
	})

	interfaceTransition.transition(200)
}

function layoutReset(data: Sync.Storage) {
	const enabledWidgets = getWidgetsStorage(data)
	let grid: string = ''

	if (resetButton() === false) {
		return
	}

	enabledWidgets.forEach((id) => {
		grid = addGridWidget(grid, id, data.move.column)
	})

	data.move[data.move.column] = { grid }
	storage.sync.set(data)

	removeSelection()
	setGridAreas(data.move[data.move.column].grid)
	setAllAligns({
		quicklinks: '',
		main: '',
		time: '',
		notes: '',
		searchbar: '',
		quotes: '',
	})
}

function elementSelection(move: Sync.Move, select: string) {
	removeSelection()

	// Remove selection modifiers and quit if failed to get id
	if (!isEditing() || !select) {
		return
	}

	widget = select as Widgets

	alignButtons(move[move.column][widget])
	spanButtons(widget)
	gridButtons(widget)

	document.getElementById('move-overlay-' + widget)!.classList.add('selected')
	document.getElementById('element-mover')?.classList.add('active')
}

function toggleMoveStatus(data: Sync.Storage) {
	const b_editmove = document.getElementById('b_editmove') as HTMLButtonElement
	const isEditing = dominterface?.classList.contains('move-edit')

	if (isEditing) {
		b_editmove.textContent = tradThis('Open')
		removeOverlay()
	} else {
		b_editmove.textContent = tradThis('Close')
		getWidgetsStorage(data).forEach((id) => addOverlay(id))
	}

	const mover = document.getElementById('element-mover')
	mover?.classList.toggle('hidden')
	mover?.classList.remove('active')
	dominterface?.classList.toggle('move-edit')
	removeSelection()
}

function toggleGridSpans(move: Sync.Move, dir: 'col' | 'row') {
	if (!widget) {
		return
	}

	const grid = gridParse(move[move.column].grid)
	const gridWithSpan = spansInGridArea(grid, widget, { toggle: dir })

	move[move.column].grid = gridStringify(gridWithSpan)
	storage.sync.set({ move: move })

	setGridAreas(move[move.column].grid)
	gridButtons(widget)
	spanButtons(widget)
}

function pageWidthOverlay(move: Sync.Move, overlay?: boolean) {
	const isEditing = document.getElementById('interface')?.classList?.contains('move-edit')
	const hasOverlays = document.querySelector('.move-overlay')

	if (!isEditing && overlay === false) {
		removeOverlay()
		return
	}

	if (!hasOverlays) {
		for (const id of getGridWidgets(move[move.column].grid)) {
			addOverlay(id as Widgets)
		}
	}
}
