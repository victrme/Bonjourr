import {
	elements,
	findIdPositions,
	hasDuplicateInArray,
	areaStringToLayoutGrid,
	getEnabledWidgetsFromGrid,
	alignParse,
} from './helpers'
import { tradThis } from '../../utils/translations'
import moveElements, { activeID } from '.'

type Align = {
	box: string
	text: string
}

const dominterface = document.querySelector<HTMLElement>('#interface')
let resetTimeout: number

export function setGridAreas(grid?: string) {
	document.documentElement.style.setProperty('--grid', grid ?? "'time' 'main' 'quicklinks'")
}

export function setAlign(id: Widgets | 'none', align: Align) {
	if (id === 'none') {
		return
	}

	const elem = elements[id]

	if (elem) {
		elem.style.placeSelf = align.box

		if (id === 'quicklinks') {
			const flex = align.text == 'left' ? 'flex-start' : align.text == 'right' ? 'flex-end' : ''
			const linklist = document.getElementById('link-list') as HTMLElement
			linklist.style.justifyContent = flex
		} else {
			elem.style.textAlign = align.text
		}
	}
}

export function setAllAligns(layout?: Partial<Sync.MoveLayout>) {
	if (!layout) return

	const aligns = Object.entries(layout).filter(([key, _]) => key !== 'grid')

	for (const [widget, align] of aligns) {
		setAlign(widget, align)
	}
}

export function manageGridSpanner(column: string) {
	column !== 'single'
		? document.getElementById('grid-spanner-container')?.classList.add('active')
		: document.getElementById('grid-spanner-container')?.classList.remove('active')
}

export const gridOverlay = {
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

export const buttonControl = {
	layout: (column: Sync.Move['column']) => {
		document.querySelectorAll<HTMLButtonElement>('#grid-layout button').forEach((button) => {
			button.classList.toggle('selected', button.dataset.layout === column)
		})
	},

	grid: (id: Widgets | 'none') => {
		const property = document.documentElement?.style.getPropertyValue('--grid') || ''
		const grid = areaStringToLayoutGrid(property)

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

	span: (id: Widgets) => {
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

	align: (str?: string) => {
		const { box, text } = alignParse(str ?? '')
		const boxBtns = document.querySelectorAll<HTMLButtonElement>('#box-alignment-mover button')
		const textBtns = document.querySelectorAll<HTMLButtonElement>('#text-alignment-mover button')

		boxBtns.forEach((b) => b.classList.toggle('selected', b.dataset.align === box))
		textBtns.forEach((b) => b.classList.toggle('selected', b.dataset.align === text))
	},

	title: (id?: Widgets | null) => {
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

export function removeSelection() {
	activeID('none')
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

export function resetButtonConfirm(): boolean {
	const b_resetlayout = document.getElementById('b_resetlayout') as HTMLButtonElement
	const confirm = !!b_resetlayout.dataset.confirm

	clearTimeout(resetTimeout)

	if (confirm === false) {
		b_resetlayout.textContent = tradThis('Are you sure ?')
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

export function interfaceFadeOut() {
	const dominterface = document.getElementById('interface') as HTMLElement
	dominterface.style.opacity = '0'
	dominterface.style.transition = `opacity 200ms cubic-bezier(.215,.61,.355,1)`
}

export function interfaceFadeIn() {
	const dominterface = document.getElementById('interface') as HTMLElement
	dominterface.style.removeProperty('opacity')
	setTimeout(() => (dominterface.style.transition = ''), 200)
}
