import { getComposedPath } from '../shared/dom.ts'
import { transitioner } from '../utils/transitioner.ts'
import { populateDialogWithEditLink } from './links/edit.ts'
import { IS_MOBILE, SYSTEM_OS } from '../defaults.ts'

interface eventLocation {
	link: boolean
	time: boolean
	general: boolean
}

const mainInterface = document.getElementById('interface') as HTMLDivElement
const domdialog = document.getElementById('contextmenu') as HTMLDialogElement

let eventLocation: eventLocation

export async function openContextMenu(event: Event) {
	console.info('openContextMenu()')
    const target = event.target as HTMLElement

    eventLocation = {
        link: !!target.closest('#linkblocks'),
		time: !!target.closest('#time'),
        general: false
    }

    const pointer = event as PointerEvent
	const ctrlRightClick = pointer.button === 2 && !!pointer.ctrlKey && event.type === 'contextmenu'
	const notPressingE = event.type === 'keyup' && (event as KeyboardEvent).code !== 'KeyE'

	for (const node of domdialog.querySelectorAll('label, button, hr')) {
		node.classList.remove('on')
	}

	if (ctrlRightClick || notPressingE) {
		return
	}

	if (eventLocation.link || eventLocation.time) {
		event.preventDefault()

		// Must be placed after "li?.classList.add('selected')"
		// eventLocation.selected = getSelectedIds()

		const contextmenuTransition = transitioner()
		contextmenuTransition.first(() => domdialog?.show())
		contextmenuTransition.after(() => domdialog?.classList?.add('shown'))
		contextmenuTransition.transition(10)

		if (eventLocation.link) {
			populateDialogWithEditLink(event, domdialog)
		} else if (eventLocation.time) {
			populateDialogWithOpenSettings(event, 'time')
		}
	}


}

function populateDialogWithOpenSettings(event: Event, settings: string) {
	if (settings === "time") {
		domdialog.querySelector('#openTime')?.classList.add('on')
	}

	positionContextMenu(event)
}

export function positionContextMenu(event: Event) {
	const editRects = domdialog.getBoundingClientRect()
	const withPointer = event.type === 'contextmenu' || event.type === 'click' || event.type === 'touchstart'
	const withKeyboard = event.type === 'keyup' && (event as KeyboardEvent)?.key === 'e'
	const { innerHeight, innerWidth } = window
	const isMobileSized = innerWidth < 600
	const docLang = document.documentElement.lang
	const rightToLeft = docLang === 'ar' || docLang === 'fa' || docLang === 'he'

	let x = 0
	let y = 0

	if (withPointer && isMobileSized) {
		x = (innerWidth - editRects.width) / 2
		y = (event.type === 'touchstart' ? (event as TouchEvent).touches[0].clientY : (event as PointerEvent).y) -
			60 -
			editRects.height
	} //
	else if (withPointer) {
		// gets coordinates differently from touchstart or contextmenu
		x = (event.type === 'touchstart' ? (event as TouchEvent).touches[0].clientX : (event as PointerEvent).x) + 20
		y = (event.type === 'touchstart' ? (event as TouchEvent).touches[0].clientY : (event as PointerEvent).y) + 20
	} //
	else if (withKeyboard) {
		const targetEl = event.target as HTMLElement
		const rect = targetEl.getBoundingClientRect()

		x = rect.right
		y = rect.bottom + 4
	}

	const w = editRects.width + 30
	const h = editRects.height + 30

	if (x + w > innerWidth) {
		x -= x + w - innerWidth
	}

	if (y + h > innerHeight) {
		y -= h
	}
   
	if (rightToLeft) {
		x *= -1
	}

	domdialog.style.transform = `translate(${Math.floor(x)}px, ${Math.floor(y)}px)`
}



export function contextMenuEvents(event: Event) {
	const target = event.target

	if (target instanceof HTMLButtonElement) {
		if (target.id === 'openTime') {
			document.dispatchEvent(new CustomEvent('toggle-settings', {
				detail: { scrollTo: "#time_options" }
			}))
		}
	}
}

queueMicrotask(() => {
    document.addEventListener('close-edit', closeContextMenu)
    mainInterface?.addEventListener('contextmenu', openContextMenu)

	domdialog.querySelector('#openTime')?.addEventListener('click', contextMenuEvents)
    
    if (SYSTEM_OS === 'ios' || !IS_MOBILE) {
        // const handleLongPress = debounce((event: TouchEvent) => {
        //     openEditDialog(event)
        // }, 500)

        // domdialog?.addEventListener('touchstart', (event) => {
        //     handleLongPress(event)
        // })

        // domdialog?.addEventListener('touchend', () => {
        //     handleLongPress.cancel()
        // })

        globalThis.addEventListener('resize', closeContextMenu)
    }
})

export function closeContextMenu() {
	console.info("closeContextMenu()")
	if (domdialog.open) {
		const selected = document.querySelectorAll('.link-title.selected, .link.selected')

		for (const node of selected) {
			node?.classList.remove('selected')
		}

		domdialog.removeAttribute('data-tab')
		domdialog.classList.remove('shown')
		domdialog.close()
	}
}
