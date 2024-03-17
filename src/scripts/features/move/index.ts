import moverToolboxEvents from './toolbox'
import { SYNC_DEFAULT } from '../../defaults'
import onSettingsLoad from '../../utils/onsettingsload'
import transitioner from '../../utils/transitioner'
import { tradThis } from '../../utils/translations'
import toggleWidget from './widgets'
import storage from '../../storage'
import {
	setAlign,
	gridOverlay,
	setGridAreas,
	setAllAligns,
	buttonControl,
	removeSelection,
	interfaceFadeIn,
	interfaceFadeOut,
	manageGridSpanner,
	resetButtonConfirm,
} from './dom'
import {
	gridWidget,
	isEditing,
	isRowEmpty,
	findIdPositions,
	spansInGridArea,
	widgetStatesToData,
	getEnabledWidgetsFromGrid,
	getEnabledWidgetsFromStorage,
	areaStringToLayoutGrid,
	layoutToGridAreas,
	alignParse,
	alignStringify,
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

// {
// 	"move": {
// 		"single": {
// 			"grid": "'time' 'main' 'quicklinks'",
// 			"time": "bottom text-left",
// 			"main": "top text-left"
// 		},
// 		"double": {
// 			"grid": "'. time' 'quotes main' '. quicklinks'",
// 			"time": "bottom-left left",
// 			"main": "top-left left"
// 		},
// 		"column": "single"
// 	}
// }

const dominterface = document.querySelector<HTMLElement>('#interface')

let smallWidth = false
let selectedWidget: Widgets | 'none'

export default function moveElements(init?: Sync.Move, events?: UpdateMove) {
	if (!init && !events) {
		updateMoveElement({ reset: true })
		return
	}

	// Events coming from settings menu
	if (events) {
		if (typeof events.overlay === 'boolean') updateMoveElement({ overlay: events.overlay })
		if (events?.widget) updateMoveElement({ widget: events.widget })
		if (events?.select) updateMoveElement({ select: events.select })
		if (events?.layout) updateMoveElement({ layout: events.layout })
		if (events?.toggle) updateMoveElement({ toggle: true })
		if (events?.reset) updateMoveElement({ reset: true })
		return
	}

	// Init events coming from mover toolbox
	onSettingsLoad(moverToolboxEvents)

	if (init) {
		setAllAligns(init[init.column])
		setGridAreas(init[init.column]?.grid)
	}
}

export async function updateMoveElement(event: UpdateMove) {
	const data = await storage.sync.get()

	if (!data.move) {
		data.move = structuredClone(SYNC_DEFAULT.move)
	}

	if (smallWidth) {
		data.move.column = 'single'
	}

	if (event.grid) {
		gridChange(data.move, event.grid)
	}

	if (event.span) {
		toggleGridSpans(data.move, event.span)
	}

	if (event.box !== undefined) {
		alignChange(data.move, event.box, 'box')
	}

	if (event.text !== undefined) {
		alignChange(data.move, event.text, 'text')
	}

	if (event.layout) {
		layoutChange(data, event.layout)
	}

	if (event.reset) {
		layoutReset(data)
	}

	if (event.overlay) {
		pageWidthOverlay(data.move, event.overlay)
	}

	if (event?.toggle) {
		toggleMoveStatus(data)
	}

	if (event?.select) {
		elementSelection(data.move, event.select)
	}

	if (event?.widget) {
		toggleWidget(data, event.widget)
	}
}

function gridChange(move: Sync.Move, gridpos: { x?: string; y?: string }) {
	if (!selectedWidget) return

	// Get button move amount
	const y = parseInt(gridpos?.y || '0')
	const x = parseInt(gridpos?.x || '0')

	let grid = areaStringToLayoutGrid(move[move.column]?.grid ?? '')
	const allActivePos = findIdPositions(grid, selectedWidget)
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
		if (findIdPositions(grid, id).length > 1) {
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
	const areas = layoutToGridAreas(grid)
	const column = move.column

	buttonControl.grid(selectedWidget)
	setGridAreas(areas)

	storage.sync.set({
		move: {
			...move,
			[column]: {
				...move[column],
				grid: areas,
			},
		},
	})
}

function alignChange(move: Sync.Move, value: string, type: 'box' | 'text') {
	const column = move[move.column]
	const widget = activeID()

	if (!column || widget === 'none') {
		return
	}

	const align = alignParse(column[widget])

	if (type === 'box') align.box = value
	if (type === 'text') align.text = value

	column[widget] = alignStringify(align)
	move[move.column] = column
	storage.sync.set({ move: move })

	buttonControl.align(column[widget])
	setAlign(widget, align)
}

function layoutChange(data: Sync.Storage, column: string) {
	// Only update selection if coming from user
	if (column === 'single' || column === 'double' || column === 'triple') {
		data.move.column = column
	}

	// Assign layout after mutating move
	const layout = data.move[data.move.column]
	const widget = activeID()

	if (!layout || widget === 'none') {
		return
	}

	const widgetsInGrid = getEnabledWidgetsFromGrid(layout.grid)

	const list: [Widgets, boolean][] = [
		['time', widgetsInGrid.includes('time')],
		['main', widgetsInGrid.includes('main')],
		['notes', widgetsInGrid.includes('notes')],
		['quotes', widgetsInGrid.includes('quotes')],
		['searchbar', widgetsInGrid.includes('searchbar')],
		['quicklinks', widgetsInGrid.includes('quicklinks')],
	]

	// Update storage
	const states = widgetStatesToData(list, data)
	storage.sync.set({ ...states, move: data.move })

	const interfaceTransition = transitioner()

	interfaceTransition.first(() => {
		interfaceFadeOut()
	})

	interfaceTransition.then(async () => {
		setAllAligns(layout)
		setGridAreas(layout.grid)
		buttonControl.layout(data.move.column)
		manageGridSpanner(data.move.column)
		removeSelection()

		// Toggle overlays if we are editing
		if (dominterface?.classList.contains('move-edit')) {
			gridOverlay.removeAll()
			widgetsInGrid.forEach((id) => gridOverlay.add(id))
		}

		if (widget) {
			buttonControl.grid(widget)
			buttonControl.align(layout[widget])
		}
	})

	interfaceTransition.finally(interfaceFadeIn)
	interfaceTransition.transition(200)
}

function layoutReset(data: Sync.Storage) {
	const layout = data.move[data.move.column]
	const enabledWidgets = getEnabledWidgetsFromStorage(data)
	let grid: string[][] = []

	if (resetButtonConfirm() === false || !layout) {
		return
	}

	enabledWidgets.forEach((id) => {
		grid = gridWidget(grid, data.move.column, id, true)
	})

	data.move[data.move.column] = { grid: layoutToGridAreas(grid) }
	storage.sync.set(data)

	removeSelection()
	setGridAreas(layout.grid)
	buttonControl.title()
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
	const column = move[move.column]

	removeSelection()

	// Remove selection modifiers and quit if failed to get id
	if (!isEditing() || !select || !column) return

	const widget = select as Widgets

	buttonControl.align(column[widget])
	buttonControl.span(widget)
	buttonControl.grid(widget)
	buttonControl.title(widget)

	document.getElementById('move-overlay-' + widget)!.classList.add('selected')
	document.getElementById('element-mover')?.classList.add('active')

	activeID(widget)
}

function toggleMoveStatus(data: Sync.Storage) {
	const b_editmove = document.getElementById('b_editmove') as HTMLButtonElement
	const isEditing = dominterface?.classList.contains('move-edit')

	if (isEditing) {
		b_editmove.textContent = tradThis('Open')
		gridOverlay.removeAll()
	} else {
		b_editmove.textContent = tradThis('Close')
		buttonControl.layout(data.move.column)
		const ids = getEnabledWidgetsFromStorage(data)
		ids.forEach((id) => gridOverlay.add(id))
	}

	const mover = document.getElementById('element-mover')
	mover?.classList.toggle('hidden')
	mover?.classList.remove('active')
	dominterface?.classList.toggle('move-edit')
	removeSelection()
}

function toggleGridSpans(move: Sync.Move, dir: 'col' | 'row') {
	const widget = activeID()
	const layout = move[move.column]

	if (widget === 'none' || !layout) {
		return
	}

	const grid = areaStringToLayoutGrid(layout?.grid)
	const gridWithSpan = spansInGridArea(grid, widget, { toggle: dir })

	layout.grid = layoutToGridAreas(gridWithSpan)
	move[move.column] = layout
	storage.sync.set({ move: move })

	setGridAreas(layout.grid)
	buttonControl.grid(widget)
	buttonControl.span(widget)
}

function pageWidthOverlay(move: Sync.Move, overlay?: boolean) {
	const isEditing = document.getElementById('interface')?.classList?.contains('move-edit')
	const hasOverlays = document.querySelector('.move-overlay')
	const layout = move[move.column]

	if (!layout || (!isEditing && overlay === false)) {
		gridOverlay.removeAll()
		return
	}

	if (!hasOverlays) {
		const widgets = getEnabledWidgetsFromGrid(layout.grid)

		widgets.forEach((id) => {
			gridOverlay.add(id as Widgets)
		})
	}
}

export function activeID(id?: Widgets | 'none'): Widgets | 'none' {
	if (id !== undefined) {
		selectedWidget = id
	}

	return selectedWidget
}
