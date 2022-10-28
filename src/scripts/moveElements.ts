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
	const doms = '#time, #main, #sb_container, #notes_container, #linkblocks, #quotes_container'
	const selectables = document.querySelectorAll<HTMLElement>(doms)
	let selected: HTMLElement | null

	function getID(dom: HTMLElement) {
		// Uses dataset for widgets that uses dom ids that doesn't match storage fields (ex: id="x_container")
		return dom?.dataset.moveId || dom?.id || ''
	}

	function saveChanges(changes: MoveItem) {
		if (!selected) return false

		moveData = {
			...moveData,
			[getID(selected)]: {
				...moveData[getID(selected)],
				...changes,
			},
		}

		storage.sync.set({ move: moveData })
	}

	;(function initilisation() {
		selectables.forEach((elem) => {
			const elemID = getID(elem)

			if (elemID in moveData) {
				const { row, col, box, text } = moveData[elemID]

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

	function gridChange(button: HTMLButtonElement) {
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
			row: parseInt(button.dataset.row || '0'),
			col: parseInt(button.dataset.col || '0'),
		}

		// Update row / col
		current.row = clamp(current.row + moveAmout.row, 1, selectables.length)
		current.col = clamp(current.col + moveAmout.col, 1, selectables.length)

		// Apply changes
		selected.style.gridColumn = current.col + '/ span 1'
		selected.style.gridRow = current.row + '/ span 1'

		saveChanges({ row: current.row, col: current.col })
	}

	function alignChange(button: HTMLButtonElement, type: 'box' | 'text') {
		if (!selected) {
			return false
		}

		let align = ''

		if (type === 'box') {
			align = `${button.dataset.align} ${button.dataset.justify}`
			selected.style.placeSelf = align
		}

		if (type === 'text') {
			align = button.dataset.align || ''
			selected.style.textAlign = align
		}

		saveChanges({ [type]: align })
	}

	function layoutChange(button: HTMLButtonElement) {
		const dominterface = document.querySelector('#interface') as HTMLDivElement
		let layout = button.dataset.layout || '1fr 1fr 1fr'

		dominterface.style.gridTemplateColumns = layout
		storage.sync.set({ moveLayout: layout })
	}

	function handleReset(type: 'grid' | 'box' | 'text') {
		selectables.forEach((elem, i) => {
			selected = elem

			if (type === 'grid') {
				saveChanges({ row: i + 1, col: 2 })
				selected.style.gridRow = i + 1 + '/ span 1'
				selected.style.gridColumn = '2 / span 1'
			}

			if (type === 'box') {
				saveChanges({ box: 'center center' })
				selected.style.placeSelf = 'center center'
			}

			if (type === 'text') {
				saveChanges({ text: 'center' })
				selected.style.textAlign = 'center'
			}
		})
	}

	//
	// Events
	//

	document.addEventListener('keypress', toggleMoveStatus)

	document.querySelector('#move-reset-grid')?.addEventListener('click', () => handleReset('grid'))
	document.querySelector('#move-reset-box')?.addEventListener('click', () => handleReset('box'))
	document.querySelector('#move-reset-text')?.addEventListener('click', () => handleReset('text'))

	selectables.forEach((elem) => {
		elem.addEventListener('click', () => toggleElementSelection(elem))
	})

	document.querySelectorAll<HTMLButtonElement>('#grid-layout button').forEach((button) => {
		button.addEventListener('click', () => layoutChange(button))
	})

	document.querySelectorAll<HTMLButtonElement>('#grid-mover button').forEach((button) => {
		button.addEventListener('click', () => gridChange(button))
	})

	document.querySelectorAll<HTMLButtonElement>('#box-alignment-mover button').forEach((button) => {
		button.addEventListener('click', () => alignChange(button, 'box'))
	})

	document.querySelectorAll<HTMLButtonElement>('#text-alignment-mover button').forEach((button) => {
		button.addEventListener('click', () => alignChange(button, 'text'))
	})
}
