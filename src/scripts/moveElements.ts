import clamp from 'lodash.clamp'
import storage from './storage'
import { Move, MoveItem, Sync } from './types/sync'

export default function moveElements(move: Move, selection: Sync['moveSelection']) {
	const doms = '#time, #main, #sb_container, #notes_container, #linkblocks, #quotes_container'
	const dominterface = document.querySelector<HTMLElement>('#interface')
	const selectables = document.querySelectorAll<HTMLElement>(doms)
	let selectedDOM: HTMLElement | null

	type Layout = Move[keyof Move]

	function getID(dom: HTMLElement | null) {
		// Uses dataset for widgets that uses dom ids that doesn't match storage fields (ex: id="x_container")
		return dom?.dataset.moveId || dom?.id || ''
	}

	function getItemList(layout: Layout) {
		return layout.flat().filter((a) => a?._id)
	}

	function getItem(itemList: MoveItem[], id: string) {
		return itemList.filter((a) => a?._id === id)[0]
	}

	function getItemPosition(layout: Layout, id: string) {
		const row = layout.findIndex((row) => row.find((col) => col?._id === id))
		const col = layout[row].findIndex((col) => col?._id === id)
		return { row, col }
	}

	function setGridAreas(grid: Layout) {
		let areas = ``

		const columnItemToString = (col: MoveItem) => (col?._id ? col._id : '.') // 3
		const itemListToString = (row: MoveItem[]) => row.map(columnItemToString).reduce((a, b) => `${a} ${b}`) // 2

		grid.forEach((row: MoveItem[]) => (areas += `'${itemListToString(row)}' `)) // 1

		if (dominterface) {
			dominterface.style.gridTemplateAreas = areas
		}
	}

	function setAlign(elem: HTMLElement, item: MoveItem) {
		if (item?.box) elem.style.placeSelf = item.box
		if (item?.text) elem.style.textAlign = item.text
	}

	function setAllAligns(layout: Layout) {
		const itemList = getItemList(layout)

		selectables.forEach((elem) => {
			setAlign(elem, getItem(itemList, getID(elem)))
		})
	}

	function removeSelection() {
		selectables.forEach((d) => d.classList.remove('move-selected'))
		selectedDOM = null
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
		selectedDOM = elem as HTMLElement
	}

	function gridChange(button: HTMLButtonElement) {
		if (!selectedDOM) {
			return false
		}

		const id = getID(selectedDOM)
		let layout = [...move[selection]]

		// Get button move amount
		const y = parseInt(button.dataset.row || '0')
		const x = parseInt(button.dataset.col || '0')

		// Get current row / col
		const currR = layout.findIndex((row) => row.find((col) => col?._id === id))
		const currC = layout[currR].findIndex((col) => col?._id === id)

		// Update row / col
		const newR = clamp(currR + y, 0, layout.length - 1)
		const newC = clamp(currC + x, 0, layout[0].length - 1)

		// swap items
		let tempItem = move[selection][currR][currC]
		move[selection][currR][currC] = move[selection][newR][newC]
		move[selection][newR][newC] = tempItem

		// Apply changes
		setGridAreas(move[selection])
		storage.sync.set({ move: move })
	}

	function alignChange(button: HTMLButtonElement, type: 'box' | 'text') {
		const id = getID(selectedDOM)
		const layout = move[selection]
		const item = getItem(getItemList(layout), id)
		const { row, col } = getItemPosition(layout, id)

		if (!selectedDOM) {
			return false
		}

		if (item) {
			item[type] = button.dataset.align || ''

			setAlign(selectedDOM, item)

			// Update storage
			move[selection][row][col] = item
			storage.sync.set({ move: move })
		}
	}

	function layoutChange(button: HTMLButtonElement) {
		const val = button.dataset.layout || 'triple'

		if (val in move) {
			selection = val as keyof Move
		}

		setAllAligns(move[selection])
		setGridAreas(move[selection])

		storage.sync.set({ moveSelection: selection })
	}

	function handleReset(type: 'grid' | 'box' | 'text') {
		// const { selectedLayout } = moveData
		// if (type === 'grid') {
		// 	moveData.layouts[moveData.selectedLayout] = syncDefaults.move.layouts[selectedLayout]
		// 	setGridAreas(syncDefaults.move.layouts[selectedLayout])
		// }
		// if (type === 'box') {
		// 	moveData.align = syncDefaults.move.align
		// }
		// if (type === 'text') {
		// 	moveData.align = syncDefaults.move.align
		// }
		// storage.sync.set({ move: moveData })
	}

	//
	// Init
	//

	;(function initilisation() {
		const layout = move[selection]
		setGridAreas(layout)
		setAllAligns(layout)
	})()

	//
	// Events
	//

	setTimeout(() => {
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
	}, 200)
}
