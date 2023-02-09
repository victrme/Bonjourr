import clamp from 'lodash.clamp'
import clonedeep from 'lodash.clonedeep'
import storage from './storage'
import { Move, MoveKeys, MoveItem, Sync } from './types/sync'
import { syncDefaults, clas, $, tradThis } from './utils'
import { toggleWidgets } from '.'

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

type Layout = Move['layouts'][keyof Move['layouts']]

type InterfaceWidgetControl = {
	id: MoveKeys
	on: boolean
}

type UpdateMove = {
	widget?: InterfaceWidgetControl
	span?: 'col' | 'row'
	reset?: true
	toggle?: true
	box?: string
	text?: string
	layout?: string
	select?: string
	responsive?: true
	grid?: { x?: string; y?: string }
}

let smallWidth = false
const dominterface = document.querySelector<HTMLElement>('#interface')
const elements = {
	time: $('time'),
	main: $('main'),
	quicklinks: $('linkblocks'),
	searchbar: $('sb_container'),
	notes: $('notes_container'),
	quotes: $('quotes_container'),
}

let activeID: MoveKeys | null

// Utils (no dom uses or manipulation)

const isEditing = () => dominterface?.classList.contains('move-edit') || false

function areaStringToLayoutGrid(area: string) {
	// Remove first and last char quotes
	area = area.substring(1, area.length - 2)

	// Quotes / double quotes are inverted on firefox, try other split if first failed
	let rows: string[] = area.split('" "')
	if (rows.length === 1) rows = area.split("' '")

	let grid = rows.map((row) => row.replace('"', '').split(' '))
	return grid
}

function layoutToGridAreas(grid: Layout['grid']) {
	let areas = ``

	const itemListToString = (row: string[]) => row.reduce((a, b) => `${a} ${b}`) // 2
	grid.forEach((row: string[]) => (areas += `'${itemListToString(row)}' `)) // 1

	return areas
}

function getEnabledWidgetsFromStorage(data: Sync) {
	// Get each widget state from their specific storage
	let displayed = {
		quotes: !!data.quotes?.on,
		notes: !!data.notes?.on,
		searchbar: !!data.searchbar?.on,
		quicklinks: data.quicklinks,
	}

	return Object.entries(displayed)
		.filter(([key, val]) => val)
		.map(([key, val]) => key as MoveKeys)
}

function getEnabledWidgetsFromGrid(grid: Layout['grid']) {
	let flat = [...grid.flat()]
	flat = flat.filter((str) => str !== '.') // remove empty cells
	flat = flat.filter((str, i) => flat.indexOf(str) === i) // remove duplicates
	return flat
}

function findIdPositions(grid: Layout['grid'], id: string) {
	const allpos: { posCol: number; posRow: number }[] = []

	grid.flat().forEach((a, i) => {
		if (a !== id) return
		allpos.push({
			posCol: i % grid[0].length,
			posRow: Math.floor(i / grid[0].length),
		})
	})

	return allpos
}

function getSpanDirection(grid: Layout['grid'], id: string) {
	const poses = findIdPositions(grid, id)
	const rows = Object.values(poses).map(({ posRow }) => posRow)

	if (poses.length < 2) return 'none'
	if (rows[0] !== rows[1]) return 'columns'
	else return 'rows'
}

function hasDuplicateInArray(arr: string[], id?: string) {
	return arr.filter((a) => a === (id || activeID)).length > 1
}

function spansInGridArea(grid: Layout['grid'], id: MoveKeys, { toggle, remove }: { toggle?: 'row' | 'col'; remove?: true }) {
	function addSpans(arr: string[]) {
		let target = arr.indexOf(id)
		let stopper = [false, false]

		function replaceWithId(a: string[], i: number, lim: number) {
			// not stopping and elem exit
			if (!stopper[lim] && a[i]) {
				if (a[i] === '.') a[i] = id // replaces dot with id
				else if (a[i] !== id) stopper[lim] = true // other ? stop
			}

			return a
		}

		// in [., a, ., ., target, ., b, ., .]
		for (let ii = 1; ii < arr.length; ii++) {
			arr = replaceWithId(arr, target + ii, 0) // replaces until b
			arr = replaceWithId(arr, target - ii, 1) // replaces until a
		}

		return arr
	}

	function removeSpans(arr: string[]) {
		let keepfirst = true
		return arr.map((a) => {
			if (a === id) {
				if (keepfirst) keepfirst = false
				else return '.'
			}
			return a
		})
	}

	/*
		For columns and rows:
		mutate column by adding / removing duplicates 
		mutate grid with new column
		update buttons with recheck duplication (don't assume duped work everytime) 
	*/

	const { posCol, posRow } = findIdPositions(grid, id)[0]
	let col = grid.map((g) => g[posCol])
	let row = [...grid[posRow]]

	if (remove) {
		col = removeSpans(col)
		row = removeSpans(row)
	}

	if (toggle) {
		if (toggle === 'col') col = hasDuplicateInArray(col) ? removeSpans(col) : addSpans(col)
		if (toggle === 'row') row = hasDuplicateInArray(row) ? removeSpans(row) : addSpans(row)
	}

	grid.forEach((r, i) => (grid[i][posCol] = col[i])) // Row changes
	grid[posRow].forEach((r, i) => (grid[posRow][i] = row[i])) // Column changes

	return grid
}

function gridWidget(grid: Layout['grid'], id: MoveKeys, add: boolean) {
	function addWidget() {
		// in triple colum, default colum is [x, here, x]
		const targetCol = grid[0].length === 3 ? 1 : 0
		let index = 2

		// Quotes always at the bottom
		if (id === 'quotes') index = grid.length

		// Quick links above quotes, below the rest
		if (id === 'quicklinks') {
			const lastItemIsQuotes = grid[grid.length - 1][targetCol] === 'quotes'
			index = lastItemIsQuotes ? grid.length - 1 : grid.length
		}

		//
		// Apply
		//

		function fillNewRow(cell: string, i: number) {
			if (!cell || cell === '.') return

			const positions = findIdPositions(grid, cell)

			// remove spans on targeted cell
			if (i === targetCol && positions.length > 1) {
				grid = spansInGridArea(grid, cell as MoveKeys, { remove: true })
				return
			}

			// keep column spans on adjacent columns
			if (getSpanDirection(grid, cell) === 'columns') {
				newrow[i] = cell
			}
		}

		// Adding last row, duplicates above and replace middle id
		let newrow = grid[0].map(() => '.')
		const isLastRow = grid[index] === undefined

		grid[index - (isLastRow ? 1 : 0)].forEach((cell, i) => fillNewRow(cell, i))
		grid.splice(index, 0, newrow as any) // Todo: typeof JeComprendPasLa
		grid[index][targetCol] = id

		return grid
	}

	function removeWidget() {
		// remove id from grid
		for (const i in grid) {
			for (const k in grid[i]) {
				if (grid[i][k] === id) grid[i][k] = '.'
			}
		}

		// Removes only one empty row
		let hasRemovedRow = false

		grid.forEach((row, i) => {
			const emptyCellsOnly = row.filter((cell) => {
				// If dot, or cell is used as a col / row span
				return cell === '.' || getSpanDirection(grid, cell) !== 'none'
			})

			if (!hasRemovedRow && emptyCellsOnly.length === row.length) {
				grid.splice(i, 1)
				hasRemovedRow = true
			}
		})

		return grid
	}

	if (add) return addWidget()
	else return removeWidget()
}

// Funcs (modifies dom in some ways)

function setGridAreas(layout: Layout) {
	if (dominterface) {
		dominterface.style.setProperty('--grid', layoutToGridAreas(layout.grid))
		dominterface.style.setProperty('--rows', '1fr '.repeat(layout.grid.length)) // adds variable for grid-template-rows
	}
}

function setAlign(id: MoveKeys, item?: MoveItem) {
	const elem = elements[id]
	if (elem) {
		elem.style.placeSelf = item?.box || ''

		if (id !== 'quicklinks') {
			elem.style.textAlign = item?.text || ''
		} else {
			// Special align for quicklinks, bc must be display flex
			const flex = item?.text == 'left' ? 'flex-start' : item?.text == 'right' ? 'flex-end' : ''
			elem.style.justifyContent = flex
		}
	}
}

function setAllAligns(items: Layout['items']) {
	Object.keys(elements).forEach((key) => {
		if (key in items) {
			const id = key as MoveKeys
			setAlign(id, items[id])
		}
	})
}

function manageGridSpanner(selection: string) {
	if (selection !== 'single') {
		$('grid-spanner-container')?.classList.add('active')
	} else {
		$('grid-spanner-container')?.classList.remove('active')
	}
}

const gridOverlay = {
	add: (id: MoveKeys) => {
		const button = document.createElement('button')
		button.id = 'move-overlay-' + id
		button.className = 'move-overlay'
		dominterface?.appendChild(button)

		button.addEventListener('click', () => {
			moveElements(null, { select: id })
		})
	},

	remove: (id: MoveKeys) => {
		document.querySelector('#move-overlay-' + id)?.remove()
	},

	removeAll: () => {
		document.querySelectorAll('.move-overlay').forEach((d) => d.remove())
	},
}

const buttonControl = {
	layout: (selection: Move['selection']) => {
		document.querySelectorAll<HTMLButtonElement>('#grid-layout button').forEach((b) => {
			clas(b, b.dataset.layout === selection, 'selected')
		})
	},

	grid: (id: MoveKeys) => {
		const grid = areaStringToLayoutGrid(dominterface?.style.getPropertyValue('--grid') || '')
		if (grid.length === 0) return

		let top = false,
			bottom = false,
			left = false,
			right = false

		// Detect if element is on array limits
		grid.forEach((row, i) => {
			if (row.some((a) => a === id) && i === 0) top = true
			if (row.some((a) => a === id) && i === grid.length - 1) bottom = true
			if (row.at(0) === id) left = true
			if (row.at(-1) === id) right = true
		})

		// link button to correct limit, apply disable attr
		document.querySelectorAll<HTMLButtonElement>('#grid-mover button').forEach((b) => {
			const c = parseInt(b.dataset.col || '0')
			const r = parseInt(b.dataset.row || '0')
			let limit = false

			if (r === -1) limit = top
			if (r === 1) limit = bottom
			if (c === -1) limit = left
			if (c === 1) limit = right

			limit ? b?.setAttribute('disabled', '') : b?.removeAttribute('disabled')
		})
	},

	span: (id: MoveKeys) => {
		function applyStates(dir: 'col' | 'row', state: boolean) {
			const dirButton = document.querySelector(`#grid-span-${dir}s`)
			const otherButton = document.querySelector(`#grid-span-${dir === 'col' ? 'rows' : 'cols'}`)

			if (state) otherButton?.setAttribute('disabled', '')
			else otherButton?.removeAttribute('disabled')

			clas(dirButton, state, 'selected')
		}

		const grid = areaStringToLayoutGrid(dominterface?.style.getPropertyValue('--grid') || '') as Layout['grid']
		if (grid.length === 0) return

		const { posCol, posRow } = findIdPositions(grid, id)[0]
		let col = grid.map((g) => g[posCol])
		let row = [...grid[posRow]]

		applyStates('col', hasDuplicateInArray(col, id))
		applyStates('row', hasDuplicateInArray(row, id))
	},

	align: (item?: MoveItem) => {
		const boxBtns = document.querySelectorAll<HTMLButtonElement>('#box-alignment-mover button')
		const textBtns = document.querySelectorAll<HTMLButtonElement>('#text-alignment-mover button')

		boxBtns.forEach((b) => clas(b, b.dataset.align === (item?.box || ''), 'selected'))
		textBtns.forEach((b) => clas(b, b.dataset.align === (item?.text || ''), 'selected'))
	},

	title: (id?: MoveKeys | null) => {
		let titlestr = ''
		const editingNames = {
			time: tradThis('Time & Date'),
			main: tradThis('Weather'),
			notes: tradThis('Notes'),
			searchbar: tradThis('Search bar'),
			quotes: tradThis('Quotes'),
			quicklinks: tradThis('Quick Links'),
		}

		titlestr = id ? editingNames[id] : tradThis('No selection')
		$('mover-title')!.textContent = titlestr
	},
}

function removeSelection() {
	activeID = null
	buttonControl.align() // without params, selects 0 align
	buttonControl.title()

	document.querySelectorAll('.grid-spanner')?.forEach((elem) => {
		elem.removeAttribute('disabled')
		clas(elem, false, 'selected')
	})

	document.querySelectorAll<HTMLDivElement>('.move-overlay').forEach((elem) => {
		elem.classList.remove('selected')
	})

	document.querySelectorAll<HTMLButtonElement>('#grid-mover button').forEach((b) => {
		b.removeAttribute('disabled')
	})
}

export default function moveElements(init: Move | null, events?: UpdateMove) {
	const moverdom = document.querySelector('#element-mover')
	let firstPos = { x: 0, y: 0 }
	let moverPos = { x: 0, y: 0 }

	function updateMoveElement(prop: UpdateMove) {
		storage.sync.get(['searchbar', 'notes', 'quotes', 'quicklinks', 'move'], (data) => {
			let move: Move

			// Check if storage has move, if not, use (/ deep clone) default move
			move = 'move' in data ? data.move : clonedeep(syncDefaults.move)
			// force single on small width
			if (smallWidth) move.selection = 'single'

			function gridChange() {
				if (!activeID) return

				// Get button move amount
				const y = parseInt(prop.grid?.y || '0')
				const x = parseInt(prop.grid?.x || '0')

				let { grid } = move.layouts[move.selection]
				const allActivePos = findIdPositions(grid, activeID)
				const allAffectedIds: MoveKeys[] = []

				// step 1: Find elements affected by grid change
				allActivePos.forEach(({ posRow, posCol }) => {
					const newposition = grid[posRow + y][posCol + x]

					if (newposition !== '.') {
						allAffectedIds.push(newposition as MoveKeys)
					}
				})

				// step 2: remove conflicting fillings on affected elements
				allAffectedIds.forEach((id) => {
					if (findIdPositions(grid, id).length > 1) {
						grid = spansInGridArea(grid, id, { remove: true })
					}
				})

				// step 3: replace all active position with affected
				allActivePos.forEach(({ posRow, posCol }) => {
					const newRow = clamp(posRow + y, 0, grid.length - 1)
					const newCol = clamp(posCol + x, 0, grid[0].length - 1)

					let tempItem = grid[posRow][posCol]
					grid[posRow][posCol] = grid[newRow][newCol]
					grid[newRow][newCol] = tempItem
				})

				// step 4: profit ??????????????
				setGridAreas(move.layouts[move.selection])
				move.layouts[move.selection].grid = grid

				buttonControl.grid(activeID)

				storage.sync.set({ move: move })
			}

			function alignChange(type: 'box' | 'text') {
				if (!activeID) return

				const layout = move.layouts[move.selection]
				const item = layout.items[activeID] || { box: '', text: '' }

				item[type] = prop.box || prop.text || ''

				setAlign(activeID, item)
				buttonControl.align(item)

				// Update storage
				move.layouts[move.selection].items[activeID] = item
				storage.sync.set({ move: move })
			}

			function layoutChange() {
				// Only update selection if coming from user
				move.selection = (prop.layout || 'single') as Move['selection']
				storage.sync.set({ move: move })

				// Assign layout after mutating move
				const layout = move.layouts[move.selection]
				const widgetsInGrid = getEnabledWidgetsFromGrid(layout.grid)

				// This triggers interface fade
				toggleWidgets({
					notes: widgetsInGrid.includes('notes'),
					quotes: widgetsInGrid.includes('quotes'),
					searchbar: widgetsInGrid.includes('searchbar'),
					quicklinks: widgetsInGrid.includes('quicklinks'),
				})

				setTimeout(() => {
					setAllAligns(layout.items)
					setGridAreas(layout)
					buttonControl.layout(move.selection)
					manageGridSpanner(move.selection)
					removeSelection()

					// Toggle overlays if we are editing
					if (dominterface?.classList.contains('move-edit')) {
						gridOverlay.removeAll()
						widgetsInGrid.forEach((id) => gridOverlay.add(id as MoveKeys))
					}

					if (activeID) {
						buttonControl.grid(activeID)
						buttonControl.align(layout.items[activeID])
					}
				}, 200) // same duration as toggleWidgets interfaceFade.apply
			}

			function layoutReset() {
				function addEnabledWidgetsToGrid(grid: Layout['grid']) {
					// Filters "on" widgets, adds all widgets to grid
					// remove quicklinks here bc its in reset data already
					const enabledWidgets = getEnabledWidgetsFromStorage(data as Sync)

					enabledWidgets.forEach((id) => {
						if (id === 'quicklinks') return
						grid = gridWidget(grid, id, true)
					})

					// Specifically remove quicklinks because it will
					// always be "on" since it is using default settings
					if (!enabledWidgets.includes('quicklinks')) {
						grid = gridWidget(grid, 'quicklinks', false)
					}

					return grid
				}

				// DEEP CLONE is important as to not mutate sync defaults (it shouldn't come to this, but here we are)
				// Destructure layout to appease typescript
				const { grid } = structuredClone(syncDefaults.move.layouts)[move.selection]

				move.layouts[move.selection].grid = addEnabledWidgetsToGrid(grid)
				move.layouts[move.selection].items = {}

				// Assign layout after mutating move
				const layout = move.layouts[move.selection]

				removeSelection()
				buttonControl.title()
				setGridAreas(layout)

				// Reset aligns
				setAllAligns({
					quicklinks: { box: '', text: '' },
					main: { box: '', text: '' },
					time: { box: '', text: '' },
					notes: { box: '', text: '' },
					searchbar: { box: '', text: '' },
					quotes: { box: '', text: '' },
				})

				// Save
				storage.sync.set({ move: move })
			}

			function elementSelection() {
				const layout = move.layouts[move.selection]

				removeSelection()

				// Remove selection modifiers and quit if failed to get id
				if (!isEditing() || !prop.select) return

				const id = prop.select as MoveKeys

				buttonControl.align(layout.items[id])
				buttonControl.span(id)
				buttonControl.grid(id)
				buttonControl.title(id)

				$('move-overlay-' + id)!.classList.add('selected') // add clicked
				$('element-mover')?.classList.add('active')

				activeID = id
			}

			function toggleMoveStatus() {
				if (dominterface?.classList.contains('move-edit')) {
					gridOverlay.removeAll()
				} else {
					buttonControl.layout(move.selection)
					const ids = getEnabledWidgetsFromStorage(data as Sync).concat(['main', 'time'])
					ids.forEach((id) => gridOverlay.add(id))
				}

				const mover = $('element-mover')
				mover?.classList.toggle('hidden')
				mover?.classList.remove('active')
				dominterface?.classList.toggle('move-edit')
				removeSelection()
			}

			function toggleGridSpans(dir: 'col' | 'row') {
				if (!activeID) return

				const layout = move.layouts[move.selection]
				layout.grid = spansInGridArea(layout.grid, activeID, { toggle: dir })

				setGridAreas(layout)
				buttonControl.grid(activeID)
				buttonControl.span(activeID)

				storage.sync.set({ move: move })
			}

			function toggleWidgetsOnGrid() {
				if (!events?.widget) return

				const { id, on } = events?.widget
				const layout = { ...move.layouts[move.selection] }

				move.layouts[move.selection].grid = gridWidget(layout.grid, id, on)

				removeSelection()
				setGridAreas(move.layouts[move.selection])
				setAllAligns(move.layouts[move.selection].items)

				// add/remove widget overlay only when editing move
				if (isEditing()) {
					on ? gridOverlay.add(id) : gridOverlay.remove(id)
				}

				storage.sync.set({ move: move }, () => console.log('saved from move', performance.now()))
			}

			switch (Object.keys(prop)[0]) {
				case 'toggle':
					toggleMoveStatus()
					break

				case 'select':
					elementSelection()
					break

				case 'grid':
					gridChange()
					break

				case 'span':
					toggleGridSpans(prop.span!)
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
					// layoutChange()
					break

				case 'widget':
					toggleWidgetsOnGrid()
					break
			}
		})
	}

	function moverToolboxEvents() {
		function moverDrag(e: Event) {
			if (e.type !== 'mousemove') return
			const { x, y } = e as MouseEvent

			// Set first position to calc offset
			if (firstPos.x === 0 && firstPos.y === 0) {
				firstPos = { x: x - moverPos.x, y: y - moverPos.y }
				return
			}

			moverPos = {
				x: x - firstPos.x,
				y: y - firstPos.y,
			}
			;(moverdom as HTMLElement).style.transform = `translate(${moverPos.x}px, ${moverPos.y}px)`
			;(moverdom as HTMLElement).style.cursor = `grabbing`
		}

		Object.entries(elements).forEach(([key, elem]) => {
			elem?.addEventListener('click', () => updateMoveElement({ select: key }))
		})

		document.querySelectorAll<HTMLButtonElement>('#grid-mover button').forEach((btn) => {
			btn.addEventListener('click', () => updateMoveElement({ grid: { x: btn.dataset.col, y: btn.dataset.row } }))
		})

		document.querySelectorAll<HTMLButtonElement>('#box-alignment-mover button').forEach((btn) => {
			btn.addEventListener('click', () => updateMoveElement({ box: btn.dataset.align }))
		})

		document.querySelectorAll<HTMLButtonElement>('#text-alignment-mover button').forEach((btn) => {
			btn.addEventListener('click', () => updateMoveElement({ text: btn.dataset.align }))
		})

		document.querySelector<HTMLButtonElement>('#close-mover')?.addEventListener('click', () => {
			updateMoveElement({ toggle: true })
		})

		document.querySelector<HTMLButtonElement>('#grid-span-cols')?.addEventListener('click', () => {
			updateMoveElement({ span: 'col' })
		})

		document.querySelector<HTMLButtonElement>('#grid-span-rows')?.addEventListener('click', () => {
			updateMoveElement({ span: 'row' })
		})

		moverdom?.addEventListener('mousedown', (e) => {
			if ((e.target as HTMLElement)?.id === 'element-mover') {
				moverdom?.addEventListener('mousemove', moverDrag)
			}
		})

		const removeDrag = () => {
			firstPos = { x: 0, y: 0 }
			;(moverdom as HTMLElement).style.removeProperty('cursor')
			moverdom?.removeEventListener('mousemove', moverDrag)
		}

		moverdom?.addEventListener('mouseup', removeDrag)
		moverdom?.addEventListener('mouseleave', removeDrag)

		// Trigger a layout change when width is crosses threshold
		window.addEventListener('resize', () => {
			if (window.innerWidth < 764 && !smallWidth) smallWidth = true
			if (window.innerWidth > 764 && smallWidth) smallWidth = false
			updateMoveElement({ responsive: true })
		})
	}

	// Events coming from settings menu
	if (events) {
		if (events?.select) updateMoveElement({ select: events.select })
		if (events?.widget) updateMoveElement({ widget: events.widget })
		if (events?.layout) updateMoveElement({ layout: events.layout })
		if (events?.toggle) updateMoveElement({ toggle: true })
		if (events?.reset) updateMoveElement({ reset: true })
		return
	}

	// Init events coming from mover toolbox
	setTimeout(() => moverToolboxEvents(), 200)

	// First launch from version without move data
	if (!init && !events) {
		updateMoveElement({ reset: true })
		return
	}

	if (init) {
		;(function initilisation() {
			// Detect small width on startup
			if (window.innerWidth < 764) init.selection = 'single'

			const layout = init.layouts[init.selection]
			manageGridSpanner(init.selection)
			setAllAligns(layout.items)
			setGridAreas(layout)
		})()
	}
}
