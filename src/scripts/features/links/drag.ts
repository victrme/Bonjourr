import { getLiFromEvent } from './helpers'
import { linksUpdate } from '.'

type Coords = {
	x: number
	y: number
	w: number
	h: number
}

type DropArea = 'left' | 'right' | 'center' | ''

const blocks: Map<string, HTMLLIElement> = new Map()
const buttons: Map<string, HTMLElement> = new Map()
const dropzones: Map<string, Coords & { type: 'group' | 'link' }> = new Map()
let [dx, dy, cox, coy, lastIndex] = [0, 0, 0, 0, 0, 0]
let lastdropAreas: DropArea[] = ['']
let draggedId = ''
let targetId = ''
let ids: string[] = []
let initids: string[] = []
let coords: Coords[] = []
let dragChangeParentTimeout = 0
let dragAnimationFrame = 0

const domlinkblocks = document.getElementById('linkblocks') as HTMLDivElement
const domlinkmini = document.getElementById('link-mini') as HTMLDivElement
let domlinkgroup: HTMLDivElement
let domlinklist: HTMLUListElement

export default function startDrag(event: PointerEvent) {
	const path = event.composedPath() as Element[]

	if (event.button > 0) {
		return
	}

	if (event.type === 'pointerdown') {
		beforeStartDrag(event)
		return
	}

	domlinkgroup = path.find((el) => el.classList.contains('link-group')) as HTMLDivElement
	domlinklist = path.find((el) => el.classList.contains('link-list')) as HTMLUListElement

	const target = path.find((el) => el.tagName === 'LI') as HTMLLIElement
	const lis = domlinklist.querySelectorAll<HTMLLIElement>('.link')
	const titles = document.querySelectorAll<HTMLButtonElement>('#link-mini button')
	const listRect = domlinklist?.getBoundingClientRect()
	const miniRect = domlinkmini?.getBoundingClientRect()
	const pos = getPosFromEvent(event)

	draggedId = target?.id ?? ''

	console.log(draggedId)

	ids = []
	coords = []
	initids = []
	lastdropAreas = []
	blocks.clear()
	buttons.clear()
	dropzones.clear()

	for (const button of titles) {
		let { x, y, height, width } = button.getBoundingClientRect()
		const id = button?.dataset.group ?? ''

		buttons.set(id, button)

		x = x - miniRect!.x
		y = y - miniRect!.y

		deplaceElem(button, x, y)

		dropzones.set(id, { x, y, h: height, w: width, type: 'group' })
	}

	for (const li of lis) {
		let { x, y, width, height } = li.getBoundingClientRect()
		const id = li.id

		dropzones.set(id, { x, y, w: width, h: height, type: 'link' })

		x = x - listRect!.x
		y = y - listRect!.y

		ids.push(id)
		initids.push(id)
		coords.push({ x, y, w: width, h: height })

		// Only disable transitions for a few frames
		li.style.transition = 'none'
		setTimeout(() => li.style.removeProperty('transition'), 10)

		blocks.set(id, li)
		deplaceElem(li, x, y)

		if (id === draggedId) {
			cox = pos.x - x
			coy = pos.y - y
			dx = x
			dy = y
			li.classList.add('on')
		}
	}

	domlinkgroup.style.setProperty('--drag-width', Math.floor(listRect?.width ?? 0) + 'px')
	domlinkgroup.style.setProperty('--drag-height', Math.floor(listRect?.height ?? 0) + 'px')

	domlinkmini.style.setProperty('--drag-width', Math.floor(miniRect.width ?? 0) + 'px')
	domlinkmini.style.setProperty('--drag-height', Math.floor(miniRect.height ?? 0) + 'px')

	domlinkblocks.classList.add('dragging')

	document.dispatchEvent(new Event('remove-select-all'))
	dragAnimationFrame = window.requestAnimationFrame(deplaceDraggedElem)

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
		const precision = event.pointerType === 'touch' ? 7 : 14
		const ox = Math.abs(cox - event.offsetX)
		const oy = Math.abs(coy - event.offsetY)

		const isEndEvents = event.type.match(/pointerup|touchend/)
		const isHalfOutside = ox > precision / 2 || oy > precision / 2
		const isOutside = ox > precision || oy > precision

		if (isHalfOutside) {
			document.dispatchEvent(new Event('stop-select-all'))
		}

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

	const [curr, id, type] = isDraggingOver({ x, y }) ?? ['', '']
	const last = lastdropAreas[lastdropAreas.length - 1]
	const secondlast = lastdropAreas[lastdropAreas.length - 2]
	const staysOutsideCenter = curr === last && curr !== 'center'

	if (staysOutsideCenter) {
		return
	}

	if (curr === '') {
		lastdropAreas.push('')
		clearTimeout(dragChangeParentTimeout)
		blocks.forEach((block) => block.classList.remove('drop-target', 'drop-source'))
		return
	}

	const movesFromCenter = last === 'center' && (curr === 'left' || curr === 'right')
	const movesAcrossArea = curr !== secondlast
	const staysInCenter = last === curr && curr === 'center'
	const idAtCurrentArea = ids[initids.indexOf(id)]

	if (staysInCenter) {
		applyDragChangeParent(type === 'group' ? id : idAtCurrentArea, type)
	}

	if (movesFromCenter && movesAcrossArea) {
		applyDragMoveBlocks(id)
	}

	if (last !== curr) {
		lastdropAreas.push(curr)
	}
}

function applyDragMoveBlocks(id: string) {
	const targetIndex = initids.indexOf(id)

	if (lastIndex === targetIndex) {
		return
	}

	clearTimeout(dragChangeParentTimeout)

	lastIndex = targetIndex

	// move dragged element to target position in array
	ids.splice(ids.indexOf(draggedId), 1)
	ids.splice(targetIndex, 0, draggedId)

	// move all clones to new position
	for (let i = 0; i < ids.length; i++) {
		if (ids[i] !== draggedId) {
			deplaceElem(blocks.get(ids[i]), coords[i].x, coords[i].y)
		}
	}
}

function applyDragChangeParent(id: string, type: 'group' | 'link') {
	const propertyValue = getComputedStyle(domlinkblocks).getPropertyValue('--drop-delay')
	const dropDelay = parseInt(propertyValue || '120')

	clearTimeout(dragChangeParentTimeout)

	dragChangeParentTimeout = setTimeout(() => {
		const isDraggedId = id === draggedId
		const inFolder = domlinkgroup?.classList.contains('in-folder')

		if (isDraggedId || inFolder) {
			return
		}

		if (type === 'group') {
			const selectedGroup = document.querySelector<HTMLElement>('#link-mini .link-title.selected-group')
			const selection = selectedGroup?.dataset.group ?? id

			if (selection === id) {
				return
			}
		}

		targetId = id

		blocks.forEach((block) => block.classList.remove('drop-target', 'drop-source'))
		blocks.get(draggedId)?.classList.toggle('drop-source', true)
		blocks.get(id)?.classList.toggle('drop-target', true)
	}, dropDelay)
}

function endDrag(event: Event) {
	event.preventDefault()

	document.documentElement.removeEventListener('pointermove', moveDrag)
	document.documentElement.removeEventListener('pointerup', endDrag)
	document.documentElement.removeEventListener('pointerleave', endDrag)
	document.documentElement.removeEventListener('touchmove', moveDrag)
	document.documentElement.removeEventListener('touchend', endDrag)

	const path = event.composedPath() as Element[]
	const domlinklist = document.querySelector<HTMLDivElement>('.link-list')
	const group = domlinkgroup?.dataset.group ?? ''
	const newIndex = ids.indexOf(draggedId)
	const block = blocks.get(draggedId)
	const coord = coords[newIndex]

	const isDroppable = !!document.querySelector('.drop-source')
	const outOfFolder = path[0] !== domlinklist && domlinkgroup.classList.contains('in-folder')
	const targetIdIsLink = targetId.startsWith('links') && targetId.length === 11
	const toFolder = isDroppable && targetIdIsLink
	const toTab = isDroppable && !targetIdIsLink

	window.cancelAnimationFrame(dragAnimationFrame)
	blocks.get(draggedId)?.classList.remove('on')
	domlinkblocks?.classList.replace('dragging', 'dropping')

	if (outOfFolder || toFolder || toTab) {
		blocks.get(draggedId)?.classList.add('removed')
	} else {
		deplaceElem(block, coord.x, coord.y)
	}

	setTimeout(() => {
		const targetIsFolder = blocks.get(targetId)?.classList.contains('link-folder')
		const draggedIsFolder = blocks.get(draggedId)?.classList.contains('link-folder')
		const createFolder = toFolder && !targetIsFolder && !draggedIsFolder
		const concatFolders = toFolder && (targetIsFolder || draggedIsFolder)

		if (createFolder) {
			linksUpdate({ addFolder: { ids: [targetId, draggedId], group } })
		}
		//
		else if (concatFolders) {
			linksUpdate({ moveToFolder: { source: draggedId, target: targetId, group } })
		}
		//
		else if (toTab) {
			linksUpdate({ moveToGroup: { ids: [draggedId], target: targetId } })
		}
		//
		else if (outOfFolder) {
			linksUpdate({ moveOutFolder: { ids: [draggedId], group } })
		}
		//
		else {
			linksUpdate({ moveLinks: ids })
		}

		// Yield to functions above to avoid flickering
		// Do not remove this setTimeout (or else)
		setTimeout(() => {
			domlinkgroup?.removeAttribute('style')
			domlinkmini?.removeAttribute('style')
			domlinkblocks?.classList.remove('dropping')

			document.querySelectorAll('.link-title')?.forEach((node) => node.removeAttribute('style'))
		}, 1)
	}, 200)
}

//
//
//

function deplaceElem(dom?: HTMLElement, x = 0, y = 0) {
	if (dom) {
		dom.style.transform = `translate(${Math.floor(x)}px, ${Math.floor(y)}px)`
	}
}

function deplaceDraggedElem() {
	if (blocks.has(draggedId)) {
		blocks.get(draggedId)!.style.transform = `translate(${dx}px, ${dy}px)`
		dragAnimationFrame = window.requestAnimationFrame(deplaceDraggedElem)
	}
}

function isDraggingOver({ x, y }: { x: number; y: number }): [DropArea, string, 'group' | 'link'] | undefined {
	for (const [id, zone] of dropzones) {
		// Detect 20% left edge of dropzones ( left + corner )
		const ll = zone.x
		const lr = zone.x + zone.w * 0.2
		const lt = zone.y
		const lb = zone.y + zone.h
		const isInLeftEdge = x > ll && x < lr && y > lt && y < lb

		// Detect 20% right edge of dropzones ( right + corner )
		const rl = zone.x + zone.w * 0.8
		const rr = zone.x + zone.w
		const rt = zone.y + 0
		const rb = zone.y + zone.h
		const isInRightEdge = x > rl && x < rr && y > rt && y < rb

		// Detect 80% center of dropzones ( center + corner )
		const cl = zone.x + zone.w * 0.2
		const cr = zone.x + zone.w * 0.8
		const ct = zone.y
		const cb = zone.y + zone.h
		const isInCenter = x > cl && x < cr && y > ct && y < cb

		let area: DropArea = ''

		if (isInLeftEdge) area = 'left'
		if (isInRightEdge) area = 'right'
		if (isInCenter) area = 'center'

		if (area) {
			return [area, id, zone.type]
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
