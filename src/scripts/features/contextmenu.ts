import { transitioner } from '../utils/transitioner.ts'
import { populateDialogWithEditLink } from './links/edit.ts'
import { IS_MOBILE, SYSTEM_OS } from '../defaults.ts'
import type { Backgrounds } from '../../types/sync.ts'
interface eventLocation {
    widgets: {
        link: boolean
        time: boolean
		main: boolean
		quotes: boolean
    }
    interface: boolean
}

const sectionMatching = {
	time: {
		section: "#time",
		scrollto: "time_title"
	},
	main: {
		section: "#main",
		scrollto: "main_title"
	},
	quotes: {
		section: "#quotes_container",
		scrollto: "quotes_title"
	}
}

const mainInterface = document.getElementById('interface') as HTMLDivElement
const domdialog = document.getElementById('contextmenu') as HTMLDialogElement

let eventLocation: eventLocation

export async function openContextMenu(event: Event) {
	// imperfect selected text detection to allow for OS context menu
	const selection = window.getSelection()
    if (selection && !selection.isCollapsed) {
        return
    }

    const target = event.target as HTMLElement

    eventLocation = {
		widgets: {
			link: !!target.closest('#linkblocks'),
			time: !!target.closest(sectionMatching.time.section),
			main: !!target.closest(sectionMatching.main.section),
			quotes: !!target.closest(sectionMatching.quotes.section)
		},
        interface: target.matches("main#interface") 
    }

    const pointer = event as PointerEvent
	const ctrlRightClick = pointer.button === 2 && !!pointer.ctrlKey && event.type === 'contextmenu'
	const notPressingE = event.type === 'keyup' && (event as KeyboardEvent).code !== 'KeyE'

	const clickedOnWidgets = Object.values(eventLocation.widgets).some(v => v)
	const menuWillOpen = !(ctrlRightClick || notPressingE) && clickedOnWidgets || eventLocation.interface

	if (!menuWillOpen) return

	// hides content from previous context menu
	for (const node of domdialog.querySelectorAll('label, button, hr, #background-actions')) {
		node.classList.remove('on')
	}

	// prevents OS context menu
	event.preventDefault()

	// Must be placed after "li?.classList.add('selected')"
	// eventLocation.selected = getSelectedIds()

	const contextmenuTransition = transitioner()
		contextmenuTransition.first(() => domdialog?.show())
		contextmenuTransition.after(() => domdialog?.classList?.add('shown'))
		contextmenuTransition.transition(10)

	if (eventLocation.widgets.link) {
		populateDialogWithEditLink(event, domdialog)
	} else if (clickedOnWidgets) {
		// for each widget that's been clicked on
		for (const [key, value] of Object.entries(eventLocation.widgets)) {
			if (value) {
				// shows its corresponding action button
				populateDialogWithAction("openTheseSettings", sectionMatching[key].scrollto)
			}
		}

		positionContextMenu(event)
	} else if (eventLocation.interface) {
		populateDialogWithAction("openTheseSettings", "background_title")
		
		// add new link button if quick links are enabled
		if (!document.querySelector('#linkblocks.hidden')) {
			populateDialogWithAction("add-new-link")
		}

		showTheseElements('#background-actions')

		positionContextMenu(event)
	}
}

function populateDialogWithAction(actionType: string, attribute?: string) {
	let selector = `[data-action="${actionType}"]`

	if (attribute) {
		selector += `[data-attribute="${attribute}"]`
	}

	showTheseElements(selector)
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
		x = (event.type === 'touchstart' ? (event as TouchEvent).touches[0].clientX : (event as PointerEvent).x) + 10
		y = (event.type === 'touchstart' ? (event as TouchEvent).touches[0].clientY : (event as PointerEvent).y) + 10
	} //
	else if (withKeyboard) {
		const targetEl = event.target as HTMLElement
		const rect = targetEl.getBoundingClientRect()

		x = rect.right
		y = rect.bottom + 4
	}

	const w = editRects.width + 20
	const h = editRects.height + 20

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

export function openSettingsButtonEvent(event: Event) {
	const target = event.target as HTMLButtonElement
	const sectionToScrollTo = target.getAttribute('data-attribute')
	
	if (sectionToScrollTo) {
		document.dispatchEvent(new CustomEvent('toggle-settings', {
			detail: { scrollTo: `#${sectionToScrollTo}` }
		}))
		
		closeContextMenu()
	} else {
		console.error(`Section "${sectionToScrollTo}" doesn't match anything`)
	}

}

export function handleBackgroundActions(backgrounds: Backgrounds) {
	console.info('handleBackgroundActions()')
	const type = backgrounds.type
	const freq = backgrounds.frequency

	// document.getElementById('background-actions')?.classList.toggle('on', type !== 'color')
	document.getElementById('background-actions')?.setAttribute("data-type", type)
	document.getElementById('b_interface-background-pause')?.classList.toggle('paused', freq === 'pause')
	document.getElementById('b_interface-background-download')?.toggleAttribute('disabled', type !== 'images')
}

function showTheseElements(query: string) {
	document.querySelectorAll<HTMLElement>(query).forEach(element => {
		element.classList.add("on")
	})
}

queueMicrotask(() => {
    document.addEventListener('close-edit', closeContextMenu)
    mainInterface?.addEventListener('contextmenu', openContextMenu)

	const openSettingsButtons = domdialog.querySelectorAll<HTMLButtonElement>(`[data-action="openTheseSettings"]`)

	openSettingsButtons?.forEach(btn => {
		btn?.addEventListener('click', openSettingsButtonEvent)
	})

	const addNewLinkButton = domdialog.querySelector<HTMLButtonElement>(`[data-action="add-new-link"]`)
	addNewLinkButton?.addEventListener('click', (event) =>
		populateDialogWithEditLink(event, domdialog, true)
	)

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
