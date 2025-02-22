import { hexColorFromSplitRange, opacityFromHex } from '../utils'
import { getLang, tradThis } from '../utils/translations'
import { eventDebounce } from '../utils/debounce'
import onSettingsLoad from '../utils/onsettingsload'
import PocketEditor from 'pocket-editor'
import langList from '../langs'
import storage from '../storage'

type NotesEvent = {
	text?: string
	align?: string
	width?: string
	background?: true
}

const container = document.getElementById('notes_container')

export default function notes(init?: Sync.Notes, event?: NotesEvent) {
	if (event) {
		updateNotes(event)
		return
	}

	if (init) {
		init.on ? initNotes(init) : onSettingsLoad(() => initNotes(init))
	}
}

async function updateNotes(event: NotesEvent) {
	const notes = (await storage.sync.get('notes'))?.notes

	if (!notes) {
		return
	}

	if (event?.text !== undefined) {
		notes.text = event.text
	}

	if (event?.align !== undefined) {
		notes.align = event.align
		handleAlign(notes.align)
	}

	if (event?.width !== undefined) {
		notes.width = parseInt(event.width)
		handleWidth(notes.width)
	}

	if (event?.background) {
		notes.background = hexColorFromSplitRange('notes-background-range')
		handleBackground(notes.background)
	}

	eventDebounce({ notes })
}

//
//	Funcs
//

function initNotes(init: Sync.Notes) {
	document.getElementById('pocket-editor')?.remove()

	handleAlign(init.align)
	handleWidth(init.width)
	handleBackground(init.background)
	handleToggle(init.on)

	init.text = init.text ?? translateNotesText()

	new PocketEditor('#notes_container', { text: init.text, id: 'pocket-editor' }).oninput((content) => {
		updateNotes({ text: content })
	})
}

function handleToggle(state: boolean) {
	container?.classList.toggle('hidden', !state)
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

function handleBackground(hex = '#fff2') {
	if (container) {
		container?.classList.toggle('opaque', hex.includes('#fff') && opacityFromHex(hex) > 7)
		document.documentElement.style.setProperty('--notes-background', hex)
	}
}

function translateNotesText() {
	let lang = getLang()

	if (!(lang && lang in langList)) {
		lang = 'en'
	}

	const line1 = tradThis('Edit this note')
	const line2 = tradThis('With markdown titles, lists, and checkboxes')
	const line3 = tradThis('Learn more on <url>')

	return `## ${line1}!\n\n[ ] ${line2}\n\n[ ] ${line3.replace('<url>', 'https://bonjourr.fr/docs/overview')}`
}
