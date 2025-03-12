import { toolboxEvents, alignButtons, gridButtons, layoutButtons, resetButton, spanButtons, showSpanButtons } from './toolbox'
import { setAlign, addOverlay, removeOverlay, setGridAreas, setAllAligns, removeSelection, interfaceFade } from './dom'
import toggleWidget, { toggleWidgetInSettings, toggleWidgetOnInterface } from './widgets'
import { SYNC_DEFAULT } from '../../defaults'
import onSettingsLoad from '../../utils/onsettingsload'
import transitioner from '../../utils/transitioner'
import { tradThis } from '../../utils/translations'
import storage from '../../storage'

import {
	isEditing,
	isRowEmpty,
	gridFind,
	gridParse,
	gridStringify,
	spansInGridArea,
	addGridWidget,
	updateWidgetsStorage,
	getGridWidgets,
	getWidgetsStorage,
	getLayout,
} from './helpers'

type UpdateMove = {
	widget?: [Widgets, boolean]
	span?: 'col' | 'row'
	reset?: true
	toggle?: boolean
	box?: string
	text?: string
	layout?: string
	select?: string
	overlay?: boolean
	grid?: {
		x?: string
		y?: string
	}
}

const dominterface = document.querySelector<HTMLElement>('#interface')
let widget: Widgets | undefined

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
		const { grid, items } = getLayout(init)

		setAllAligns(items)
		setGridAreas(gridStringify(grid))
		onSettingsLoad(() => {
			toolboxEvents()
			showSpanButtons(init.selection)
		})
	}
}

export async function updateMoveElement(event: UpdateMove) {
	const data = await storage.sync.get()

	if (!data.move) data.move = structuredClone(SYNC_DEFAULT.move)

	if (event.grid) gridChange(data.move, event.grid)
	if (event.span) toggleGridSpans(data.move, event.span)
	if (event.layout) layoutChange(data, event.layout)
	if (event.reset) layoutReset(data)
	if (event.widget) toggleWidget(data, event.widget)
	if (event.select) elementSelection(data.move, event.select)
	if (event.box !== undefined) alignChange(data.move, event.box, 'box')
	if (event.text !== undefined) alignChange(data.move, event.text, 'text')
	if (event.toggle !== undefined) toggleMoveStatus(data, event.toggle)
	if (event.overlay !== undefined) pageWidthOverlay(data.move, event.overlay)
}

function gridChange(move: Sync.Move, gridpos: { x?: string; y?: string }) {
	if (!widget) return

	// Get button move amount
	const y = Number.parseInt(gridpos?.y || '0')
	const x = Number.parseInt(gridpos?.x || '0')

	const layout = getLayout(move)
	const positions = gridFind(layout.grid, widget)
	const affectedIds: Widgets[] = []
	let grid = layout.grid

	// step 0: Adds new line
	const isGridOverflowing = positions.some(([col]) => grid[col + y] === undefined)

	if (isGridOverflowing) {
		if (move.selection === 'single') grid.push(['.'])
		if (move.selection === 'double') grid.push(['.', '.'])
		if (move.selection === 'triple') grid.push(['.', '.', '.'])
	}

	// step 1: Find elements affected by grid change
	positions.forEach(([col, row]) => {
		const newposition = grid[row + y][col + x]

		if (newposition !== '.') {
			affectedIds.push(newposition as Widgets)
		}
	})

	// step 2: remove conflicting fillings on affected elements
	affectedIds.forEach((id) => {
		if (gridFind(grid, id).length > 1) {
			grid = spansInGridArea(grid, id, { remove: true })
		}
	})

	// step 3: replace all active position with affected
	positions.forEach(([col, row]) => {
		const newRow = Math.min(Math.max(row + y, 0), grid.length - 1)
		const newCol = Math.min(Math.max(col + x, 0), grid[0].length - 1)

		const tempItem = grid[row][col]
		grid[row][col] = grid[newRow][newCol]
		grid[newRow][newCol] = tempItem
	})

	// step 4: remove empty lines
	grid.forEach((_, i) => {
		if (isRowEmpty(grid, i)) {
			grid.splice(i, 1)
		}
	})

	// step 5: profit ??????????????
	layout.grid = grid
	move.layouts[move.selection] = layout
	storage.sync.set({ move: move })

	setGridAreas(grid)
	gridButtons(widget)
}

function alignChange(move: Sync.Move, value: string, type: 'box' | 'text') {
	if (!widget) {
		return
	}

	const layout = getLayout(move)
	const align = layout.items[widget] ?? { box: '', text: '' }

	if (type === 'box') align.box = value
	if (type === 'text') align.text = value

	layout.items[widget] = align
	move.layouts[move.selection] = layout
	storage.sync.set({ move: move })

	alignButtons(align)
	setAlign(widget, align)
}

function layoutChange(data: Sync.Storage, column: string) {
	if (column === data.move.selection) {
		return
	}

	// Only update selection if coming from user
	if (column === 'single' || column === 'double' || column === 'triple') {
		data.move.selection = column
	}

	const layout = getLayout(data)
	const widgetsInGrid = getGridWidgets(gridStringify(layout.grid))

	const list: [Widgets, boolean][] = [
		['time', widgetsInGrid.includes('time')],
		['main', widgetsInGrid.includes('main')],
		['notes', widgetsInGrid.includes('notes')],
		['quotes', widgetsInGrid.includes('quotes')],
		['searchbar', widgetsInGrid.includes('searchbar')],
		['quicklinks', widgetsInGrid.includes('quicklinks')],
	]

	data = updateWidgetsStorage(list, data)
	storage.sync.set(data)

	const interfaceTransition = transitioner()

	interfaceTransition.first(() => {
		interfaceFade('out')
	})

	interfaceTransition.then(async () => {
		const layout = getLayout(data)
		setAllAligns(layout.items)
		setGridAreas(layout.grid)
		layoutButtons(data.move.selection)
		showSpanButtons(data.move.selection)
		removeSelection()

		toggleWidgetInSettings(list)
		toggleWidgetOnInterface(list)

		if (widget) {
			gridButtons(widget)
			alignButtons(layout.items[widget])
		}
	})

	interfaceTransition.finally(() => {
		interfaceFade('in')
	})

	interfaceTransition.transition(200)
}

function layoutReset(data: Sync.Storage) {
	const enabledWidgets = getWidgetsStorage(data)
	let grid = ''

	if (resetButton() === false) {
		return
	}

	enabledWidgets.forEach((id) => {
		grid = addGridWidget(grid, id, data.move.selection)
	})

	data.move.layouts[data.move.selection] = {
		grid: gridParse(grid),
		items: {},
	}

	storage.sync.set(data)

	removeSelection()
	setGridAreas(grid)
	setAllAligns({
		quicklinks: undefined,
		main: undefined,
		time: undefined,
		notes: undefined,
		searchbar: undefined,
		quotes: undefined,
	})
}

function elementSelection(move: Sync.Move, select: string) {
	removeSelection()

	// Remove selection modifiers and quit if failed to get id
	if (!isEditing() || !select) {
		return
	}

	widget = select as Widgets

	alignButtons(getLayout(move).items[widget])
	spanButtons(widget)
	gridButtons(widget)

	document.getElementById('move-overlay-' + widget)!.classList.add('selected')
	document.getElementById('element-mover')?.classList.add('active')
}

function toggleMoveStatus(data: Sync.Storage, force?: boolean) {
	const mover = document.getElementById('element-mover') as HTMLElement
	const b_editmove = document.getElementById('b_editmove') as HTMLButtonElement
	const isEditing = dominterface?.classList.contains('move-edit')
	const hasOverlay = document.querySelector('.move-overlay') === null

	const state = force ?? !isEditing

	if (!state) {
		b_editmove.textContent = tradThis('Open')
		dominterface?.classList.remove('move-edit')
		mover.classList.add('hidden')
		removeOverlay()
	}
	//
	else if (hasOverlay) {
		b_editmove.textContent = tradThis('Close')
		dominterface?.classList.add('move-edit')
		mover.classList.remove('hidden')
		getWidgetsStorage(data).forEach((id) => addOverlay(id))
	}

	mover?.classList.remove('active')
	removeSelection()
}

function toggleGridSpans(move: Sync.Move, dir: 'col' | 'row') {
	if (!widget) {
		return
	}

	const layout = getLayout(move)
	const gridWithSpan = spansInGridArea(layout.grid, widget, { toggle: dir })

	move.layouts[move.selection] = {
		items: layout.items,
		grid: gridWithSpan,
	}

	storage.sync.set({ move: move })

	setGridAreas(gridWithSpan)
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
		const layout = getLayout(move)
		const grid = gridStringify(layout.grid)
		const ids = getGridWidgets(grid)

		for (const id of ids) {
			addOverlay(id as Widgets)
		}
	}
}
