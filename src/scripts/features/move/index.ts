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
} from './helpers'

type Key = Sync.Move.Key
type Move = Sync.Storage['move']

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

let smallWidth = false
let selectedIdInGrid: Key | null

export default function moveElements(init?: Move, events?: UpdateMove) {
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
		const layout = init.layouts[init.selection]
		manageGridSpanner(init.selection)
		setAllAligns(layout.items)
		setGridAreas(layout.grid)
	}
}

export async function updateMoveElement(event: UpdateMove) {
	const data = await storage.sync.get()

	if (!data.move) {
		data.move = structuredClone(SYNC_DEFAULT.move)
	}

	if (smallWidth) {
		data.move.selection = 'single'
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

function gridChange(move: Move, gridpos: { x?: string; y?: string }) {
	if (!selectedIdInGrid) return

	// Get button move amount
	const y = parseInt(gridpos?.y || '0')
	const x = parseInt(gridpos?.x || '0')

	let grid = move.layouts[move.selection].grid
	const allActivePos = findIdPositions(grid, selectedIdInGrid)
	const allAffectedIds: Key[] = []

	// step 0: Adds new line
	const isGridOverflowing = allActivePos.some(({ posRow }) => grid[posRow + y] === undefined)

	if (isGridOverflowing) {
		// dangerous typing /!!!\
		if (move.selection === 'single') grid.push(['.'])
		if (move.selection === 'double') grid.push(['.', '.'])
		if (move.selection === 'triple') grid.push(['.', '.', '.'])
	}

	// step 1: Find elements affected by grid change
	allActivePos.forEach(({ posRow, posCol }) => {
		const newposition = grid[posRow + y][posCol + x]

		if (newposition !== '.') {
			allAffectedIds.push(newposition as Key)
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
	setGridAreas(move.layouts[move.selection].grid)
	move.layouts[move.selection].grid = grid

	buttonControl.grid(selectedIdInGrid)

	storage.sync.set({ move: move })
}

function alignChange(move: Move, value: string, type: 'box' | 'text') {
	if (!selectedIdInGrid) return

	const layout = move.layouts[move.selection]
	const item = layout.items[selectedIdInGrid] || { box: '', text: '' }

	item[type] = value || ''

	setAlign(selectedIdInGrid, item)
	buttonControl.align(item)

	// Update storage
	move.layouts[move.selection].items[selectedIdInGrid] = item
	storage.sync.set({ move: move })
}

function layoutChange(data: Sync.Storage, sel: string) {
	// Only update selection if coming from user
	if (sel === 'single' || sel === 'double' || sel === 'triple') {
		data.move.selection = sel
	}

	// Assign layout after mutating move
	const layout = data.move.layouts[data.move.selection]
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
		setAllAligns(layout.items)
		setGridAreas(layout.grid)
		buttonControl.layout(data.move.selection)
		manageGridSpanner(data.move.selection)
		removeSelection()

		// Toggle overlays if we are editing
		if (dominterface?.classList.contains('move-edit')) {
			gridOverlay.removeAll()
			widgetsInGrid.forEach((id) => gridOverlay.add(id))
		}

		if (selectedIdInGrid) {
			buttonControl.grid(selectedIdInGrid)
			buttonControl.align(layout.items[selectedIdInGrid])
		}
	})

	interfaceTransition.finally(interfaceFadeIn)
	interfaceTransition.transition(200)
}

function layoutReset(data: Sync.Storage) {
	if (resetButtonConfirm() === false) {
		return
	}

	const layout = data.move.layouts[data.move.selection]
	const enabled = getEnabledWidgetsFromStorage(data)
	let grid: typeof layout.grid = []

	enabled.forEach((id) => {
		grid = gridWidget(grid, data.move.selection, id, true)
	})

	data.move.layouts[data.move.selection].grid = grid
	data.move.layouts[data.move.selection].items = {}

	removeSelection()
	setGridAreas(layout.grid)
	buttonControl.title()

	// Reset aligns
	setAllAligns({
		quicklinks: { box: '', text: '' },
		main: { box: '', text: '' },
		time: { box: '', text: '' },
		notes: { box: '', text: '' },
		searchbar: { box: '', text: '' },
		quotes: { box: '', text: '' },
	})

	// Save
	storage.sync.set(data)
}

function elementSelection(move: Move, select: string) {
	const layout = move.layouts[move.selection]

	removeSelection()

	// Remove selection modifiers and quit if failed to get id
	if (!isEditing() || !select) return

	const id = select as Key

	buttonControl.align(layout.items[id])
	buttonControl.span(id)
	buttonControl.grid(id)
	buttonControl.title(id)

	document.getElementById('move-overlay-' + id)!.classList.add('selected')
	document.getElementById('element-mover')?.classList.add('active')

	activeID(id)
}

function toggleMoveStatus(data: Sync.Storage) {
	const b_editmove = document.getElementById('b_editmove') as HTMLButtonElement
	const isEditing = dominterface?.classList.contains('move-edit')

	if (isEditing) {
		b_editmove.textContent = tradThis('Open')
		gridOverlay.removeAll()
	} else {
		b_editmove.textContent = tradThis('Close')
		buttonControl.layout(data.move.selection)
		const ids = getEnabledWidgetsFromStorage(data)
		ids.forEach((id) => gridOverlay.add(id))
	}

	const mover = document.getElementById('element-mover')
	mover?.classList.toggle('hidden')
	mover?.classList.remove('active')
	dominterface?.classList.toggle('move-edit')
	removeSelection()
}

function toggleGridSpans(move: Move, dir: 'col' | 'row') {
	if (!selectedIdInGrid) return

	const layout = move.layouts[move.selection]
	layout.grid = spansInGridArea(layout.grid, selectedIdInGrid, { toggle: dir })

	setGridAreas(layout.grid)
	buttonControl.grid(selectedIdInGrid)
	buttonControl.span(selectedIdInGrid)

	storage.sync.set({ move: move })
}

function pageWidthOverlay(move: Move, overlay?: boolean) {
	const isEditing = document.getElementById('interface')?.classList?.contains('move-edit')
	const hasOverlays = document.querySelector('.move-overlay')

	if (!isEditing && overlay === false) {
		gridOverlay.removeAll()
		return
	}

	if (!hasOverlays) {
		const grid = move.layouts[move.selection].grid
		const widgets = getEnabledWidgetsFromGrid(grid)

		widgets.forEach((id) => {
			gridOverlay.add(id as Key)
		})
	}
}

export function activeID(id?: Key | null): Key | null {
	if (id !== undefined) {
		selectedIdInGrid = id
	}

	return selectedIdInGrid
}
