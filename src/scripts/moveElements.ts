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
	id: MoveKeys
	on: boolean
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

	function gridWidget() {
		function add(grid: Layout['grid'], id: MoveKeys) {
			// in triple colum, default colum is [x, here, x]
			const middleColumn = grid[0].length === 3 ? 1 : 0
			let index = grid.length - 1

			// Searchbar and notes always appear in the middle
			// Quotes always at the bottom
			if (id === 'searchbar' || id === 'notes') index = 2
			if (id === 'quotes') index = grid.length - 1

			// If space is available, simply replace and return
			if (grid[index][middleColumn] === '.') {
				grid[index][middleColumn] = id
				return grid
			}

			// Not available ? create new row
			let newrow = grid[0].map(() => '.') // return [.] | [., .] | [., ., .] ????
			grid.splice(index, 0, newrow as any) // Todo: typeof JeComprendPasLa
			grid[index][middleColumn] = id

			return grid
		}

		function remove(grid: Layout['grid'], id: MoveKeys) {
			// remove id from grid
			for (const i in grid) {
				for (const k in grid[i]) {
					if (grid[i][k] === id) grid[i][k] = '.'
				}
			}

			// if an empty row is found, removes it and quits
			let hasRemovedRow = false
			for (const ii in grid) {
				if (isRowEmpty(grid, parseInt(ii)) && !hasRemovedRow) {
					grid.splice(parseInt(ii), 1)
					hasRemovedRow = true
				}
			}

			return grid
		}

		return { add, remove }
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
		is: 'select' | 'widget' | 'grid' | 'span-rows' | 'box' | 'text' | 'layout' | 'reset' | 'responsive'
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

				// Assign layout after mutating move
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
				const { quotes, searchbar, notes } = data as Sync
				const { add } = gridWidget()

				// Get each widget state from their specific storage
				// Not quicklinks because it is already enabled in default grid
				let displayed = {
					quotes: !!quotes?.on,
					searchbar: !!searchbar?.on,
					notes: !!notes?.on,
				}

				// Filters "on" widgets, adds all widgets to grid
				function addEnabledWidgetsToGrid(grid: Layout['grid']) {
					Object.entries(displayed)
						.filter(([key, val]) => val)
						.forEach(([key, val]) => (grid = add(grid, key as MoveKeys)))
					return grid
				}

				// DEEP CLONE is important as to not mutate sync defaults (it shouldn't come to this, but here we are)
				// Destructure layout to appease typescript
				Object.entries(clonedeep(syncDefaults.move.layouts)).forEach(([key, layout]) => {
					const selection = key as Move['selection']
					const { grid, items } = layout

					move.layouts[selection].grid = addEnabledWidgetsToGrid(grid)
					move.layouts[selection].items = items
				})

				// Assign layout after mutating move
				const layout = move.layouts[move.selection]

				setAllAligns(layout.items)
				setGridAreas(layout)
				resetBtnControl(move)
				removeSelection()

				// Save
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

			function addOrRemmoveWidgets() {
				if (!widget) return

				const { add, remove } = gridWidget()

				// For all layouts
				Object.entries(move.layouts).forEach(([key, layout]) => {
					const { id, on } = widget
					const selection = key as Move['selection']
					move.layouts[selection].grid = on ? add(layout.grid, id) : remove(layout.grid, id)
				})

				removeSelection()
				setGridAreas(move.layouts[move.selection])
				setAllAligns(move.layouts[move.selection].items)

				storage.sync.set({ move: move }, () => {
					setTimeout(() => {
						sessionStorage.throttledWidgetInput = '' // initParams events in settings.ts
					}, 256) // increase throttle time for dramatic purposes
				})
			}

			switch (is) {
				case 'select':
					elementSelection()
					break

				case 'grid':
					gridChange()
					break

				case 'span-rows': {
					// toggleGridSpans()
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

				case 'widget':
					addOrRemmoveWidgets()
					break
			}
		})
	}

	if (widget) {
		updateMoveElement({ is: 'widget' })
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
