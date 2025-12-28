import { addOverlay, removeOverlay, removeSelection, setAlign, setAllAligns, setGridAreas } from './dom.ts'
import { toggleWidget } from './widgets.ts'
import { SYNC_DEFAULT } from '../../defaults.ts'
import { tradThis } from '../../utils/translations.ts'
import { storage } from '../../storage.ts'

import {
	addGridWidget,
	getGridWidgets,
	getWidgetsStorage,
	gridFind,
	gridParse,
	gridStringify,
	isRowEmpty,
	spansInGridArea,
} from './helpers.ts'

import type {
	Move,
	SimpleMove,
	SimpleMoveHorizontal,
	SimpleMoveText,
	SimpleMoveVertical,
	Sync,
} from '../../../types/sync.ts'
import type { WidgetName } from '../../../types/shared.ts'

interface UpdateMove {
	id?: string
	widget?: [WidgetName, boolean]
	span?: 'col' | 'row'
	reset?: true
	toggle?: boolean
	text?: string
	vertical?: string
	horizontal?: string
	overlay?: boolean
	grid?: {
		x?: string
		y?: string
	}
}

interface AlignChangeOptions {
	horizontal?: string
	vertical?: string
	text?: string
}

const dominterface = document.querySelector<HTMLElement>('#interface')
let widget: WidgetName | undefined

export function moveElements(init?: SimpleMove, events?: UpdateMove) {
	if (!(init || events)) {
		updateMoveElement({ reset: true })
		return
	}

	if (events) {
		updateMoveElement(events)
		return
	}

	if (init) {
		setAllAligns(init.widgets)
		setGridAreas(init.grid)
	}
}

export async function updateMoveElement(event: UpdateMove) {
	const data = await storage.sync.get()

	if (!data.move) {
		data.move = structuredClone(SYNC_DEFAULT.move)
	}

	if (event.reset) {
		layoutReset(data)
	}
	if (event.toggle !== undefined) {
		toggleMoveStatus(data, event.toggle)
	}
	if (event.overlay !== undefined) {
		pageWidthOverlay(data.move, event.overlay)
	}

	if (isWidget(event.id)) {
		if (event.widget) {
			toggleWidget(data, event.widget)
		}
		if (event.grid) {
			gridChange(data.move, event.grid)
		}
		if (event.span) {
			toggleGridSpans(data.move, event.span)
		}
		if (event.horizontal !== undefined) {
			alignChange(data.move, event.id, { horizontal: event.horizontal })
		}
		if (event.vertical !== undefined) {
			alignChange(data.move, event.id, { vertical: event.vertical })
		}
		if (event.text !== undefined) {
			alignChange(data.move, event.id, { text: event.text })
		}
	}
}

function gridChange(move: SimpleMove, gridpos: { x?: string; y?: string }) {
	if (!widget) {
		return
	}

	// Get button move amount
	const y = Number.parseInt(gridpos?.y || '0')
	const x = Number.parseInt(gridpos?.x || '0')

	const positions = gridFind(move.grid, widget)
	const affectedIds: WidgetName[] = []

	// step 0: Adds new line
	const isGridOverflowing = positions.some(([col]) => move.grid[col + y] === undefined)

	if (isGridOverflowing) {
		const columAmount = move.grid[0].length
		const newRow = (new Array(columAmount)).fill('.')

		move.grid.push(newRow)
	}

	// step 1: Find elements affected by grid change
	for (const [col, row] of positions) {
		const newposition = move.grid[row + y][col + x]

		if (newposition !== '.') {
			affectedIds.push(newposition as WidgetName)
		}
	}

	// step 2: remove conflicting fillings on affected elements
	for (const id of affectedIds) {
		if (gridFind(move.grid, id).length > 1) {
			move.grid = spansInGridArea(move.grid, id, { remove: true })
		}
	}

	// step 3: replace all active position with affected
	for (const [col, row] of positions) {
		const newRow = Math.min(Math.max(row + y, 0), move.grid.length - 1)
		const newCol = Math.min(Math.max(col + x, 0), move.grid[0].length - 1)

		const tempItem = move.grid[row][col]
		move.grid[row][col] = move.grid[newRow][newCol]
		move.grid[newRow][newCol] = tempItem
	}

	// step 4: remove empty lines
	for (let i = 0; i < move.grid.length; i++) {
		if (isRowEmpty(move.grid, i)) {
			move.grid.splice(i, 1)
		}
	}

	// step 5: profit ??????????????
	storage.sync.set({ move: move })

	setGridAreas(move.grid)
}

function alignChange(move: SimpleMove, id: WidgetName, options: AlignChangeOptions) {
	if (isHorizontalAlign(options.horizontal)) {
		move.widgets[id].horizontal = options.horizontal
	}
	if (isVerticalAlign(options.vertical)) {
		move.widgets[id].vertical = options.vertical
	}
	if (isTextAlign(options.text)) {
		move.widgets[id].text = options.text
	}

	storage.sync.set({ move: move })

	setAlign(id, move.widgets[id])
}

function layoutReset(data: Sync) {
	const enabledWidgets = getWidgetsStorage(data)
	let grid = ''

	for (const id of enabledWidgets) {
		grid = addGridWidget(grid, id)
	}

	data.move = {
		grid: gridParse(grid),
		widgets: structuredClone(SYNC_DEFAULT.move.widgets),
	}

	storage.sync.set(data)

	removeSelection()
	setGridAreas(grid)
	setAllAligns({
		time: {},
		main: {},
		notes: {},
		quotes: {},
		pomodoro: {},
		searchbar: {},
		quicklinks: {},
	})
}

function toggleMoveStatus(data: Sync, force?: boolean) {
	const bEditmove = document.getElementById('b_editmove') as HTMLButtonElement
	const isEditing = dominterface?.classList.contains('move-edit')
	const hasOverlay = document.querySelector('.move-overlay') === null

	const state = force ?? !isEditing

	if (!state) {
		bEditmove.textContent = tradThis('Open')
		dominterface?.classList.remove('move-edit')
		removeOverlay()
	} //
	else if (hasOverlay) {
		bEditmove.textContent = tradThis('Close')
		dominterface?.classList.add('move-edit')
		for (const id of getWidgetsStorage(data)) {
			addOverlay(id)
		}
	}

	removeSelection()
}

function toggleGridSpans(move: Move, dir: 'col' | 'row') {
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
}

function pageWidthOverlay(move: Move, overlay?: boolean) {
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
			addOverlay(id as WidgetName)
		}
	}
}

function isWidget(str = ''): str is WidgetName {
	return ['time', 'main', 'quicklinks', 'notes', 'quotes', 'searchbar', 'pomodoro'].includes(str)
}
function isHorizontalAlign(str = ''): str is SimpleMoveHorizontal {
	return ['center', 'left', 'right'].includes(str)
}
function isVerticalAlign(str = ''): str is SimpleMoveVertical {
	return ['baseline', 'center', 'end'].includes(str)
}
function isTextAlign(str = ''): str is SimpleMoveText {
	return ['center', 'left', 'right'].includes(str)
}
