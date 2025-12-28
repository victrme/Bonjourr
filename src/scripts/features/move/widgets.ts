import { addOverlay, interfaceFade, removeOverlay, removeSelection, setAllAligns, setGridAreas } from './dom.ts'
import { transitioner } from '../../utils/transitioner.ts'
import { storage } from '../../storage.ts'
import { weather } from '../weather/index.ts'
import {
	addGridWidget,
	gridParse,
	gridStringify,
	isEditing,
	removeGridWidget,
	updateWidgetsStorage,
} from './helpers.ts'

import type { WidgetName } from '../../../types/shared.ts'
import type { Sync } from '../../../types/sync.ts'

export function toggleWidget(data: Sync, widget: [WidgetName, boolean]) {
	if (!widget) {
		return
	}

	const [id, on] = widget
	const gridToggle = on ? addGridWidget : removeGridWidget
	const interfaceTransition = transitioner()
	const selection = sessionStorage.selectedWidget
	const grid = gridParse(gridToggle(gridStringify(data.move.grid), id, selection))

	const newdata = updateWidgetsStorage([widget], data)
	storage.sync.set(newdata)

	interfaceTransition.first(() => {
		toggleWidgetInSettings([[id, on]])
		interfaceFade('out')
	})

	interfaceTransition.after(() => {
		setGridAreas(data.move.grid)
		setAllAligns(data.move.widgets)
		toggleWidgetOnInterface([[id, on]])
		removeSelection()

		// add/remove widget overlay only when editing move
		if (isEditing()) {
			on ? addOverlay(id) : removeOverlay(id)
		}

		// Apply weather if re-enabled
		if (id === 'main' && on === true) {
			storage.local.get('lastWeather').then((local) => {
				weather({ sync: newdata, lastWeather: local.lastWeather })
			})
		}
	})

	interfaceTransition.finally(() => {
		interfaceFade('in')
	})

	interfaceTransition.transition(200)
}

export function toggleWidgetInSettings(states: [WidgetName, boolean][]) {
	const inputids: Record<WidgetName, string> = {
		time: 'i_time',
		main: 'i_main',
		quicklinks: 'i_quicklinks',
		notes: 'i_notes',
		quotes: 'i_quotes',
		pomodoro: 'i_pomodoro',
		searchbar: 'i_sb',
	}

	for (const [widget, on] of states) {
		const input = document.getElementById(inputids[widget]) as HTMLInputElement
		const option = document.getElementById(`${widget}_options`)

		option?.classList.toggle('shown', on)
		input.checked = on
	}
}

export function toggleWidgetOnInterface(states: [WidgetName, boolean][]) {
	const domids: Record<WidgetName, string> = {
		time: 'time',
		main: 'main',
		quicklinks: 'linkblocks',
		notes: 'notes_container',
		quotes: 'quotes_container',
		pomodoro: 'pomodoro_container',
		searchbar: 'sb_container',
	}

	for (const [widget, on] of states) {
		const elem = document.getElementById(domids[widget]) as HTMLElement
		elem?.classList.toggle('hidden', !on)
	}
}
