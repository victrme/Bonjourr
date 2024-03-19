import { alignParse, elements, getGridWidgets, gridFind, gridParse, gridStringify, hasDuplicateInArray } from './helpers'
import { updateMoveElement } from '.'
import { tradThis } from '../../utils/translations'

const moverdom = document.querySelector<HTMLElement>('#element-mover')
let resetTimeout: number
let firstPos = { x: 0, y: 0 }
let moverPos = { x: 0, y: 0 }

export function toolboxEvents() {
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
}

export function layoutButtons(column: Sync.Move['column']) {
	document.querySelectorAll<HTMLButtonElement>('#grid-layout button').forEach((button) => {
		button.classList.toggle('selected', button.dataset.layout === column)
	})
}

export function gridButtons(id: Widgets) {
	const property = document.documentElement?.style.getPropertyValue('--grid') || ''
	const grid = gridParse(property)

	if (grid.length === 0) return

	let top = false
	let bottom = false
	let left = false
	let right = false

	const positions = gridFind(grid, id)
	const widgetBottomLimit = getGridWidgets(gridStringify(grid)).length - 1
	const rightLimit = grid[0].length - 1

	// Detect if element is on array limits
	positions.forEach((pos) => {
		if (pos.posRow === 0) top = true
		if (pos.posCol === 0) left = true
		if (pos.posCol === rightLimit) right = true
		if (pos.posRow === widgetBottomLimit) bottom = true

		// Bottom limit when last elem on last line
		if (pos.posRow === grid.length - 1) {
			const idOnlyRow = grid.at(pos.posRow)?.filter((id) => id !== '.')
			if (new Set(idOnlyRow).size === 1) bottom = true
		}
	})

	// link button to correct limit, apply disable attr
	document.querySelectorAll<HTMLButtonElement>('#grid-mover button').forEach((b) => {
		const c = parseInt(b.dataset.col || '0')
		const r = parseInt(b.dataset.row || '0')
		let limit = false

		if (r === -1) limit = top
		if (r === 1) limit = bottom
		if (c === -1) limit = left
		if (c === 1) limit = right

		limit ? b?.setAttribute('disabled', '') : b?.removeAttribute('disabled')
	})
}

export function spanButtons(id: Widgets) {
	const grid = gridParse(document.documentElement?.style.getPropertyValue('--grid') || '')
	if (grid.length === 0) return

	const { posCol, posRow } = gridFind(grid, id)[0]
	let col = grid.map((g) => g[posCol])
	let row = [...grid[posRow]]

	applyStates('col', hasDuplicateInArray(col, id))
	applyStates('row', hasDuplicateInArray(row, id))

	function applyStates(dir: 'col' | 'row', state: boolean) {
		const dirButton = document.querySelector(`#grid-span-${dir}s`)
		const otherButton = document.querySelector(`#grid-span-${dir === 'col' ? 'rows' : 'cols'}`)

		if (state) otherButton?.setAttribute('disabled', '')
		else otherButton?.removeAttribute('disabled')

		dirButton?.classList.toggle('selected', state)
	}
}

export function alignButtons(str?: string) {
	const { box, text } = alignParse(str ?? '')
	const boxBtns = document.querySelectorAll<HTMLButtonElement>('#box-alignment-mover button')
	const textBtns = document.querySelectorAll<HTMLButtonElement>('#text-alignment-mover button')

	boxBtns.forEach((b) => b.classList.toggle('selected', b.dataset.align === box))
	textBtns.forEach((b) => b.classList.toggle('selected', b.dataset.align === text))
}

export function resetButton(): boolean {
	const b_resetlayout = document.getElementById('b_resetlayout') as HTMLButtonElement
	const confirm = !!b_resetlayout.dataset.confirm

	clearTimeout(resetTimeout)

	if (confirm === false) {
		b_resetlayout.textContent = tradThis('Are you sure ?')
		b_resetlayout.dataset.confirm = 'true'

		resetTimeout = setTimeout(() => {
			b_resetlayout.textContent = tradThis('Reset layout')
			b_resetlayout.dataset.confirm = ''
		}, 1000)
	} else {
		b_resetlayout.textContent = tradThis('Reset layout')
		b_resetlayout.dataset.confirm = ''
	}

	return confirm
}

export function showSpanButtons(column: string) {
	column !== 'single'
		? document.getElementById('grid-spanner-container')?.classList.add('active')
		: document.getElementById('grid-spanner-container')?.classList.remove('active')
}
