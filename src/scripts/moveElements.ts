import clamp from 'lodash.clamp'
import clonedeep from 'lodash.clonedeep'
import storage from './storage'
import { Move, MoveKeys, MoveItem, Sync } from './types/sync'
import { syncDefaults, clas } from './utils'

// ┌──────────────────────────────────────┐
// │   ┌────────────┐  ┌────────────┐     │
// │   │ Utils      ◄──┤ Funcs      ◄──┐  │
// │   └─────▲──────┘  └────▲───────┘  │  │
// │   ┌─────┴──────────────┴───────┐  │  │
// │   │ Updates                    │  │  │
// │   └────────────────────▲───────┘  │  │
// │   ┌─────────────┐      │          │  │
// │   │ On load     │      │          │  │
// │   │ ┌────────┐  │      │          │  │
// │   │ │ Init   ├──┼──────┼──────────┘  │
// │   │ └────────┘  │      │             │
// │   │ ┌────────┐  │      │             │
// │   │ │ Events ├──┼──────┘             │
// │   │ └────────┘  │                    │
// │   └─────────────┘                    │
// └──────────────────────────────────────┘

type InterfaceWidgetControl = {
	id: string
	which: 'add' | 'remove'
}

export default function moveElements(init: Move | null, widget?: InterfaceWidgetControl) {
	const doms = '#time, #main, #sb_container, #notes_container, #linkblocks, #quotes_container'
	const dominterface = document.querySelector<HTMLElement>('#interface')
	const selectables = document.querySelectorAll<HTMLElement>(doms)
	let selectedDOM: HTMLElement | null
	let selectedID: MoveKeys | null
	let smallWidth = false

	type Layout = Move['layouts'][keyof Move['layouts']]

	//
	// Utils
	//

	function getItemPosition(grid: Layout['grid'], id: string) {
		const row = grid.findIndex((row) => row.find((col) => col === id))
		const col = grid[row].findIndex((col) => col === id)
		return { row, col }
	}

	function isRowEmpty(grid: Layout['grid'], index: number) {
		if (grid[index]) {
			return grid[index].filter((col) => col !== '.').length === 0
		}

		return true
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

	function setGridAreas(layout: Layout) {
		// const spanList = Object.entries(layout.items)
		// 	.map(([k, v]) => {
		// 		if (v.rowspan) return k as MoveKeys
		// 	})
		// 	.filter((k) => k)

		// spanList.forEach((item) => {
		// 	if (item) {
		// 		layout.grid = spanRowsInGridArea(layout.grid, item)
		// 	}
		// })

		if (dominterface) {
			dominterface.style.setProperty('--grid', layoutToGridAreas(layout.grid))
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

	function addElemFromGrid(grid: Layout['grid'], id: MoveKeys) {
		const isTriple = grid[0].length === 3
		let index = grid.length

		if (id === 'searchbar') index = 2
		if (id === 'notes') index = 2
		if (id === 'quotes') index = grid.length

		if (isRowEmpty(grid, grid.length - 1) === false) {
			let newrow: string[] = new Array(grid[0].length).fill('.')
			grid.splice(index, 0, [...newrow])
		}

		grid[index][isTriple ? 1 : 0] = id

		return grid
	}

	function removeElemFromGrid(grid: Layout['grid'], id: MoveKeys) {
		// remove id from grid
		grid = grid.map((row) => row.map((col) => (col === id ? '.' : col)))

		// if any one (1) row is empty, suppr
		let hasRemovedRow = false

		grid.forEach((e, i) => {
			if (isRowEmpty(grid, i) && !hasRemovedRow) {
				grid.splice(i, 1)
				hasRemovedRow = true
			}
		})

		return grid
	}

	// function spanRowsInGridArea(grid: Layout['grid'], id: MoveKeys) {
	// 	// [., a, ., b, ., ., target, ., .,., c, .]
	// 	// last = a ... last = b ... last === target ? keep last
	// 	// { start: last, end: target }
	// 	// next = c
	// 	// { start: target, end: next }

	// 	const { col } = getItemPosition(grid, id)
	// 	const list = grid.map((g) => g[col])
	// 	let last = 0
	// 	let next = 0
	// 	let target = list.indexOf(id)

	// 	list.forEach((e, i) => {
	// 		if (i < target) {
	// 			if (e !== '.') last = i + 1
	// 		}

	// 		if (i > target && next === 0) {
	// 			if (e !== '.') next = i - 1
	// 			if (i === list.length - 1) next = i
	// 		}
	// 	})

	// 	for (let i = last; i <= next; i++) {
	// 		grid[i][col] = id
	// 	}

	// 	return grid
	// }

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
		is: 'select' | 'remove' | 'add' | 'grid' | 'span-rows' | 'box' | 'text' | 'layout' | 'reset' | 'responsive'
		button?: HTMLButtonElement
		elem?: HTMLElement
	}

	function updateMoveElement({ is, elem, button }: Update) {
		storage.sync.get(['searchbar', 'notes', 'quotes', 'quicklinks', 'move'], (data) => {
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
				setGridAreas(move.layouts[move.selection])
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
				setGridAreas(layout)
				resetBtnControl(move)
				btnSelectionLayout(move.selection)

				if (selectedID) {
					gridMoveEdgesControl(layout.grid, selectedID)
					btnSelectionAlign(layout.items[selectedID])
				}
			}

			function layoutReset() {
				const { quicklinks, quotes, searchbar, notes } = data as Sync
				let displayed = {
					quicklinks: quicklinks,
					quotes: quotes.on,
					searchbar: searchbar.on,
					notes: notes?.on,
				}

				console.log(displayed)

				function withAddedWidgets(layout: Layout) {
					Object.entries(displayed)
						.filter((o) => o[1])
						.forEach(([key, val]) => {
							layout.grid = addElemFromGrid(layout.grid, key as MoveKeys)
						})

					return layout
				}

				// Todo: don't select layout manually
				const { single, double, triple } = clonedeep(syncDefaults.move.layouts)

				if (move.selection === 'single') move.layouts.single = withAddedWidgets(single)
				if (move.selection === 'double') move.layouts.double = withAddedWidgets(double)
				if (move.selection === 'triple') move.layouts.triple = withAddedWidgets(triple)

				const layout = move.layouts[move.selection]

				setAllAligns(layout.items)
				setGridAreas(layout)
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

			// function toggleGridSpans() {
			// 	const layout = clonedeep(move.layouts[move.selection])

			// 	if (selectedID) {
			// 		layout.grid = spanRowsInGridArea(layout.grid, selectedID)
			// 		layout.items[selectedID].rowspan = true

			// 		setGridAreas(layout)

			// 		move.layouts[move.selection].items[selectedID].rowspan = true
			// 		storage.sync.set({ move: move })
			// 	}
			// }

			function addOrRemElements() {
				removeSelection()

				const { single, double, triple } = move.layouts

				if (widget && widget.which === 'add') {
					single.grid = addElemFromGrid(single.grid, widget.id as MoveKeys)
					double.grid = addElemFromGrid(double.grid, widget.id as MoveKeys)
					triple.grid = addElemFromGrid(triple.grid, widget.id as MoveKeys)
				}

				if (widget && widget.which === 'remove') {
					single.grid = removeElemFromGrid(single.grid, widget.id as MoveKeys)
					double.grid = removeElemFromGrid(double.grid, widget.id as MoveKeys)
					triple.grid = removeElemFromGrid(triple.grid, widget.id as MoveKeys)
				}

				setGridAreas(move.layouts[move.selection])
				setAllAligns(move.layouts[move.selection].items)

				storage.sync.set({ move: move })
			}

			switch (is) {
				case 'select':
					elementSelection()
					break

				case 'grid':
					gridChange()
					break

				case 'span-rows': {
					toggleGridSpans()
					break
				}

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

				case 'add':
				case 'remove':
					addOrRemElements()
					break
			}
		})
	}

	if (widget) {
		updateMoveElement({ is: widget.which })
	}

	if (init) {
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
			setGridAreas(layout)
			btnSelectionLayout(init.selection)
		})()

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

			document.querySelector<HTMLButtonElement>('#reset-layout')?.addEventListener('click', () => {
				updateMoveElement({ is: 'reset' })
			})

			document.querySelector<HTMLButtonElement>('#close-mover')?.addEventListener('click', () => toggleMoveStatus())

			// document.querySelector<HTMLButtonElement>('#grid-span-rows')?.addEventListener('click', () => {
			// 	updateMoveElement({ is: 'span-rows' })
			// })

			// Trigger a layout change when width is crosses threshold
			window.addEventListener('resize', () => {
				if (window.innerWidth < 764 && !smallWidth) smallWidth = true
				if (window.innerWidth > 764 && smallWidth) smallWidth = false

				updateMoveElement({ is: 'responsive' })
			})
		}, 200)
	}
}
