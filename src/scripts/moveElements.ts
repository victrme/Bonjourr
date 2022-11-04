import clamp from 'lodash.clamp'
import storage from './storage'
import { Move, MoveItem, Sync } from './types/sync'
import { syncDefaults, clas } from './utils'

export default function moveElements(move: Move, selection: Sync['moveSelection']) {
	const doms = '#time, #main, #sb_container, #notes_container, #linkblocks, #quotes_container'
	const dominterface = document.querySelector<HTMLElement>('#interface')
	const selectables = document.querySelectorAll<HTMLElement>(doms)
	let selectedDOM: HTMLElement | null

	type Layout = Move[keyof Move]

	//
	// Utils
	//

	function getID(dom: HTMLElement | null) {
		// Uses dataset for widgets that uses dom ids that doesn't match storage fields (ex: id="x_container")
		return dom?.dataset.moveId || dom?.id || null
	}

	function getItemList(layout: Layout) {
		return layout.flat().filter((a) => a?._id)
	}

	function getItem(itemList: MoveItem[], id: string | null) {
		return itemList.filter((a) => a?._id === id)[0] || null
	}

	function getItemPosition(layout: Layout, id: string) {
		const row = layout.findIndex((row) => row.find((col) => col?._id === id))
		const col = layout[row].findIndex((col) => col?._id === id)
		return { row, col }
	}

	//
	// Grid and Align
	//

	function layoutToGridAreas(layout: Layout) {
		let areas = ``

		const columnItemToString = (col: MoveItem) => (col?._id ? col._id : '.') // 3
		const itemListToString = (row: MoveItem[]) => row.map(columnItemToString).reduce((a, b) => `${a} ${b}`) // 2

		layout.forEach((row: MoveItem[]) => (areas += `'${itemListToString(row)}' `)) // 1

		return areas
	}

	function setGridAreas(layout: Layout) {
		if (dominterface) {
			dominterface.style.gridTemplateAreas = layoutToGridAreas(layout)
		}
	}

	function setAlign(elem: HTMLElement, item?: MoveItem) {
		if (typeof item?.box === 'string') elem.style.placeSelf = item.box
		if (typeof item?.text === 'string') elem.style.textAlign = item.text
	}

	function setAllAligns(layout: Layout) {
		const itemList = getItemList(layout)

		selectables.forEach((elem) => {
			setAlign(elem, getItem(itemList, getID(elem)))
		})
	}

	//
	// Buttons class control / selection
	//

	function removeSelection() {
		selectables.forEach((d) => d.classList.remove('move-selected'))
		selectedDOM = null
		btnSelectionAlign(null)
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
	function toggleElementSelection(elem: Element) {
		const layout = move[selection]
		const id = getID(elem as HTMLElement)
		const item = getItem(getItemList(layout), id)

		if (id) {
			removeSelection()
			btnSelectionAlign(item)
			gridMoveEdgesControl(layout, id)
		}

		elem.classList.add('move-selected') // add clicked
		selectedDOM = elem as HTMLElement
	}

	function gridMoveEdgesControl(layout: Layout, id: string) {
		const { row, col } = getItemPosition(layout, id)

		document.querySelectorAll<HTMLButtonElement>('#grid-mover button').forEach((b) => {
			const c = parseInt(b.dataset.col || '0')
			const r = parseInt(b.dataset.row || '0')

			// btn is up/down => test rows, left/right => test cols
			const disable = c === 0 ? layout[row + r] === undefined : layout[row][col + c] === undefined

			disable ? b?.setAttribute('disabled', '') : b?.removeAttribute('disabled')
		})
	}

	function btnSelectionLayout(sel: keyof Move) {
		document.querySelectorAll<HTMLButtonElement>('#grid-layout button').forEach((b) => {
			clas(b, b.dataset.layout === sel, 'selected')
		})
	}

	function btnSelectionAlign(item: MoveItem) {
		const boxBtns = document.querySelectorAll<HTMLButtonElement>('#box-alignment-mover button')
		const textBtns = document.querySelectorAll<HTMLButtonElement>('#text-alignment-mover button')

		boxBtns.forEach((b) => clas(b, b.dataset.align === item?.box, 'selected'))
		textBtns.forEach((b) => clas(b, b.dataset.align === item?.text, 'selected'))
	}

	function resetBtnControl(layout: Layout) {
		const btn = document.querySelector<HTMLButtonElement>('#reset-layout')
		const isSameGrid = layoutToGridAreas(layout) === layoutToGridAreas(syncDefaults.move[selection])
		const isSameAlign = getItemList(layout).filter((item) => item?.box !== '' || item?.text !== '').length === 0

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
		if (!selectedDOM) return

		const id = getID(selectedDOM)
		let layout = move[selection]

		if (!id) return

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

		gridMoveEdgesControl(move[selection], id)
		resetBtnControl(move[selection])
	}

	function alignChange(button: HTMLButtonElement, type: 'box' | 'text') {
		const id = getID(selectedDOM)

		if (!selectedDOM || !id) return

		const layout = move[selection]
		const item = getItem(getItemList(layout), id)
		const { row, col } = getItemPosition(layout, id)

		if (item) {
			item[type] = button.dataset.align || ''

			setAlign(selectedDOM, item)
			btnSelectionAlign(item)
			resetBtnControl(layout)

			// Update storage
			move[selection][row][col] = item
			storage.sync.set({ move: move })
		}
	}

	function layoutChange(button: HTMLButtonElement) {
		if ((button.dataset.layout || 'triple') in move) {
			selection = (button.dataset.layout || 'triple') as keyof Move
		}

		const layout = move[selection]
		const id = getID(selectedDOM)

		setAllAligns(layout)
		setGridAreas(layout)
		resetBtnControl(layout)
		btnSelectionLayout(selection)

		if (id) {
			const item = getItem(getItemList(layout), id)
			gridMoveEdgesControl(layout, id)
			btnSelectionAlign(item)
		}

		storage.sync.set({ moveSelection: selection })
	}

	function layoutReset() {
		// Todo: don't select layout manually
		if (selection === 'single') move.single = syncDefaults.move.single
		if (selection === 'double') move.double = syncDefaults.move.double
		if (selection === 'triple') move.triple = syncDefaults.move.triple

		setAllAligns(move[selection])
		setGridAreas(move[selection])
		resetBtnControl(move[selection])
		removeSelection()

		storage.sync.set({ move: move })
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
		btnSelectionLayout(selection)
		resetBtnControl(move[selection])

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
