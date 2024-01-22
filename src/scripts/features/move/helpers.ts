export const elements = <const>{
	time: document.getElementById('time'),
	main: document.getElementById('main'),
	quicklinks: document.getElementById('linkblocks'),
	searchbar: document.getElementById('sb_container'),
	notes: document.getElementById('notes_container'),
	quotes: document.getElementById('quotes_container'),
}

export function isEditing() {
	document.getElementById('interface')?.classList.contains('move-edit') || false
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
