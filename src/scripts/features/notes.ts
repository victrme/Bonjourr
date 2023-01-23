import { $, clas, syncDefaults } from '../utils'
import { Notes } from '../types/sync'
import storage from '../storage'
import debounce from 'lodash.debounce'
import pocketEditor from 'pocket-editor'

const eventDebounce = debounce(function (value: { [key: string]: unknown }) {
	storage.sync.set(value)
}, 400)

type NotesEvent = { is: 'align' | 'width' | 'opacity' | 'change'; value: string }

export default function notes(init: Notes | null, event?: NotesEvent) {
	const container = $('notes_container')
	const editordom = $('pocket-editor')

	function handleToggle(state: boolean) {
		if (container) clas(container, !state, 'hidden')
	}

	function handleAlign(value: string) {
		if (editordom) {
			if (value === 'center') {
				clas(editordom, true, 'center-align')
			} else {
				clas(editordom, false, 'center-align')
				clas(editordom, value === 'right', 'right-align')
			}
		}
	}

	function handleWidth(value?: number) {
		if (value && container) container.style.setProperty('--notes-width', value.toString() + 'em')
	}

	function handleOpacity(value: number) {
		if (editordom) {
			clas(editordom, value > 0.45, 'opaque')
			editordom.style.backgroundColor = 'rgba(255, 255, 255, ' + value + ')'
		}
	}

	function updateNotes(notes: Notes, event: NotesEvent) {
		switch (event?.is) {
			case 'change': {
				notes.text = event.value
				break
			}

			case 'align': {
				handleAlign(event.value)
				notes.align = event.value as typeof notes.align
				break
			}

			case 'width': {
				notes.width = parseInt(event.value)
				handleWidth(notes.width)
				break
			}

			case 'opacity': {
				handleOpacity(parseFloat(event.value))
				notes.opacity = parseFloat(event.value)
				break
			}
		}

		eventDebounce({ notes })
	}

	if (event) {
		storage.sync.get('notes', (data: any) => {
			updateNotes(data.notes || syncDefaults.notes, event)
		})
		return
	}

	if (!init) {
		return
	}

	const editor = pocketEditor('notes_container')

	handleAlign(init.align)
	handleWidth(init.width)
	handleOpacity(init.opacity)
	handleToggle(init.on)
	editor.set(init.text)

	editor.oninput(() => {
		updateNotes(init, { is: 'change', value: editor.get() })
	})
}
