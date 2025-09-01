import { getComposedPath } from '../shared/dom.ts'
import { transitioner } from '../utils/transitioner.ts'
import { populateDialogWithEditLink } from './links/edit.ts'
import { IS_MOBILE, SYSTEM_OS } from '../defaults.ts'

interface eventLocation {
	link: boolean
	general: boolean
}


const mainInterface = document.getElementById('interface') as HTMLDivElement
const domdialog = document.getElementById('dialog') as HTMLDialogElement

let eventLocation: eventLocation

export async function openDialog(event: Event) {
    const target = event.target as HTMLElement

    eventLocation: eventLocation = {
        link: !!target.closest('#linkblocks'),
        general: false
    }

    // const pointer = event as PointerEvent
	// const ctrlRightClick = pointer.button === 2 && !!pointer.ctrlKey && event.type === 'contextmenu'
	// const pressingE = event.type === 'keyup' && (event as KeyboardEvent).code !== 'KeyE'

	// if (ctrlRightClick || pressingE) {
	// 	return
	// }

    event.preventDefault()

    // Must be placed after "li?.classList.add('selected')"
    // eventLocation.selected = getSelectedIds()

    const contextmenuTransition = transitioner()
    contextmenuTransition.first(() => domdialog?.show())
    contextmenuTransition.after(() => domdialog?.classList?.add('shown'))
    contextmenuTransition.transition(10)

    if (eventLocation.link) {
        populateDialogWithEditLink(event, domdialog)
    }

}


export function positionDialog(event: Event) {
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
		x = (event.target as HTMLElement).offsetLeft
		y = (event.target as HTMLElement).offsetTop
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

queueMicrotask(() => {
    document.addEventListener('close-edit', closeDialog)
    mainInterface?.addEventListener('contextmenu', openDialog)
    
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

        globalThis.addEventListener('resize', closeDialog)
    }
})

export function closeDialog() {
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
