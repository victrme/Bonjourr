import { getComposedPath } from '../shared/dom.ts'
import { transitioner } from '../utils/transitioner.ts'

const mainInterface = document.getElementById('interface') as HTMLDivElement
const domeditlink = document.getElementById('editlink') as HTMLDialogElement

export async function openDialog(event: Event) {
    const path = getComposedPath(event.target)
	const classNames = path.map((element) => element.className ?? '')



    event.preventDefault()

    // Must be placed after "li?.classList.add('selected')"
    // editStates.selected = getSelectedIds()

    const contextmenuTransition = transitioner()
    contextmenuTransition.first(() => domeditlink?.show())
    contextmenuTransition.after(() => domeditlink?.classList?.add('shown'))
    contextmenuTransition.transition(10)

    const { x, y } = newDialogPosition(event)
    domeditlink.style.transform = `translate(${Math.floor(x)}px, ${Math.floor(y)}px)`

}


function newDialogPosition(event: Event): { x: number; y: number } {
	const editRects = domeditlink.getBoundingClientRect()
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
    // document.addEventListener('close-edit', closeEditDialog)
    // document.getElementById('editlink-form')?.addEventListener('submit', submitChanges)
    mainInterface?.addEventListener('contextmenu', openDialog)
    

})

function closeDialog() {
	if (domeditlink.open) {
		const selected = document.querySelectorAll('.link-title.selected, .link.selected')

		for (const node of selected) {
			node?.classList.remove('selected')
		}

		domeditlink.removeAttribute('data-tab')
		domeditlink.classList.remove('shown')
		domeditlink.close()
	}
}
