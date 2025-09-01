import { getComposedPath } from '../shared/dom.ts'
import { transitioner } from '../utils/transitioner.ts'

interface eventLocation {
	link: boolean
	general: boolean
}


const mainInterface = document.getElementById('interface') as HTMLDivElement
const domdialog = document.getElementById('dialog') as HTMLDialogElement

let eventLocation: eventLocation

export async function openDialog(event: Event) {
    const target = event.target as HTMLElement

    const path = getComposedPath(event.target)
	const classNames = path.map((element) => element.className ?? '')

    eventLocation: eventLocation = {
        link: !!target.closest('#linkblocks'),
        general: false
    }

    console.log(eventLocation)

    event.preventDefault()

    // Must be placed after "li?.classList.add('selected')"
    // eventLocation.selected = getSelectedIds()

    const contextmenuTransition = transitioner()
    contextmenuTransition.first(() => domdialog?.show())
    contextmenuTransition.after(() => domdialog?.classList?.add('shown'))
    contextmenuTransition.transition(10)

    const { x, y } = newDialogPosition(event)
    domdialog.style.transform = `translate(${Math.floor(x)}px, ${Math.floor(y)}px)`

}


function newDialogPosition(event: Event): { x: number; y: number } {
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

	return { x, y }
}

console.log(mainInterface)

queueMicrotask(() => {
    document.addEventListener('close-edit', closeDialog)
    // document.getElementById('editlink-form')?.addEventListener('submit', submitChanges)
    mainInterface?.addEventListener('contextmenu', openDialog)
    

})

function closeDialog() {
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
