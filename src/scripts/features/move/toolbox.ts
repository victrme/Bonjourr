import { elements, getGridWidgets, gridFind, gridParse, gridStringify, hasDuplicateInArray } from './helpers'
import { updateMoveElement } from '.'
import { toggleDisabled } from '../../utils'
import { tradThis } from '../../utils/translations'

const moverdom = document.querySelector<HTMLElement>('#element-mover')
let resetTimeout: number
let firstPos = { x: 0, y: 0 }
let moverPos = { x: 0, y: 0 }

export function toolboxEvents() {
	const elementEntries = Object.entries(elements)
	const moverBtns = document.querySelectorAll<HTMLElement>('#grid-mover button')
	const layoutBtns = document.querySelectorAll<HTMLElement>('#grid-layout button')
	const boxAlignBtns = document.querySelectorAll<HTMLElement>('#box-alignment-mover button')
	const textAlignBtns = document.querySelectorAll<HTMLElement>('#text-alignment-mover button')
	const spanColsBtn = document.querySelector<HTMLElement>('#grid-span-cols')
	const spanRowsBtn = document.querySelector<HTMLElement>('#grid-span-rows')
	const resetBtn = document.querySelector<HTMLElement>('#b_resetlayout')
	const closeBtn = document.querySelector<HTMLElement>('#close-mover')

	elementEntries.forEach(([key, element]) => {
		element?.onclickdown((event) => {
			updateMoveElement({ select: key })
			event.stopPropagation()
		})
	})

	moverBtns.forEach((button) => {
		button.onclickdown(() => {
			updateMoveElement({ grid: { x: button.dataset.col, y: button.dataset.row } })
		})
	})

	layoutBtns.forEach((button) => {
		button.onclickdown(() => {
			updateMoveElement({ layout: button.dataset.layout || '' })
		})
	})

	boxAlignBtns.forEach((button) => {
		button.onclickdown(() => {
			updateMoveElement({ box: button.dataset.align })
		})
	})

	textAlignBtns.forEach((button) => {
		button.onclickdown(() => {
			updateMoveElement({ text: button.dataset.align })
		})
	})

	spanColsBtn?.onclickdown(() => updateMoveElement({ span: 'col' }))
	spanRowsBtn?.onclickdown(() => updateMoveElement({ span: 'row' }))
	closeBtn?.addEventListener('click', () => updateMoveElement({ toggle: true }))
	resetBtn?.addEventListener('click', () => updateMoveElement({ reset: true }))

	moverdom?.addEventListener('mousedown', startDrag)
	moverdom?.addEventListener('mouseup', removeDrag)
	moverdom?.addEventListener('mouseleave', removeDrag)

	moverdom?.addEventListener('touchstart', startDrag, { passive: false })
	moverdom?.addEventListener('touchend', removeDrag)

	function startDrag(event: Event) {
		const target = event.target as HTMLElement
		const validTags = target?.tagName === 'HR' || target?.tagName === 'P'
		const validIds = target?.id === 'element-mover' || target?.id === 'close-mover-wrapper'

		if (validTags || validIds) {
			moverdom?.addEventListener(event.type.includes('touch') ? 'touchmove' : 'mousemove', moverDrag)
		}
	}

	function moverDrag(event: MouseEvent | TouchEvent) {
		let pos = (event as TouchEvent).touches ? (event as TouchEvent).touches[0] : (event as MouseEvent)

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
			document.documentElement.style.overscrollBehavior = 'none'
			moverdom.style.transform = `translate(${moverPos.x}px, ${moverPos.y}px)`
		}
	}

	function removeDrag() {
		firstPos = { x: 0, y: 0 }
		;(moverdom as HTMLElement).style.removeProperty('cursor')
		document.documentElement.style.removeProperty('overscroll-behavior')
		moverdom?.removeEventListener('mousemove', moverDrag)
		moverdom?.removeEventListener('touchmove', moverDrag)
	}
}

export function layoutButtons(selection: Sync.MoveSelection) {
	document.querySelectorAll<HTMLButtonElement>('#grid-layout button').forEach((button) => {
		button.classList.toggle('selected', button.dataset.layout === selection)
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
	positions.forEach(([col, row]) => {
		if (row === 0) top = true
		if (col === 0) left = true
		if (col === rightLimit) right = true
		if (row === widgetBottomLimit) bottom = true

		// Bottom limit when last elem on last line
		if (row === grid.length - 1) {
			const idOnlyRow = grid.at(row)?.filter((id) => id !== '.')
			if (new Set(idOnlyRow).size === 1) bottom = true
		}
	})

	// link button to correct limit, apply disable attr
	document.querySelectorAll<HTMLButtonElement>('#grid-mover button').forEach((button) => {
		const c = parseInt(button.dataset.col || '0')
		const r = parseInt(button.dataset.row || '0')
		let limit = false

		if (r === -1) limit = top
		if (r === 1) limit = bottom
		if (c === -1) limit = left
		if (c === 1) limit = right

		toggleDisabled(button, limit)
	})
}

export function spanButtons(id: Widgets) {
	const gridstring = document.documentElement?.style.getPropertyValue('--grid') || ''
	const grid = gridParse(gridstring)

	if (grid.length === 0) {
		return
	}

	const applyStates = (dir: 'col' | 'row', state: boolean) => {
		const dirButton = document.querySelector(`#grid-span-${dir}s`)
		const otherButton = document.querySelector(`#grid-span-${dir === 'col' ? 'rows' : 'cols'}`)

		toggleDisabled(otherButton, state)

		dirButton?.classList.toggle('selected', state)
	}

	const [posCol, posRow] = gridFind(grid, id)[0]
	let col = grid.map((g) => g[posCol])
	let row = [...grid[posRow]]

	const hasColumnDuplicates = hasDuplicateInArray(col, id)
	const hasRowDuplicates = hasDuplicateInArray(row, id)

	applyStates('col', hasColumnDuplicates)
	applyStates('row', hasRowDuplicates)
}

export function alignButtons(align?: Sync.MoveAlign) {
	const { box, text } = align ?? { box: '', text: '' }
	const boxBtns = document.querySelectorAll<HTMLButtonElement>('#box-alignment-mover button')
	const textBtns = document.querySelectorAll<HTMLButtonElement>('#text-alignment-mover button')

	boxBtns.forEach((b) => b.classList.toggle('selected', b.dataset.align === (box || 'center')))
	textBtns.forEach((b) => b.classList.toggle('selected', b.dataset.align === (text || 'center')))
}

export function resetButton(): boolean {
	const b_resetlayout = document.getElementById('b_resetlayout') as HTMLButtonElement
	const confirm = !!b_resetlayout.dataset.confirm

	clearTimeout(resetTimeout)

	if (confirm === false) {
		b_resetlayout.textContent = tradThis('Are you sure?')
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
