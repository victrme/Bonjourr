import clamp from 'lodash.clamp'
import storage from './storage'
import { Move } from './types/sync'

type MoveItem = {
	row?: number
	col?: number
	box?: string
	text?: string
}

export default function moveElements(moveData: Move) {
	const selectables = document.querySelectorAll<HTMLElement>('#time, #main, #widgets')
	let selected: HTMLElement | null

	function saveChanges(changes: MoveItem) {
		if (!selected) return false

		moveData = {
			...moveData,
			[selected.id]: {
				...moveData[selected.id],
				...changes,
			},
		}

		storage.sync.set({ move: moveData })
	}

	;(function initilisation() {
		selectables.forEach((elem) => {
			if (elem.id in moveData) {
				const { row, col, box, text } = moveData[elem.id]

				elem.style.gridArea = `${row} / ${col} / span 1 /span 1`
				elem.style.placeSelf = box
				elem.style.textAlign = text
			}
		})
	})()

	function removeSelection() {
		selectables.forEach((d) => d.classList.remove('move-selected'))
		selected = null
	}

	function toggleMoveStatus(e: KeyboardEvent) {
		if (e.key === 'm') {
			document.querySelector('#interface')?.classList.toggle('move-edit')
			removeSelection()
		}
	}

	function toggleElementSelection(elem: Element) {
		removeSelection()
		elem.classList.add('move-selected') // add clicked
		selected = elem as HTMLElement
	}

	function gridChange(button: Element) {
		if (!selected) {
			return false
		}

		// Get current row / col
		const current = {
			row: parseInt(selected.style.gridRowStart) || 0,
			col: parseInt(selected.style.gridColumnStart) || 0,
		}

		// Get button move amount
		const moveAmout = {
			row: parseInt(button.getAttribute('data-row') || '0'),
			col: parseInt(button.getAttribute('data-col') || '0'),
		}

		// Update row / col
		current.row = clamp(current.row + moveAmout.row, 1, selectables.length)
		current.col = clamp(current.col + moveAmout.col, 1, selectables.length)

		// Apply changes
		selected.style.gridColumn = current.col.toString() + '/ span 1'
		selected.style.gridRow = current.row.toString() + '/ span 1'

		saveChanges({ row: current.row, col: current.col })
	}

	function alignChange(button: Element, type: 'box' | 'text') {
		if (!selected) {
			return false
		}

		let align = ''

		if (type === 'box') {
			align = `${button.getAttribute('data-align')} ${button.getAttribute('data-justify')}`
			selected.style.placeSelf = align
		}

		if (type === 'text') {
			align = button.getAttribute('data-align') || ''
			selected.style.textAlign = align
		}

		saveChanges({ [type]: align })
	}

	//
	// Events
	//

	document.addEventListener('keypress', toggleMoveStatus)

	selectables.forEach((elem) => {
		elem.addEventListener('click', () => toggleElementSelection(elem))
	})

	document.querySelectorAll('#grid-mover button').forEach((button) => {
		button.addEventListener('click', () => gridChange(button))
	})

	document.querySelectorAll('#box-alignment-mover button').forEach((button) => {
		button.addEventListener('click', () => alignChange(button, 'box'))
	})

	document.querySelectorAll('#text-alignment-mover button').forEach((button) => {
		button.addEventListener('click', () => alignChange(button, 'text'))
	})
}
