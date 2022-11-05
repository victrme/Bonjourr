import clamp from 'lodash.clamp'
import storage from './storage'
import { Move, MoveKeys, MoveItem } from './types/sync'
import { syncDefaults, clas } from './utils'

export default function moveElements(move: Move) {
	const doms = '#time, #main, #sb_container, #notes_container, #linkblocks, #quotes_container'
	const dominterface = document.querySelector<HTMLElement>('#interface')
	const selectables = document.querySelectorAll<HTMLElement>(doms)
	let selectedDOM: HTMLElement | null
	let selectedID: MoveKeys = 'time'

	type Layout = Move['layouts'][keyof Move['layouts']]

	//
	// Utils
	//

	function getItemPosition(grid: Layout['grid'], id: string) {
		const row = grid.findIndex((row) => row.find((col) => col === id))
		const col = grid[row].findIndex((col) => col === id)
		return { row, col }
	}

	//
	// Grid and Align
	//

	function layoutToGridAreas(grid: Layout['grid']) {
		let areas = ``

		const itemListToString = (row: string[]) => row.reduce((a, b) => `${a} ${b}`) // 2
		grid.forEach((row: string[]) => (areas += `'${itemListToString(row)}' `)) // 1

		return areas
	}

	function setGridAreas(grid: Layout['grid']) {
		if (dominterface) {
			dominterface.style.setProperty('grid', layoutToGridAreas(grid))
		}
	}

	function setAlign(elem: HTMLElement, item?: MoveItem) {
		if (typeof item?.box === 'string') elem.style.placeSelf = item.box
		if (typeof item?.text === 'string') elem.style.textAlign = item.text
	}

	function setAllAligns(items: Layout['items']) {
		selectables.forEach((elem) => {
			setAlign(elem, items[selectedID])
		})
	}

	//
	// Buttons class control / selection
	//

	function removeSelection() {
		selectables.forEach((d) => d.classList.remove('move-selected'))
		selectedDOM = null
		btnSelectionAlign()
		document.querySelectorAll<HTMLButtonElement>('#grid-mover button').forEach((b) => {
			b.removeAttribute('disabled')
		})
	}

	function toggleMoveStatus(e?: KeyboardEvent) {
		const toggle = () => {
			document.querySelector('#interface')?.classList.toggle('move-edit')
			removeSelection()
		}

		e ? (e.key === 'm' ? toggle() : '') : toggle()
	}

	// Todo: Impure function (don't use move here)
	function toggleElementSelection(elem: HTMLElement) {
		const layout = move.layouts[move.selection]
		const id = elem?.dataset.moveId || elem?.id

		removeSelection()

		// Only remove selection modifiers if failed to get id
		if (!(id in layout.items)) {
			return
		}

		btnSelectionAlign(layout.items[id as MoveKeys])
		gridMoveEdgesControl(layout.grid, id as MoveKeys)

		elem.classList.add('move-selected') // add clicked

		selectedDOM = elem as HTMLElement
		selectedID = id as MoveKeys
	}

	function gridMoveEdgesControl(grid: Layout['grid'], id: MoveKeys) {
		const { row, col } = getItemPosition(grid, id)

		document.querySelectorAll<HTMLButtonElement>('#grid-mover button').forEach((b) => {
			const c = parseInt(b.dataset.col || '0')
			const r = parseInt(b.dataset.row || '0')

			// btn is up/down => test rows, left/right => test cols
			const disable = c === 0 ? grid[row + r] === undefined : grid[row][col + c] === undefined

			disable ? b?.setAttribute('disabled', '') : b?.removeAttribute('disabled')
		})
	}

	function btnSelectionLayout(selection: Move['selection']) {
		document.querySelectorAll<HTMLButtonElement>('#grid-layout button').forEach((b) => {
			clas(b, b.dataset.layout === selection, 'selected')
		})
	}

	function btnSelectionAlign(item?: MoveItem) {
		const boxBtns = document.querySelectorAll<HTMLButtonElement>('#box-alignment-mover button')
		const textBtns = document.querySelectorAll<HTMLButtonElement>('#text-alignment-mover button')

		boxBtns.forEach((b) => clas(b, b.dataset.align === item?.box, 'selected'))
		textBtns.forEach((b) => clas(b, b.dataset.align === item?.text, 'selected'))
	}

	function resetBtnControl(layout: Layout) {
		const btn = document.querySelector<HTMLButtonElement>('#reset-layout')
		const defaultGrid = syncDefaults.move.layouts[move.selection].grid

		const isSameGrid = layoutToGridAreas(layout.grid) === layoutToGridAreas(defaultGrid)
		const isSameAlign = Object.values(layout.items).filter(({ box, text }) => box !== '' || text !== '').length === 0

		if (isSameGrid && isSameAlign) {
			btn?.setAttribute('disabled', '')
		} else {
			btn?.removeAttribute('disabled')
		}
	}

	//
	// Updates
	//

	function gridChange(button: HTMLButtonElement) {
		if (!selectedDOM || !selectedID) return

		const { grid } = move.layouts[move.selection]

		// Get button move amount
		const y = parseInt(button.dataset.row || '0')
		const x = parseInt(button.dataset.col || '0')

		// Get current row / col
		const currR = grid.findIndex((row) => row.find((col) => col === selectedID))
		const currC = grid[currR].findIndex((col) => col === selectedID)

		// Update row / col
		const newR = clamp(currR + y, 0, grid.length - 1)
		const newC = clamp(currC + x, 0, grid[0].length - 1)

		// swap items
		let tempItem = grid[currR][currC]
		grid[currR][currC] = grid[newR][newC]
		grid[newR][newC] = tempItem

		// Apply changes
		setGridAreas(grid)

		move.layouts[move.selection].grid = grid
		storage.sync.set({ move: move })

		gridMoveEdgesControl(grid, selectedID)
		resetBtnControl(move.layouts[move.selection])
	}

	function alignChange(button: HTMLButtonElement, type: 'box' | 'text') {
		if (!selectedDOM || !selectedID) return

		const layout = move.layouts[move.selection]
		const item = layout.items[selectedID]

		item[type] = button.dataset.align || ''

		setAlign(selectedDOM, item)
		btnSelectionAlign(item)
		resetBtnControl(layout)

		// Update storage
		move.layouts[move.selection].items[selectedID] = item
		storage.sync.set({ move: move })
	}

	function layoutChange(button: HTMLButtonElement) {
		if (!selectedDOM || !selectedID) return // No ID
		if (!((button.dataset.layout || 'triple') in move)) return // button dataset is wrong somehow

		// Update selection
		move.selection = (button.dataset.layout || 'triple') as Move['selection']

		// Use new selection
		const layout = move.layouts[move.selection]

		setAllAligns(layout.items)
		setGridAreas(layout.grid)
		resetBtnControl(layout)
		btnSelectionLayout(move.selection)

		gridMoveEdgesControl(layout.grid, selectedID)
		btnSelectionAlign(layout.items[selectedID])

		storage.sync.set({ move: move })
	}

	function layoutReset() {
		// Todo: don't select layout manually
		const { single, double, triple } = syncDefaults.move.layouts
		if (move.selection === 'single') move.layouts.single = single
		if (move.selection === 'double') move.layouts.double = double
		if (move.selection === 'triple') move.layouts.triple = triple

		const layout = move.layouts[move.selection]

		setAllAligns(layout.items)
		setGridAreas(layout.grid)
		resetBtnControl(layout)
		removeSelection()

		storage.sync.set({ move: move })
	}

	//
	// Init
	//

	;(function initilisation() {
		const { grid, items } = move.layouts[move.selection]
		setGridAreas(grid)
		setAllAligns(items)
	})()

	//
	// Events
	//

	setTimeout(() => {
		btnSelectionLayout(move.selection)
		resetBtnControl(move.layouts[move.selection])

		document.addEventListener('keypress', toggleMoveStatus)

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

		document.querySelector<HTMLButtonElement>('#reset-layout')?.addEventListener('click', layoutReset)
		document.querySelector<HTMLButtonElement>('#close-mover')?.addEventListener('click', () => toggleMoveStatus())
	}, 200)
}
