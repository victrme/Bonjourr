import { elements, gridStringify } from './helpers.ts'
import { getHTMLTemplate } from '../../shared/dom.ts'
import { onclickdown } from 'clickdown/mod'

import type { MoveLayout, SimpleMoveWidget } from '../../../types/sync.ts'
import type { WidgetName } from '../../../types/shared.ts'

const dominterface = document.querySelector<HTMLElement>('#interface')

export function setGridAreas(grid: MoveLayout['grid'] | string) {
	if (typeof grid === 'string') {
		document.documentElement.style.setProperty('--grid', grid)
	} else {
		document.documentElement.style.setProperty('--grid', gridStringify(grid))
	}
}

export function setAlign(id: WidgetName, align: SimpleMoveWidget) {
	const horizontal = align.horizontal ?? 'center'
	const vertical = align.vertical ?? 'center'
	const text = align.text
	const elem = elements[id]

	if (elem) {
		elem.style.placeSelf = `${horizontal} ${vertical}`

		if (id === 'quicklinks') {
			document.getElementById('linkblocks')?.classList.remove('text-left', 'text-right')

			if (text === 'left') {
				document.getElementById('linkblocks')?.classList.add('text-left')
			}
			if (text === 'right') {
				document.getElementById('linkblocks')?.classList.add('text-right')
			}
		} else {
			elem.style.textAlign = text || ''
		}
	}
}

export function setAllAligns(widgets: Record<WidgetName, SimpleMoveWidget>) {
	for (const [widget, align] of Object.entries(widgets)) {
		setAlign(widget as WidgetName, align)
	}
}

export function initOverlayActions(overlay: HTMLDivElement, id: WidgetName): void {
	// Grid move

	const moveGridBottom = overlay.querySelector<HTMLButtonElement>('#move-grid-bottom')
	const moveGridRight = overlay.querySelector<HTMLButtonElement>('#move-grid-right')
	const moveGridLeft = overlay.querySelector<HTMLButtonElement>('#move-grid-left')
	const moveGridTop = overlay.querySelector<HTMLButtonElement>('#move-grid-top')

	onclickdown(moveGridBottom, () => {
		console.log(id, 'move bottom')
	})
	onclickdown(moveGridRight, () => {
		console.log(id, 'move right')
	})
	onclickdown(moveGridLeft, () => {
		console.log(id, 'move left')
	})
	onclickdown(moveGridTop, () => {
		console.log(id, 'move top')
	})

	// Grid align

	const moveAlignHorizontal = overlay.querySelector<HTMLInputElement>('#i_move-align-horizontal')
	const moveAlignVertical = overlay.querySelector<HTMLInputElement>('#i_move-align-vertical')
	const moveAlignText = overlay.querySelector<HTMLInputElement>('#i_move-align-text')

	moveAlignHorizontal?.addEventListener('input', () => {
		console.log(id, 'align horizontally')
	})
	moveAlignVertical?.addEventListener('input', () => {
		console.log(id, 'align vertically')
	})
	moveAlignText?.addEventListener('input', () => {
		console.log(id, 'align text')
	})

	// Grid spans

	const moveSpanBottom = overlay.querySelector<HTMLElement>('#move-span-bottom')
	const moveSpanRight = overlay.querySelector<HTMLElement>('#move-span-right')
	const moveSpanLeft = overlay.querySelector<HTMLElement>('#move-span-left')
	const moveSpanTop = overlay.querySelector<HTMLElement>('#move-span-top')

	moveSpanBottom?.addEventListener('mousedown', () => {
		console.log(id, 'start spanning bottom')
	})
	moveSpanRight?.addEventListener('mousedown', () => {
		console.log(id, 'start spanning right')
	})
	moveSpanLeft?.addEventListener('mousedown', () => {
		console.log(id, 'start spanning left')
	})
	moveSpanTop?.addEventListener('mousedown', () => {
		console.log(id, 'start spanning top')
	})
}

export function addOverlay(id: WidgetName) {
	const overlay = getHTMLTemplate<HTMLDivElement>('move-overlay-template', '.move-overlay')
	overlay.id = `move-overlay-${id}`

	dominterface?.appendChild(overlay)
	initOverlayActions(overlay, id)
}

export function removeOverlay(id?: WidgetName) {
	if (id) {
		document.querySelector(`#move-overlay-${id}`)?.remove()
	} else {
		for (const overlay of document.querySelectorAll('.move-overlay')) {
			overlay.remove()
		}
	}
}

export function removeSelection() {
	// const toolbox = document.getElementById('element-mover')
	const elements = document.querySelectorAll<HTMLElement>(
		'.move-overlay, #grid-mover button, .grid-spanner, #element-mover button',
	)

	for (const elem of elements) {
		elem.classList.remove('selected')
		elem.removeAttribute('disabled')
	}

	// toolbox?.classList.remove('active')
}

export function interfaceFade(fade: 'in' | 'out') {
	if (fade === 'in') {
		const dominterface = document.getElementById('interface') as HTMLElement
		dominterface.style.removeProperty('opacity')
		setTimeout(() => {
			dominterface.style.transition = ''
		}, 200)
	}

	if (fade === 'out') {
		const dominterface = document.getElementById('interface') as HTMLElement
		dominterface.style.opacity = '0'
		dominterface.style.transition = 'opacity 200ms cubic-bezier(.215,.61,.355,1)'
	}
}
