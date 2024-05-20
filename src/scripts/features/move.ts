import { BROWSER, SYNC_DEFAULT } from '../defaults'
import onSettingsLoad from '../utils/onsettingsload'
import { tradThis } from '../utils/translations'
import storage from '../storage'
import transitioner from '../utils/transitioner'

// -------------------------------------------------|
// These types and storage design will have to go	|
// which makes this mess ok :)						|
// -------------------------------------------------|

type Layout = Sync.Move.Layout
type Grid = Layout['grid']
type Key = Sync.Move.Key
type Item = Sync.Move.Item
type Selection = Sync.Move.Selection

type Move = Sync.Storage['move']

type UpdateMove = {
	widget?: [Widgets, boolean]
	span?: 'col' | 'row'
	reset?: true
	toggle?: true
	box?: string
	text?: string
	layout?: string
	select?: string
	responsive?: true
	overlay?: boolean
	grid?: { x?: string; y?: string }
}

const dominterface = document.querySelector<HTMLElement>('#interface')
const elements = {
	time: document.getElementById('time'),
	main: document.getElementById('main'),
	quicklinks: document.getElementById('linkblocks'),
	searchbar: document.getElementById('sb_container'),
	notes: document.getElementById('notes_container'),
	quotes: document.getElementById('quotes_container'),
}

let smallWidth = false
let activeID: Key | null
let resetTimeout: number

// Utils (no dom uses or manipulation)

const isEditing = () => dominterface?.classList.contains('move-edit') || false

function widgetsListToData(list: [Widgets, boolean][], data: Sync.Storage): Sync.Storage {
	const widgets: { [key in Widgets]?: boolean } = {}
	list.forEach(([id, on]) => (widgets[id] = on))

	if (widgets?.time !== undefined) {
		data.time = widgets.time
	}

	if (widgets?.main !== undefined) {
		data.main = widgets.main
	}

	if (widgets?.quicklinks !== undefined) {
		data.quicklinks = widgets.quicklinks
	}

	if (widgets?.searchbar !== undefined) {
		data.searchbar = { ...data.searchbar, on: widgets.searchbar }
	}

	if (widgets?.quotes !== undefined) {
		data.quotes = { ...data.quotes, on: widgets.quotes }
	}

	if (widgets?.notes !== undefined && data.notes) {
		data.notes = { ...data.notes, on: widgets.notes }
	}

	return data
}

function areaStringToLayoutGrid(area: string) {
	let splitchar = BROWSER === 'safari' ? `\"` : "'"
	let rows = area.split(splitchar).filter((a) => a.length > 1)
	let grid = rows.map((r) => r.split(' '))

	return grid as Grid
}

function layoutToGridAreas(grid: Grid) {
	let areas = ``

	const itemListToString = (row: string[]) => row.reduce((a, b) => `${a} ${b}`) // 2
	grid.forEach((row: string[]) => (areas += `'${itemListToString(row)}' `)) // 1

	return areas
}

function getEnabledWidgetsFromStorage(data: Sync.Storage) {
	// BAD: DO NOT CHANGE THIS OBJECT ORDER AS IT WILL BREAK LAYOUT RESET
	// Time & main in first place ensures grid size is enough to add quotes & links
	let displayed = {
		time: data.time,
		main: data.main,
		notes: !!data.notes?.on,
		searchbar: !!data.searchbar?.on,
		quicklinks: data.quicklinks,
		quotes: !!data.quotes?.on,
	}

	return Object.entries(displayed)
		.filter(([_, val]) => val)
		.map(([key, _]) => key as Key)
}

function getEnabledWidgetsFromGrid(grid: Grid): Key[] {
	let flat = [...grid.flat()]
	flat = flat.filter((str) => str !== '.') // remove empty cells
	flat = flat.filter((str, i) => flat.indexOf(str) === i) // remove duplicates
	return flat as Key[]
}

function findIdPositions(grid: Grid, id: string) {
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

function getSpanDirection(grid: Grid, id: string) {
	const poses = findIdPositions(grid, id)
	const rows = Object.values(poses).map(({ posRow }) => posRow)

	if (poses.length < 2) return 'none'
	if (rows[0] !== rows[1]) return 'columns'
	else return 'rows'
}

function hasDuplicateInArray(arr: string[], id?: string) {
	return arr.filter((a) => a === (id || activeID)).length > 1
}

function isRowEmpty(grid: Grid, index: number) {
	if (grid[index] === undefined) return false

	let row = grid[index]
	let empty = true

	row.forEach((cell) => {
		if (cell !== '.' && getSpanDirection(grid, cell) !== 'columns') {
			empty = false
		}
	})

	return empty
}

function spansInGridArea(grid: Grid, id: Key, { toggle, remove }: { toggle?: 'row' | 'col'; remove?: true }) {
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

export function gridWidget(grid: Grid, selection: Selection, id: Key, add: boolean) {
	function addWidget() {
		if (grid.length === 0) {
			if (selection === 'single') return [[id]]
			if (selection === 'double') return [[id, '.']]
			if (selection === 'triple') return [['.', id, '.']]
		}

		// in triple column, default column is [x, here, x]
		const targetCol = grid[0].length === 3 ? 1 : 0
		let index = grid.length === 1 ? 1 : 2

		if (id === 'time') index = 0
		if (id === 'main') index = grid[0][targetCol] === 'time' ? 1 : 0
		if (id === 'quotes') index = grid.length
		if (id === 'quicklinks') {
			const isLastQuotes = grid[grid.length - 1][targetCol] === 'quotes'
			index = isLastQuotes ? grid.length - 1 : grid.length
		}

		//
		// Apply
		//

		function fillNewRow(cell: string, i: number) {
			if (!cell || cell === '.') return

			const positions = findIdPositions(grid, cell)

			// remove spans on targeted cell
			if (i === targetCol && positions.length > 1) {
				grid = spansInGridArea(grid, cell as Key, { remove: true })
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

		grid.forEach((_, i) => {
			if (isRowEmpty(grid, i)) {
				grid.splice(i, 1)
			}
		})

		return grid
	}

	return add ? addWidget() : removeWidget()
}

// Funcs (modifies dom in some ways)

function setGridAreas(grid: Grid) {
	document.documentElement.style.setProperty('--grid', layoutToGridAreas(grid))
}

function setAlign(id: Key, item?: Item) {
	const elem = elements[id]

	if (elem) {
		elem.style.placeSelf = item?.box || ''

		if (id === 'quicklinks') {
			document.getElementById('linkblocks')?.classList.remove('align-start', 'align-end')
			if (item?.text == 'left') document.getElementById('linkblocks')?.classList.add('align-start')
			if (item?.text == 'right') document.getElementById('linkblocks')?.classList.add('align-end')
		} else {
			elem.style.textAlign = item?.text || ''
		}
	}
}

function setAllAligns(items: Layout['items']) {
	Object.keys(elements).forEach((key) => {
		const id = key as Key
		setAlign(id, items[id])
	})
}

function manageGridSpanner(selection: string) {
	selection !== 'single'
		? document.getElementById('grid-spanner-container')?.classList.add('active')
		: document.getElementById('grid-spanner-container')?.classList.remove('active')
}

const gridOverlay = {
	add: (id: Key) => {
		const button = document.createElement('button')
		button.id = 'move-overlay-' + id
		button.className = 'move-overlay'
		dominterface?.appendChild(button)

		button.addEventListener('click', () => {
			moveElements(undefined, { select: id })
		})
	},

	remove: (id: Key) => {
		document.querySelector('#move-overlay-' + id)?.remove()
	},

	removeAll: () => {
		document.querySelectorAll('.move-overlay').forEach((d) => d.remove())
	},
}

const buttonControl = {
	layout: (selection: Selection) => {
		document.querySelectorAll<HTMLButtonElement>('#grid-layout button').forEach((button) => {
			button.classList.toggle('selected', button.dataset.layout === selection)
		})
	},

	grid: (id: Key) => {
		const grid = areaStringToLayoutGrid(document.documentElement?.style.getPropertyValue('--grid') || '')
		if (grid.length === 0) return

		let top = false
		let bottom = false
		let left = false
		let right = false

		const positions = findIdPositions(grid, id)
		const widgetBottomLimit = getEnabledWidgetsFromGrid(grid).length - 1
		const rightLimit = grid[0].length - 1

		// Detect if element is on array limits
		positions.forEach((pos) => {
			if (pos.posRow === 0) top = true
			if (pos.posCol === 0) left = true
			if (pos.posCol === rightLimit) right = true
			if (pos.posRow === widgetBottomLimit) bottom = true

			// Bottom limit when last elem on last line
			if (pos.posRow === grid.length - 1) {
				const idOnlyRow = grid.at(pos.posRow)?.filter((id) => id !== '.')
				if (new Set(idOnlyRow).size === 1) bottom = true
			}
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

	span: (id: Key) => {
		function applyStates(dir: 'col' | 'row', state: boolean) {
			const dirButton = document.querySelector(`#grid-span-${dir}s`)
			const otherButton = document.querySelector(`#grid-span-${dir === 'col' ? 'rows' : 'cols'}`)

			if (state) otherButton?.setAttribute('disabled', '')
			else otherButton?.removeAttribute('disabled')

			dirButton?.classList.toggle('selected', state)
		}

		const grid = areaStringToLayoutGrid(document.documentElement?.style.getPropertyValue('--grid') || '') as Grid
		if (grid.length === 0) return

		const { posCol, posRow } = findIdPositions(grid, id)[0]
		let col = grid.map((g) => g[posCol])
		let row = [...grid[posRow]]

		applyStates('col', hasDuplicateInArray(col, id))
		applyStates('row', hasDuplicateInArray(row, id))
	},

	align: (item?: Item) => {
		const boxBtns = document.querySelectorAll<HTMLButtonElement>('#box-alignment-mover button')
		const textBtns = document.querySelectorAll<HTMLButtonElement>('#text-alignment-mover button')

		boxBtns.forEach((b) => b.classList.toggle('selected', b.dataset.align === (item?.box || '')))
		textBtns.forEach((b) => b.classList.toggle('selected', b.dataset.align === (item?.text || '')))
	},

	title: (id?: Key | null) => {
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
		document.getElementById('mover-title')!.textContent = titlestr
	},
}

function removeSelection() {
	activeID = null
	buttonControl.align() // without params, selects 0 align
	buttonControl.title()

	document.querySelectorAll('.grid-spanner')?.forEach((elem) => {
		elem.removeAttribute('disabled')
		elem?.classList.remove('selected')
	})

	document.querySelectorAll<HTMLDivElement>('.move-overlay').forEach((elem) => {
		elem.classList.remove('selected')
	})

	document.querySelectorAll<HTMLButtonElement>('#grid-mover button').forEach((b) => {
		b.removeAttribute('disabled')
	})
}

function resetButtonConfirm(): boolean {
	const b_resetlayout = document.getElementById('b_resetlayout') as HTMLButtonElement
	const confirm = !!b_resetlayout.dataset.confirm

	clearTimeout(resetTimeout)

	if (confirm === false) {
		b_resetlayout.textContent = tradThis('Are you sure?')
		b_resetlayout.dataset.confirm = 'true'

		resetTimeout = setTimeout(() => {
			b_resetlayout.textContent = tradThis('Reset layout')
			b_resetlayout.dataset.confirm = ''
		}, 1000)
	} else {
		b_resetlayout.textContent = tradThis('Reset layout')
		b_resetlayout.dataset.confirm = ''
	}

	return confirm
}

export default function moveElements(init?: Move, events?: UpdateMove) {
	const moverdom = document.querySelector<HTMLElement>('#element-mover')
	let firstPos = { x: 0, y: 0 }
	let moverPos = { x: 0, y: 0 }

	async function updateMoveElement(prop: UpdateMove) {
		const data = await storage.sync.get()
		let move = data.move

		if (!move) {
			move = structuredClone(SYNC_DEFAULT.move)
		}

		// force single on small width
		if (smallWidth) {
			move.selection = 'single'
		}

		function gridChange() {
			if (!activeID) return

			// Get button move amount
			const y = parseInt(prop.grid?.y || '0')
			const x = parseInt(prop.grid?.x || '0')

			let grid = move.layouts[move.selection].grid
			const allActivePos = findIdPositions(grid, activeID)
			const allAffectedIds: Key[] = []

			// step 0: Adds new line
			const isGridOverflowing = allActivePos.some(({ posRow }) => grid[posRow + y] === undefined)

			if (isGridOverflowing) {
				// dangerous typing /!!!\
				if (move.selection === 'single') grid.push(['.'])
				if (move.selection === 'double') grid.push(['.', '.'])
				if (move.selection === 'triple') grid.push(['.', '.', '.'])
			}

			// step 1: Find elements affected by grid change
			allActivePos.forEach(({ posRow, posCol }) => {
				const newposition = grid[posRow + y][posCol + x]

				if (newposition !== '.') {
					allAffectedIds.push(newposition as Key)
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
				const newRow = Math.min(Math.max(posRow + y, 0), grid.length - 1)
				const newCol = Math.min(Math.max(posCol + x, 0), grid[0].length - 1)

				let tempItem = grid[posRow][posCol]
				grid[posRow][posCol] = grid[newRow][newCol]
				grid[newRow][newCol] = tempItem
			})

			// step 4: remove empty lines
			grid.forEach((_, i) => {
				if (isRowEmpty(grid, i)) {
					grid.splice(i, 1)
				}
			})

			// step 5: profit ??????????????
			setGridAreas(move.layouts[move.selection].grid)
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
			if (prop.layout === 'single' || prop.layout === 'double' || prop.layout === 'triple') {
				move.selection = prop.layout
			}

			// Assign layout after mutating move
			const layout = move.layouts[move.selection]
			const widgetsInGrid = getEnabledWidgetsFromGrid(layout.grid)

			const list: [Widgets, boolean][] = [
				['time', widgetsInGrid.includes('time')],
				['main', widgetsInGrid.includes('main')],
				['notes', widgetsInGrid.includes('notes')],
				['quotes', widgetsInGrid.includes('quotes')],
				['searchbar', widgetsInGrid.includes('searchbar')],
				['quicklinks', widgetsInGrid.includes('quicklinks')],
			]

			// Update storage
			const states = widgetsListToData(list, data)
			storage.sync.set({ ...states, move })

			const interfaceTransition = transitioner()

			interfaceTransition.first(() => {
				interfaceFadeOut()
			})

			interfaceTransition.then(async () => {
				toggleWidgetInSettings(list)
				toggleWidgetOnInterface(list)
				setAllAligns(layout.items)
				setGridAreas(layout.grid)
				buttonControl.layout(move.selection)
				manageGridSpanner(move.selection)
				removeSelection()

				// Toggle overlays if we are editing
				if (dominterface?.classList.contains('move-edit')) {
					gridOverlay.removeAll()
					widgetsInGrid.forEach((id) => gridOverlay.add(id))
				}

				if (activeID) {
					buttonControl.grid(activeID)
					buttonControl.align(layout.items[activeID])
				}
			})

			interfaceTransition.finally(interfaceFadeIn)
			interfaceTransition.transition(200)
		}

		function layoutReset() {
			if (resetButtonConfirm() === false) {
				return
			}

			const layout = move.layouts[move.selection]
			const enabled = getEnabledWidgetsFromStorage(data)
			let grid: typeof layout.grid = []

			enabled.forEach((id) => {
				grid = gridWidget(grid, move.selection, id, true)
			})

			move.layouts[move.selection].grid = grid
			move.layouts[move.selection].items = {}

			removeSelection()
			setGridAreas(layout.grid)
			buttonControl.title()

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

			const id = prop.select as Key

			buttonControl.align(layout.items[id])
			buttonControl.span(id)
			buttonControl.grid(id)
			buttonControl.title(id)

			document.getElementById('move-overlay-' + id)!.classList.add('selected')
			document.getElementById('element-mover')?.classList.add('active')

			activeID = id
		}

		function toggleMoveStatus() {
			const b_editmove = document.getElementById('b_editmove') as HTMLButtonElement
			const isEditing = dominterface?.classList.contains('move-edit')

			if (isEditing) {
				b_editmove.textContent = tradThis('Open')
				gridOverlay.removeAll()
			} else {
				b_editmove.textContent = tradThis('Close')
				buttonControl.layout(move.selection)
				const ids = getEnabledWidgetsFromStorage(data)
				ids.forEach((id) => gridOverlay.add(id))
			}

			const mover = document.getElementById('element-mover')
			mover?.classList.toggle('hidden')
			mover?.classList.remove('active')
			dominterface?.classList.toggle('move-edit')
			removeSelection()
		}

		function toggleGridSpans(dir: 'col' | 'row') {
			if (!activeID) return

			const layout = move.layouts[move.selection]
			layout.grid = spansInGridArea(layout.grid, activeID, { toggle: dir })

			setGridAreas(layout.grid)
			buttonControl.grid(activeID)
			buttonControl.span(activeID)

			storage.sync.set({ move: move })
		}

		function pageWidthOverlay(overlay?: boolean) {
			const isEditing = document.getElementById('interface')?.classList?.contains('move-edit')
			const hasOverlays = document.querySelector('.move-overlay')

			if (!isEditing && overlay === false) {
				gridOverlay.removeAll()
				return
			}

			if (!hasOverlays) {
				const grid = move.layouts[move.selection].grid
				const widgets = getEnabledWidgetsFromGrid(grid)

				widgets.forEach((id) => {
					gridOverlay.add(id as Key)
				})
			}
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

			case 'overlay':
				pageWidthOverlay(prop.overlay)
				break
		}

		if (events?.widget) {
			toggleWidget(data, events.widget)
		}
	}

	function moverToolboxEvents() {
		function moverDrag(e: MouseEvent | TouchEvent) {
			let pos = (e as TouchEvent).touches ? (e as TouchEvent).touches[0] : (e as MouseEvent)

			let x = pos.clientX
			let y = pos.clientY

			// Set first position to calc offset
			if (firstPos.x === 0 && firstPos.y === 0) {
				firstPos = { x: x - moverPos.x, y: y - moverPos.y }
				return
			}

			moverPos = {
				x: x - firstPos.x,
				y: y - firstPos.y,
			}

			if (moverdom) {
				document.documentElement.style.overscrollBehavior = 'none'
				moverdom.style.transform = `translate(${moverPos.x}px, ${moverPos.y}px)`
				moverdom.style.cursor = `grabbing`
			}
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

		moverdom?.addEventListener(
			'touchstart',
			(e) => {
				if ((e.target as HTMLElement)?.id === 'element-mover') {
					moverdom?.addEventListener('touchmove', moverDrag)
				}
			},
			{ passive: false }
		)

		const removeDrag = () => {
			firstPos = { x: 0, y: 0 };
			(moverdom as HTMLElement).style.removeProperty('cursor');
			document.documentElement.style.removeProperty('overscroll-behavior')
			
			moverdom?.removeEventListener('mousemove', moverDrag)
			moverdom?.removeEventListener('touchmove', moverDrag)
		}

		moverdom?.addEventListener('mouseup', removeDrag)
		moverdom?.addEventListener('mouseleave', removeDrag)
		moverdom?.addEventListener('touchend', removeDrag)
	}

	// Events coming from settings menu
	if (events) {
		if (typeof events.overlay === 'boolean') updateMoveElement({ overlay: events.overlay })
		if (events?.widget) updateMoveElement({ widget: events.widget })
		if (events?.select) updateMoveElement({ select: events.select })
		if (events?.layout) updateMoveElement({ layout: events.layout })
		if (events?.toggle) updateMoveElement({ toggle: true })
		if (events?.reset) updateMoveElement({ reset: true })
		return
	}

	// Init events coming from mover toolbox
	onSettingsLoad(moverToolboxEvents)

	// First launch from version without move data
	if (!init && !events) {
		updateMoveElement({ reset: true })
		return
	}

	if (init) {
		const layout = init.layouts[init.selection]
		manageGridSpanner(init.selection)
		setAllAligns(layout.items)
		setGridAreas(layout.grid)
	}
}

//
//	Interface widget control
//

async function toggleWidget(data: Sync.Storage, widget: [Widgets, boolean]) {
	if (!widget) return

	const interfaceTransition = transitioner()
	const [id, on] = widget

	const layout = { ...data.move.layouts[data.move.selection] }
	const newgrid = gridWidget(layout.grid, data.move.selection, id, on)

	data.move.layouts[data.move.selection].grid = newgrid
	data = widgetsListToData([[id, on]], data)
	storage.sync.set(data)

	interfaceTransition.first(() => {
		toggleWidgetInSettings([[id, on]])
		interfaceFadeOut()
	})

	interfaceTransition.then(async () => {
		setGridAreas(data.move.layouts[data.move.selection].grid)
		setAllAligns(data.move.layouts[data.move.selection].items)
		toggleWidgetOnInterface([[id, on]])
		removeSelection()

		// add/remove widget overlay only when editing move
		if (isEditing()) {
			on ? gridOverlay.add(id) : gridOverlay.remove(id)
		}
	})

	interfaceTransition.finally(interfaceFadeIn)
	interfaceTransition.transition(200)
}

function toggleWidgetInSettings(states: [Widgets, boolean][]) {
	const inputids: { [key in Widgets]: string } = {
		time: 'i_time',
		main: 'i_main',
		quicklinks: 'i_quicklinks',
		notes: 'i_notes',
		quotes: 'i_quotes',
		searchbar: 'i_sb',
	}

	for (const [widget, on] of states) {
		const input = document.getElementById(inputids[widget]) as HTMLInputElement
		const option = document.getElementById(widget + '_options')

		option?.classList.toggle('shown', on)
		input.checked = on
	}
}

function toggleWidgetOnInterface(states: [Widgets, boolean][]) {
	const domids: { [key in Widgets]: string } = {
		time: 'time',
		main: 'main',
		quicklinks: 'linkblocks',
		notes: 'notes_container',
		quotes: 'quotes_container',
		searchbar: 'sb_container',
	}

	for (const [widget, on] of states) {
		const elem = document.getElementById(domids[widget]) as HTMLElement
		elem?.classList.toggle('hidden', !on)
	}
}

function interfaceFadeOut() {
	const dominterface = document.getElementById('interface') as HTMLElement
	dominterface.style.opacity = '0'
	dominterface.style.transition = `opacity 200ms cubic-bezier(.215,.61,.355,1)`
}

function interfaceFadeIn() {
	const dominterface = document.getElementById('interface') as HTMLElement
	dominterface.style.removeProperty('opacity')
	setTimeout(() => (dominterface.style.transition = ''), 200)
}
