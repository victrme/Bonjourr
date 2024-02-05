import { getLang, tradThis } from '../utils/translations'
import { eventDebounce } from '../utils/debounce'
import onSettingsLoad from '../utils/onsettingsload'
import pocketEditor from 'pocket-editor'
import langList from '../langs'
import storage from '../storage'

type NotesEvent = { is: 'align' | 'width' | 'opacity' | 'change'; value: string }

const container = document.getElementById('notes_container')
let editor: any

function translateNotesText() {
	let lang = getLang()

	if (!(lang && lang in langList)) lang = 'en'

	const or = tradThis('or')
	const edit = tradThis('Edit this note')
	const titles = tradThis('to create titles')
	const lists = tradThis('to add a list or checkbox')

	const lines = [`## ${edit} !\n\n`, `[ ] "# ", "## " ${or} "### " ${titles}\n`, `[ ] "- " ${or} "[ ] " ${lists}`]

	return lines.join('')
}

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

async function updateNotes(event: NotesEvent) {
	const notes = (await storage.sync.get('notes'))?.notes

	if (!notes) {
		return
	}

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

function initNotes(init: Sync.Notes) {
	editor = pocketEditor('notes_container')

	handleAlign(init.align)
	handleWidth(init.width)
	handleOpacity(init.opacity)
	handleToggle(init.on)

	editor.set(typeof init.text === 'string' ? init.text : translateNotesText())

	editor.oninput(() => {
		updateNotes({ is: 'change', value: editor.get() })
	})
}

export default function notes(init?: Sync.Notes, event?: NotesEvent) {
	if (event) {
		updateNotes(event)
		return
	}

	if (init) {
		document.getElementById('pocket-editor')?.remove()
		init.on ? initNotes(init) : onSettingsLoad(() => initNotes(init))
	}
}
