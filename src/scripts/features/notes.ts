import { syncDefaults } from '../utils'
import { eventDebounce } from '../utils/debounce'
import { tradThis } from '../utils/translations'
import { langList } from '../lang'
import storage from '../storage'
import pocketEditor from 'pocket-editor'

import { Notes } from '../types/sync'

type NotesEvent = { is: 'align' | 'width' | 'opacity' | 'change'; value: string }

function translateNotesText() {
	let lang = document.documentElement.getAttribute('lang')

	if (!(lang && lang in langList)) lang = 'en'

	const or = tradThis('or', lang)
	const edit = tradThis('Edit this note', lang)
	const titles = tradThis('to create titles', lang)
	const lists = tradThis('to add a list or checkbox', lang)

	const lines = [`## ${edit} !\n\n`, `[x] "# ", "## " ${or} "### " ${titles}\n`, `[x] "- " ${or} "[ ] " ${lists}`]

	return lines.join('')
}

export default function notes(init: Notes | null, event?: NotesEvent) {
	const container = document.getElementById('notes_container')

	function handleToggle(state: boolean) {
		if (container) container?.classList.toggle('hidden', !state)
	}

	function handleAlign(value: string) {
		container?.classList.toggle('center-align', value === 'center')
		container?.classList.toggle('right-align', value === 'right')
	}

	function handleWidth(value?: number) {
		if (value) {
			document.documentElement.style.setProperty('--notes-width', value.toString() + 'em')
		}
	}

	function handleOpacity(value: number) {
		if (container) {
			container?.classList.toggle('opaque', value > 0.45)
			document.documentElement.style.setProperty('--notes-background-alpha', value.toString())
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

	if (!init) return
	if (document.getElementById('pocket-editor')) {
		document.getElementById('pocket-editor')?.remove()
	}

	const editor = pocketEditor('notes_container')

	handleAlign(init.align)
	handleWidth(init.width)
	handleOpacity(init.opacity)
	handleToggle(init.on)

	editor.set(typeof init.text === 'string' ? init.text : translateNotesText())
	editor.oninput(() => notes(init, { is: 'change', value: editor.get() }))
}
