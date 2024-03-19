import { interfaceFade, setAllAligns, setGridAreas, removeSelection, addOverlay, removeOverlay } from './dom'
import { isEditing, addGridWidget, removeGridWidget, updateWidgetsStorage } from './helpers'
import transitioner from '../../utils/transitioner'
import storage from '../../storage'

export default async function toggleWidget(data: Sync.Storage, widget: [Widgets, boolean]) {
	if (!widget) return

	const [id, on] = widget
	const gridToggle = on ? addGridWidget : removeGridWidget
	const interfaceTransition = transitioner()
	const column = data.move.column
	const grid = data.move[column].grid

	data.move[column].grid = gridToggle(grid, id, column)
	data = updateWidgetsStorage([widget], data)
	storage.sync.set(data)

	interfaceTransition.first(() => {
		toggleWidgetInSettings([[id, on]])
		interfaceFade('out')
	})

	interfaceTransition.then(async () => {
		setGridAreas(data.move[data.move.column]?.grid)
		setAllAligns(data.move[data.move.column])
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

function toggleWidgetInSettings(states: [Widgets, boolean][]) {
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
		const option = document.getElementById(widget + '_options')

		option?.classList.toggle('shown', on)
		input.checked = on
	}
}

function toggleWidgetOnInterface(states: [Widgets, boolean][]) {
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
