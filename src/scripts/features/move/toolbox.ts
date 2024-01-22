import { updateMoveElement } from '.'
import { elements } from './helpers'

const moverdom = document.querySelector<HTMLElement>('#element-mover')
let firstPos = { x: 0, y: 0 }
let moverPos = { x: 0, y: 0 }

export default function moverToolboxEvents() {
	Object.entries(elements).forEach(([key, elem]) => {
		elem?.addEventListener('click', () => updateMoveElement({ select: key }))
	})

	document.querySelectorAll<HTMLButtonElement>('#grid-mover button').forEach((btn) => {
		btn.addEventListener('click', () => updateMoveElement({ grid: { x: btn.dataset.col, y: btn.dataset.row } }))
	})

	document.querySelectorAll<HTMLButtonElement>('#box-alignment-mover button').forEach((btn) => {
		btn.addEventListener('click', () => updateMoveElement({ box: btn.dataset.align }))
	})

	document.querySelectorAll<HTMLButtonElement>('#text-alignment-mover button').forEach((btn) => {
		btn.addEventListener('click', () => updateMoveElement({ text: btn.dataset.align }))
	})

	document.querySelector<HTMLButtonElement>('#close-mover')?.addEventListener('click', () => {
		updateMoveElement({ toggle: true })
	})

	document.querySelector<HTMLButtonElement>('#grid-span-cols')?.addEventListener('click', () => {
		updateMoveElement({ span: 'col' })
	})

	document.querySelector<HTMLButtonElement>('#grid-span-rows')?.addEventListener('click', () => {
		updateMoveElement({ span: 'row' })
	})

	moverdom?.addEventListener('mousedown', (e) => {
		if ((e.target as HTMLElement)?.id === 'element-mover') {
			moverdom?.addEventListener('mousemove', moverDrag)
		}
	})

	moverdom?.addEventListener(
		'touchstart',
		(e) => {
			if ((e.target as HTMLElement)?.id === 'element-mover') {
				moverdom?.addEventListener('touchmove', moverDrag)
			}
		},
		{ passive: false }
	)

	const removeDrag = () => {
		firstPos = { x: 0, y: 0 }
		;(moverdom as HTMLElement).style.removeProperty('cursor')
		moverdom?.removeEventListener('mousemove', moverDrag)
		moverdom?.removeEventListener('touchmove', moverDrag)
	}

	moverdom?.addEventListener('mouseup', removeDrag)
	moverdom?.addEventListener('mouseleave', removeDrag)
	moverdom?.addEventListener('touchend', removeDrag)
}

function moverDrag(e: MouseEvent | TouchEvent) {
	let pos = (e as TouchEvent).touches ? (e as TouchEvent).touches[0] : (e as MouseEvent)

	let x = pos.clientX
	let y = pos.clientY

	// Set first position to calc offset
	if (firstPos.x === 0 && firstPos.y === 0) {
		firstPos = { x: x - moverPos.x, y: y - moverPos.y }
		return
	}

	moverPos = {
		x: x - firstPos.x,
		y: y - firstPos.y,
	}

	if (moverdom) {
		moverdom.style.transform = `translate(${moverPos.x}px, ${moverPos.y}px)`
		moverdom.style.cursor = `grabbing`
	}
}
