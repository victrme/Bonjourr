import clamp from 'lodash.clamp'
import storage from './storage'
import { Move } from './types/sync'
import { syncDefaults } from './utils'

// get elem: move.layouts[move.selectedLayout][row][col]
// ex: move.layouts['triple'][2][1] ==> notes
// ex: move.layouts['triple'][0][2] ==> empty cell
// ex: move.layouts['single'][4][0] ==> linkblocks
// ex: move.layouts['single'][4][1] ==> does not exist

// in grid change with multiple layouts
// col: clamp(0, [max layout col -1])
// row: clamp(0, [max displayed element])

// /!\ 'wide left' & 'wide right' use grid-template-column 2fr 1fr with 'double' layout

//
// swap
//

// overlappedElem = {id: string, pos: [number, number]}

// if pos is not empty (move.layouts[move.selectedLayout][row][col] !== '')
// swap:
//  	assign wanted elem to overlappedElem
//		move elem to old selected position

// then on next move
//		if pos is empty
// 			move elem back to original position ([overlappedElem.pos[0], overlappedElem.pos[1]])
//			unassign overlappedElem (important)
//		if not
//			unassign overlappedElem (important)
//			back to swap step

//
// responsive
//

// > 764px => triple par defaut, sinon le selectedLayout
// <=764px => on force le single column

// window.addEventListener('resize', function forceSingleLayout() {
// 	if (this.window.innerWidth <= 764) {
// 		// changeLayout('single')
// 	}
// })

export default function moveElements(moveData: Move) {
	const doms = '#time, #main, #sb_container, #notes_container, #linkblocks, #quotes_container'
	const dominterface = document.querySelector<HTMLElement>('#interface')
	const selectables = document.querySelectorAll<HTMLElement>(doms)
	let selected: HTMLElement | null
	let overlappedElem: HTMLElement | null

	function getID(dom: HTMLElement | null) {
		// Uses dataset for widgets that uses dom ids that doesn't match storage fields (ex: id="x_container")
		return dom?.dataset.moveId || dom?.id || ''
	}

	function setGridAreas(grid: Move['layouts'][keyof Move['layouts']]) {
		let areas = ``

		grid.forEach((row) => {
			areas += `'${row.reduce((a, b) => a + ' ' + b)}' `
		})

		if (dominterface) {
			dominterface.style.gridTemplateAreas = areas
		}
	}

	function setAlignment(elem: HTMLElement, align: Move['align'][keyof Move['align']]) {
		if (typeof align.box === 'string') elem.style.placeSelf = align.box
		if (typeof align.text === 'string') elem.style.textAlign = align.text
	}

	;(function initilisation() {
		const { layouts, selectedLayout, align } = moveData

		// Layout
		setGridAreas(layouts[selectedLayout])

		// Align
		selectables.forEach((elem) => {
			const id = getID(elem)

			if (id in align) {
				setAlignment(elem, align[id as keyof Move['align']])
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

		const id = getID(selected)
		let activeLayout = moveData.layouts[moveData.selectedLayout]

		// Get current row / col
		const currentRow = activeLayout.findIndex((row) => row.find((col) => col === id))
		const currentCol = activeLayout[currentRow].findIndex((col) => col === id)

		// Get button move amount
		const moveRow = parseInt(button.dataset.row || '0')
		const moveCol = parseInt(button.dataset.col || '0')

		// Update row / col
		let newRow = clamp(currentRow + moveRow, 0, activeLayout.length - 1)
		let newCol = clamp(currentCol + moveCol, 0, activeLayout[0].length - 1)

		// swap
		let temp = activeLayout[currentRow][currentCol]

		activeLayout[currentRow][currentCol] = activeLayout[newRow][newCol]
		activeLayout[newRow][newCol] = temp

		// Apply changes
		setGridAreas(activeLayout)

		moveData.layouts[moveData.selectedLayout] = activeLayout
		storage.sync.set({ move: moveData })
	}

	function alignChange(button: HTMLButtonElement, type: 'box' | 'text') {
		const id = getID(selected)

		if (!selected || !(id in moveData.align)) {
			return false
		}

		// set align after determining id as valid key
		let align = { ...moveData.align[id as keyof Move['align']] }

		align[type] = button.dataset.align
		setAlignment(selected, align)

		// Update storage
		moveData.align[id as keyof Move['align']] = align
		storage.sync.set({ move: moveData })
	}

	function layoutChange(button: HTMLButtonElement) {
		// Todo: change manual layout check
		if (button.dataset.layout?.match(/single|double|triple/g)) {
			moveData.selectedLayout = button.dataset.layout as typeof moveData.selectedLayout
		}

		setGridAreas(moveData.layouts[moveData.selectedLayout])
		storage.sync.set({ move: moveData })
	}

	function handleReset(type: 'grid' | 'box' | 'text') {
		const { selectedLayout } = moveData

		if (type === 'grid') {
			moveData.layouts[moveData.selectedLayout] = syncDefaults.move.layouts[selectedLayout]
			setGridAreas(syncDefaults.move.layouts[selectedLayout])
		}

		if (type === 'box') {
			moveData.align = syncDefaults.move.align
		}

		if (type === 'text') {
			moveData.align = syncDefaults.move.align
		}

		storage.sync.set({ move: moveData })
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
