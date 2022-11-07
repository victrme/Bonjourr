import clamp from 'lodash.clamp'
import clonedeep from 'lodash.clonedeep'
import storage from './storage'
import { Move, MoveKeys, MoveItem, Sync } from './types/sync'
import { syncDefaults, clas } from './utils'

export default function moveElements(init: Move) {
	const doms = '#time, #main, #sb_container, #notes_container, #linkblocks, #quotes_container'
	const dominterface = document.querySelector<HTMLElement>('#interface')
	const selectables = document.querySelectorAll<HTMLElement>(doms)
	let selectedDOM: HTMLElement | null
	let selectedID: MoveKeys | null
	let smallWidth = false
	let lastSelection: Move['selection']

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
			const elemID = elem?.dataset.moveId || elem?.id

			if (elemID in items) {
				setAlign(elem, items[elemID as MoveKeys])
			}
		})
	}

	//
	// Buttons class control / selection
	//

	function removeSelection() {
		selectables.forEach((d) => d.classList.remove('move-selected'))
		selectedDOM = null
		selectedID = null
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

	function resetBtnControl(move: Move) {
		const btn = document.querySelector<HTMLButtonElement>('#reset-layout')
		const defaultGrid = syncDefaults.move.layouts[move.selection].grid
		const layout = move.layouts[move.selection]

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

	type Update = {
		is: 'select' | 'grid' | 'box' | 'text' | 'layout' | 'reset' | 'responsive'
		button?: HTMLButtonElement
		elem?: HTMLElement
	}

	function updateMoveElement({ is, elem, button }: Update) {
		storage.sync.get('move', (data) => {
			let move: Move

			// Check if storage has move, if not, use (/ deep clone) default move
			move = 'move' in data ? data.move : clonedeep(syncDefaults.move)

			// force single on small width
			if (smallWidth) {
				move.selection = 'single'
			}

			function gridChange() {
				if (!selectedDOM || !selectedID || !button) return

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

				gridMoveEdgesControl(grid, selectedID)
				resetBtnControl(move)

				storage.sync.set({ move: move })
			}

			function alignChange(type: 'box' | 'text') {
				if (!selectedDOM || !selectedID || !button) return

				const layout = move.layouts[move.selection]
				const item = layout.items[selectedID]

				item[type] = button.dataset.align || ''

				setAlign(selectedDOM, item)
				btnSelectionAlign(item)
				resetBtnControl(move)

				// Update storage
				move.layouts[move.selection].items[selectedID] = item
				storage.sync.set({ move: move })
			}

			function layoutChange(selection?: Move['selection']) {
				if (!selection && button) {
					// button dataset is wrong somehow
					if (!((button.dataset.layout || 'triple') in move.layouts)) return
				}

				// Only update selection if coming from user
				if (is !== 'responsive' && button) {
					move.selection = (button.dataset.layout || 'triple') as Move['selection']
					storage.sync.set({ move: move })
				}

				// Use new selection
				const layout = move.layouts[move.selection]

				setAllAligns(layout.items)
				setGridAreas(layout.grid)
				resetBtnControl(move)
				btnSelectionLayout(move.selection)

				if (selectedID) {
					gridMoveEdgesControl(layout.grid, selectedID)
					btnSelectionAlign(layout.items[selectedID])
				}
			}

			function layoutReset() {
				// Todo: don't select layout manually
				const { single, double, triple } = syncDefaults.move.layouts
				if (move.selection === 'single') move.layouts.single = clonedeep(single)
				if (move.selection === 'double') move.layouts.double = clonedeep(double)
				if (move.selection === 'triple') move.layouts.triple = clonedeep(triple)

				const layout = move.layouts[move.selection]

				setAllAligns(layout.items)
				setGridAreas(layout.grid)
				resetBtnControl(move)
				removeSelection()

				storage.sync.set({ move: move })
			}

			function elementSelection() {
				const layout = move.layouts[move.selection]
				const id = elem?.dataset.moveId || elem?.id

				removeSelection()

				// Only remove selection modifiers if failed to get id
				if (!id || !(id in layout.items)) {
					return
				}

				btnSelectionAlign(layout.items[id as MoveKeys])
				gridMoveEdgesControl(layout.grid, id as MoveKeys)

				elem.classList.add('move-selected') // add clicked

				selectedDOM = elem as HTMLElement
				selectedID = id as MoveKeys
			}

			switch (is) {
				case 'select':
					elementSelection()
					break

				case 'grid':
					gridChange()
					break

				case 'box':
					alignChange('box')
					break

				case 'text':
					alignChange('text')
					break

				case 'layout':
					layoutChange()
					break

				case 'reset':
					layoutReset()

				case 'responsive':
					layoutChange()
					break
			}
		})
	}

	//
	// Init
	//

	;(function initilisation() {
		// Detect small width on startup
		if (window.innerWidth < 764) {
			init.selection = 'single'
		}

		const layout = init.layouts[init.selection]

		setAllAligns(layout.items)
		setGridAreas(layout.grid)
		btnSelectionLayout(init.selection)
	})()

	//
	// Events
	//

	setTimeout(() => {
		document.addEventListener('keypress', toggleMoveStatus)

		selectables.forEach((elem) => {
			elem.addEventListener('click', () => updateMoveElement({ is: 'select', elem: elem }))
		})

		document.querySelectorAll<HTMLButtonElement>('#grid-layout button').forEach((button) => {
			button.addEventListener('click', () => updateMoveElement({ is: 'layout', button }))
		})

		document.querySelectorAll<HTMLButtonElement>('#grid-mover button').forEach((button) => {
			button.addEventListener('click', () => updateMoveElement({ is: 'grid', button }))
		})

		document.querySelectorAll<HTMLButtonElement>('#box-alignment-mover button').forEach((button) => {
			button.addEventListener('click', () => updateMoveElement({ is: 'box', button }))
		})

		document.querySelectorAll<HTMLButtonElement>('#text-alignment-mover button').forEach((button) => {
			button.addEventListener('click', () => updateMoveElement({ is: 'text', button }))
		})

		document
			.querySelector<HTMLButtonElement>('#reset-layout')
			?.addEventListener('click', () => updateMoveElement({ is: 'reset' }))
		document.querySelector<HTMLButtonElement>('#close-mover')?.addEventListener('click', () => toggleMoveStatus())

		// Trigger a layout change when width is crosses threshold
		window.addEventListener('resize', () => {
			if (window.innerWidth < 764 && !smallWidth) smallWidth = true
			if (window.innerWidth > 764 && smallWidth) smallWidth = false

			updateMoveElement({ is: 'responsive' })
		})
	}, 200)
}
