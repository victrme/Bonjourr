import { elements, alignParse } from './helpers'
import moveElements from '.'

const dominterface = document.querySelector<HTMLElement>('#interface')

export function setGridAreas(grid = '') {
	document.documentElement.style.setProperty('--grid', grid)
}

export function setAlign(id: Widgets, align = '') {
	const { box, text } = alignParse(align)
	const elem = elements[id]

	if (elem) {
		elem.style.placeSelf = box

		if (id === 'quicklinks') {
			const flex = text == 'left' ? 'flex-start' : text == 'right' ? 'flex-end' : ''
			const linklist = document.getElementById('link-list') as HTMLElement
			linklist.style.justifyContent = flex
		} else {
			elem.style.textAlign = text
		}
	}
}

export function setAllAligns(layout: Partial<Sync.MoveLayout>) {
	const entries = Object.entries(layout).filter(([key, _]) => key !== 'grid')

	for (const [widget, align] of entries) {
		setAlign(widget as Widgets, align)
	}
}

export function addOverlay(id: Widgets) {
	const button = document.createElement('button')
	button.id = 'move-overlay-' + id
	button.className = 'move-overlay'
	dominterface?.appendChild(button)

	button.addEventListener('click', () => {
		moveElements(undefined, { select: id })
	})
}

export function removeOverlay(id?: Widgets) {
	id
		? document.querySelector('#move-overlay-' + id)?.remove()
		: document.querySelectorAll('.move-overlay').forEach((d) => d.remove())
}

export function removeSelection() {
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

export function interfaceFade(fade: 'in' | 'out') {
	if (fade === 'in') {
		const dominterface = document.getElementById('interface') as HTMLElement
		dominterface.style.removeProperty('opacity')
		setTimeout(() => (dominterface.style.transition = ''), 200)
	}

	if (fade == 'out') {
		const dominterface = document.getElementById('interface') as HTMLElement
		dominterface.style.opacity = '0'
		dominterface.style.transition = `opacity 200ms cubic-bezier(.215,.61,.355,1)`
	}
}
