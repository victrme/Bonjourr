import { addOverlay, removeOverlay, removeSelection, setAlign, setAllAligns, setGridAreas } from './dom.ts'
import { toggleWidget } from './widgets.ts'
import { SYNC_DEFAULT } from '../../defaults.ts'
import { tradThis } from '../../utils/translations.ts'
import { storage } from '../../storage.ts'

import {
	addGridWidget,
	getGridWidgets,
	getWidgetsStorage,
	gridParse,
	gridStringify,
	spansInGridArea,
} from './helpers.ts'

import type { SimpleMove, SimpleMoveHorizontal, SimpleMoveText, SimpleMoveVertical, Sync } from '../../../types/sync.ts'
import type { WidgetName } from '../../../types/shared.ts'
import type { Direction } from './helpers.ts'
import { gridChange } from './change.ts'

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
	direction?: Direction
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
		if (event.direction) {
			gridChange(data.move, event.id, event.direction)
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

function alignChange(moveData: SimpleMove, widgetId: WidgetName, options: AlignChangeOptions) {
	if (isHorizontalAlign(options.horizontal)) {
		moveData.widgets[widgetId].horizontal = options.horizontal
	}

	if (isVerticalAlign(options.vertical)) {
		moveData.widgets[widgetId].vertical = options.vertical
	}

	if (isTextAlign(options.text)) {
		moveData.widgets[widgetId].text = options.text
	}

	storage.sync.set({ move: moveData })

	setAlign(widgetId, moveData.widgets[widgetId])
}

function layoutReset(syncData: Sync) {
	const enabledWidgets = getWidgetsStorage(syncData)
	let gridString = ''

	for (const widgetId of enabledWidgets) {
		gridString = addGridWidget(gridString, widgetId)
	}

	syncData.move = {
		grid: gridParse(gridString),
		widgets: structuredClone(SYNC_DEFAULT.move.widgets),
	}

	storage.sync.set(syncData)

	removeSelection()
	setGridAreas(gridString)

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

function toggleMoveStatus(syncData: Sync, forceState?: boolean) {
	const bEditmove = document.getElementById('b_editmove') as HTMLButtonElement
	const isEditing = dominterface?.classList.contains('move-edit')
	const hasOverlay = document.querySelector('.move-overlay') === null

	const state = forceState ?? !isEditing

	if (!state) {
		bEditmove.textContent = tradThis('Open')
		dominterface?.classList.remove('move-edit')
		removeOverlay()
	} else if (hasOverlay) {
		bEditmove.textContent = tradThis('Close')
		dominterface?.classList.add('move-edit')

		for (const widgetId of getWidgetsStorage(syncData)) {
			addOverlay(widgetId)
		}
	}

	removeSelection()
}

function toggleGridSpans(moveData: SimpleMove, direction: 'col' | 'row') {
	if (!widget) {
		return
	}

	const gridWithSpan = spansInGridArea(moveData.grid, widget, { toggle: direction })

	moveData.grid = gridWithSpan

	storage.sync.set({ move: moveData })

	setGridAreas(gridWithSpan)
}

function pageWidthOverlay(moveData: SimpleMove, isOverlayEnabled?: boolean) {
	const isEditing = document.getElementById('interface')?.classList?.contains('move-edit')
	const hasOverlays = document.querySelector('.move-overlay')

	if (!isEditing && isOverlayEnabled === false) {
		removeOverlay()
		return
	}

	if (!hasOverlays) {
		const gridArea = gridStringify(moveData.grid)
		const widgetIds = getGridWidgets(gridArea)

		for (const widgetId of widgetIds) {
			addOverlay(widgetId as WidgetName)
		}
	}
}

function isWidget(widgetName = ''): widgetName is WidgetName {
	return ['time', 'main', 'quicklinks', 'notes', 'quotes', 'searchbar', 'pomodoro'].includes(widgetName)
}

function isHorizontalAlign(alignValue = ''): alignValue is SimpleMoveHorizontal {
	return ['center', 'left', 'right'].includes(alignValue)
}

function isVerticalAlign(alignValue = ''): alignValue is SimpleMoveVertical {
	return ['baseline', 'center', 'end'].includes(alignValue)
}

function isTextAlign(alignValue = ''): alignValue is SimpleMoveText {
	return ['center', 'left', 'right'].includes(alignValue)
}
