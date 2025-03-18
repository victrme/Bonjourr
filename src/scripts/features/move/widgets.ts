import { interfaceFade, setAllAligns, setGridAreas, removeSelection, addOverlay, removeOverlay } from './dom'
import transitioner from '../../utils/transitioner'
import storage from '../../storage'
import {
	isEditing,
	addGridWidget,
	removeGridWidget,
	updateWidgetsStorage,
	gridStringify,
	gridParse,
	getLayout,
} from './helpers'

export default function toggleWidget(data: Sync.Storage, widget: [Widgets, boolean]) {
	if (!widget) {
		return
	}

	const [id, on] = widget
	const gridToggle = on ? addGridWidget : removeGridWidget
	const interfaceTransition = transitioner()
	const selection = data.move.selection
	const layout = getLayout(data)
	const grid = gridParse(gridToggle(gridStringify(layout.grid), id, selection))

	data.move.layouts[selection] = { items: layout.items, grid: grid }
	const newdata = updateWidgetsStorage([widget], data)
	storage.sync.set(newdata)

	interfaceTransition.first(() => {
		toggleWidgetInSettings([[id, on]])
		interfaceFade('out')
	})

	interfaceTransition.after(async () => {
		const layout = getLayout(newdata)
		setGridAreas(layout.grid)
		setAllAligns(layout.items)
		toggleWidgetOnInterface([[id, on]])
		removeSelection()

		// add/remove widget overlay only when editing move
		if (isEditing()) {
			on ? addOverlay(id) : removeOverlay(id)
		}
	})

	interfaceTransition.finally(() => {
		interfaceFade('in')
	})

	interfaceTransition.transition(200)
}

export function toggleWidgetInSettings(states: [Widgets, boolean][]) {
	const inputids: { [key in Widgets]: string } = {
		time: 'i_time',
		main: 'i_main',
		quicklinks: 'i_quicklinks',
		notes: 'i_notes',
		quotes: 'i_quotes',
		searchbar: 'i_sb',
	}

	for (const [widget, on] of states) {
		const input = document.getElementById(inputids[widget]) as HTMLInputElement
		const option = document.getElementById(`${widget}_options`)

		option?.classList.toggle('shown', on)
		input.checked = on
	}
}

export function toggleWidgetOnInterface(states: [Widgets, boolean][]) {
	const domids: { [key in Widgets]: string } = {
		time: 'time',
		main: 'main',
		quicklinks: 'linkblocks',
		notes: 'notes_container',
		quotes: 'quotes_container',
		searchbar: 'sb_container',
	}

	for (const [widget, on] of states) {
		const elem = document.getElementById(domids[widget]) as HTMLElement
		elem?.classList.toggle('hidden', !on)
	}
}
