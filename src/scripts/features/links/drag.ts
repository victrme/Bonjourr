import { getLiFromEvent } from './helpers'
import { initblocks } from '.'
import storage from '../../storage'

type Coords = {
	x: number
	y: number
	w: number
	h: number
}

const clones: Map<string, HTMLLIElement> = new Map()
const dropzones: Set<Coords & { id: string }> = new Set()
let [dx, dy, cox, coy, lastIndex, interfacemargin] = [0, 0, 0, 0, 0, 0]
let draggedId = ''
let ids: string[] = []
let initids: string[] = []
let coords: Coords[] = []

const domlinkblocks = document.getElementById('linkblocks') as HTMLDivElement
const dominterface = document.getElementById('interface') as HTMLDivElement

export default function startDrag(event: PointerEvent) {
	if (event.button > 0) {
		return
	}

	if (event.type === 'pointerdown') {
		beforeStartDrag(event)
		return
	}

	const path = event.composedPath() as Element[]
	const target = path.find((el) => el.tagName === 'LI') as HTMLLIElement
	const fragment = document.createDocumentFragment()
	const lis = document.querySelectorAll<HTMLLIElement>('#linkblocks li.block')
	const listRect = document.querySelector('#link-list')?.getBoundingClientRect()
	const pos = getPosFromEvent(event)

	draggedId = target?.id ?? ''
	interfacemargin = dominterface.getBoundingClientRect().left

	ids = []
	coords = []
	initids = []
	clones.clear()
	dropzones.clear()

	//
	// Create visible links clones
	// And add all drag & drop events

	for (const li of lis) {
		const clone = li.cloneNode(true) as HTMLLIElement
		let { x, y, width, height } = li.getBoundingClientRect()
		const id = li.id

		dropzones.add({ id, x, y, w: width, h: height })

		x = x - listRect!.x
		y = y - listRect!.y

		ids.push(id)
		initids.push(id)
		coords.push({ x, y, w: width, h: height })

		clone.removeAttribute('id')
		clone.classList.add('dragging-clone')
		clones.set(id, clone)
		deplaceElem(clone, x, y)
		fragment.appendChild(clone)

		if (id === draggedId) {
			cox = pos.x - x
			coy = pos.y - y
			dx = x
			dy = y
			clone.classList.add('on')
		}

		li.setAttribute('disabled', 'true')
	}

	dominterface.style.cursor = 'grabbing'
	domlinkblocks?.classList.add('dragging')
	document.querySelector('#link-list')?.appendChild(fragment)
	document.body.dispatchEvent(new Event('stop-select-all'))
	window.requestAnimationFrame(deplaceDraggedElem)

	if (event.pointerType === 'touch') {
		document.documentElement.addEventListener('touchmove', moveDrag, { passive: false })
		document.documentElement.addEventListener('touchend', endDrag, { passive: false })
	} else {
		document.documentElement.addEventListener('pointermove', moveDrag)
		document.documentElement.addEventListener('pointerup', endDrag)
		document.documentElement.addEventListener('pointerleave', endDrag)
	}
}

function beforeStartDrag(event: PointerEvent) {
	// Prevent drag move event if user slips on click
	// By only starting drag if pointer moves more than 10px deadzone

	const li = getLiFromEvent(event)
	cox = event.offsetX
	coy = event.offsetY

	li?.addEventListener('pointermove', pointerDeadzone)
	li?.addEventListener('pointerup', pointerDeadzone)

	function pointerDeadzone(event: PointerEvent) {
		const precision = event.pointerType === 'touch' ? 4 : 10
		const ox = Math.abs(cox - event.offsetX)
		const oy = Math.abs(coy - event.offsetY)

		const isEndEvents = event.type.match(/pointerup|touchend/)
		const isOutside = ox > precision || oy > precision

		if (isOutside) {
			startDrag(event)
		}

		if (isOutside || isEndEvents) {
			li?.removeEventListener('pointermove', pointerDeadzone)
			li?.removeEventListener('pointerup', pointerDeadzone)
		}
	}
}

function moveDrag(event: TouchEvent | PointerEvent) {
	const { x, y } = getPosFromEvent(event)
	dx = x - cox
	dy = y - coy

	const id = isDraggingOver({ x, y })

	if (id) {
		applyDrag(id)
	}
}

function applyDrag(targetId: string) {
	const targetIndex = initids.indexOf(targetId)

	if (lastIndex === targetIndex) {
		return
	}

	lastIndex = targetIndex

	// move dragged element to target position in array
	ids.splice(ids.indexOf(draggedId), 1)
	ids.splice(targetIndex, 0, draggedId)

	// move all clones to new position
	for (let i = 0; i < ids.length; i++) {
		if (ids[i] !== draggedId) {
			deplaceElem(clones.get(ids[i]), coords[i].x, coords[i].y)
		}
	}
}

function endDrag(event: Event) {
	event.preventDefault()

	const newIndex = ids.indexOf(draggedId)
	const clone = clones.get(draggedId)
	const coord = coords[newIndex]

	deplaceElem(clone, coord.x, coord.y)

	domlinkblocks?.classList.replace('dragging', 'dropping')
	clone?.classList.remove('on')
	dominterface.style.cursor = 'grab'
	draggedId = ''
	clones.clear()
	dx = dy = cox = coy = 0

	document.documentElement.removeEventListener('pointermove', moveDrag)
	document.documentElement.removeEventListener('pointerup', endDrag)
	document.documentElement.removeEventListener('pointerleave', endDrag)
	document.documentElement.removeEventListener('touchmove', moveDrag)
	document.documentElement.removeEventListener('touchend', endDrag)

	setTimeout(async () => {
		const data = await storage.sync.get()
		const folderid = domlinkblocks.dataset.folderid

		if (folderid) {
			const folder = data[folderid] as Links.Folder
			folder.ids = ids
			data[folder._id] = folder
		} else {
			// ugly: keep tab links contained in folders with the new order
			// there is probably a more concise way to do this
			const currids = data.tabslist[data.linktabs ?? 0].ids
			const sortedids = ids.filter((id) => currids.includes(id)).concat(currids.filter((id) => !ids.includes(id)))
			data.tabslist[data.linktabs ?? 0].ids = sortedids
		}

		storage.sync.set(data)
		initblocks(data)

		domlinkblocks?.classList.remove('dropping')
		dominterface.style.removeProperty('cursor')
	}, 200)
}

function deplaceElem(dom?: HTMLElement, x = 0, y = 0) {
	if (dom) {
		dom.style.transform = `translate(${x - interfacemargin}px, ${y}px)`
	}
}

function deplaceDraggedElem() {
	if (clones.has(draggedId)) {
		clones.get(draggedId)!.style.transform = `translate(${dx}px, ${dy}px)`
		window.requestAnimationFrame(deplaceDraggedElem)
	}
}

function isDraggingOver({ x, y }: { x: number; y: number }): string | undefined {
	for (const zone of dropzones) {
		if (x > zone.x && x < zone.x + zone.w && y > zone.y && y < zone.y + zone.h) {
			return zone.id
		}
	}
}

function getPosFromEvent(event: TouchEvent | PointerEvent) {
	switch (event.type) {
		case 'touchmove': {
			const touch = (event as TouchEvent).touches[0]
			return { x: touch.clientX, y: touch.clientY }
		}

		case 'pointermove': {
			const { x, y } = event as PointerEvent
			return { x, y }
		}
	}

	return { x: 0, y: 0 }
}
