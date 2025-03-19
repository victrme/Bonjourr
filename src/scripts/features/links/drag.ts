import { getLiFromEvent, getTitleFromEvent } from './helpers'
import { linksUpdate } from './index'

type Coords = {
	x: number
	y: number
	w: number
	h: number
}

type DropType = 'mini' | 'link' | 'group'

type DropArea = 'left' | 'right' | 'center' | ''

type Dropzones = Map<string, Coords>

const blocks: Map<string, HTMLElement> = new Map()
const groups: Map<string, HTMLElement> = new Map()
const dropzones: Record<DropType, Dropzones> = {
	group: new Map(),
	link: new Map(),
	mini: new Map(),
}

let [dx, dy, cox, coy, lastIndex] = [0, 0, 0, 0, 0, 0]
let lastdropAreas: DropArea[] = ['']
let draggedGroup = ''
let draggedId = ''
let targetId = ''
let targetGroup = ''
let ids: string[] = []
let initids: string[] = []
let coords: Coords[] = []
let dragContainers: NodeListOf<HTMLElement>
let dragChangeParentTimeout = 0
let dragAnimationFrame = 0

const domlinkblocks = document.getElementById('linkblocks') as HTMLDivElement
let domlinklinks: NodeListOf<HTMLLIElement>
let domlinktitles: NodeListOf<HTMLButtonElement>
let domlinkgroups: NodeListOf<HTMLDivElement>
let domlinkgroup: HTMLDivElement

export function startDrag(event: PointerEvent) {
	const path = event.composedPath() as HTMLElement[]
	const type = path.some(element => element?.className?.includes('link-title')) ? 'mini' : 'link'
	const isMini = type === 'mini'

	if (event.button > 0) {
		return
	}

	if (event.type === 'pointerdown') {
		beforeStartDrag(event, type)
		return
	}

	ids = []
	coords = []
	initids = []
	lastdropAreas = []
	blocks.clear()
	dropzones.group.clear()
	dropzones.link.clear()
	dropzones.mini.clear()

	//

	domlinkgroup = path.find(node => node?.classList?.contains('link-group')) as HTMLDivElement
	domlinkgroups = document.querySelectorAll<HTMLDivElement>('#linkblocks .link-group')
	domlinklinks = document.querySelectorAll<HTMLLIElement>('#linkblocks li')
	domlinktitles = document.querySelectorAll<HTMLButtonElement>('#link-mini button')
	dragContainers = document.querySelectorAll<HTMLElement>(isMini ? '#link-mini' : '.link-group')

	const tagName = isMini ? 'BUTTON' : 'LI'
	const target = path.find(node => node.tagName === tagName)
	const pos = getPosFromEvent(event)

	draggedId = findIdFromElement(target)
	draggedGroup = findIdFromElement(isMini ? target : domlinkgroup)
	targetGroup = draggedGroup

	// START RANT
	// HOW DO I CENTER THE DRAGGED GROUP ON THE CURSOR
	// AFTER UPDATING THEIR WIDTH ????????????????????
	const groupSizeOffsets: Map<string, number> = new Map()

	if (isMini) {
		const beforeMap: Map<string, number> = new Map()

		for (const group of domlinktitles) {
			beforeMap.set(group.dataset.group ?? '', group.getBoundingClientRect().x)
			group.style.width = '12ch'
		}

		for (const group of domlinktitles) {
			const id = group.dataset.group ?? ''
			const before = beforeMap.get(id) ?? 0
			const after = group.getBoundingClientRect().x

			groupSizeOffsets.set(id, after - before)
		}
	}
	// END RANT

	for (const element of [...domlinkgroups, ...domlinktitles, ...domlinklinks]) {
		const type = findTypeFromElement(element)
		const rect = element.getBoundingClientRect()
		const id = findIdFromElement(element)

		if (type !== 'group') {
			blocks.set(id, element)
		} else {
			groups.set(id, element)
		}

		dropzones[type].set(id, {
			x: rect.x,
			y: rect.y,
			h: rect.height,
			w: rect.width,
		})
	}

	for (const container of Object.values(dragContainers)) {
		const elements = container.querySelectorAll<HTMLElement>(tagName)
		const wrapper = isMini ? container : container.querySelector('.link-list')
		const rect = wrapper?.getBoundingClientRect()

		if (!rect) {
			continue
		}

		for (const element of elements) {
			const type = findTypeFromElement(element)
			const id = findIdFromElement(element, type)
			let { x, y, w, h } = dropzones[type].get(id) ?? { x: 0, y: 0, w: 0, h: 0 }

			x -= rect?.x
			y -= rect?.y

			ids.push(id)
			initids.push(id)
			coords.push({ x, y, w, h })

			// Only disable transitions for a few frames
			element.style.transition = 'none'
			setTimeout(() => element.style.removeProperty('transition'), 10)

			deplaceElem(element, x, y)

			if (id === draggedId) {
				cox = pos.x - x + (groupSizeOffsets.get(id) ?? 0)
				coy = pos.y - y
				dx = pos.x
				dy = pos.y
				element.classList.add('on')
			}
		}

		container.style.setProperty('--drag-width', `${Math.floor(rect?.width ?? 0)}px`)
		container.style.setProperty('--drag-height', `${Math.floor(rect?.height ?? 0)}px`)
		container.classList.add('in-drag', 'dragging')
	}

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

function beforeStartDrag(event: PointerEvent, type: 'mini' | 'link') {
	// Prevent drag move event if user slips on click
	// By only starting drag if pointer moves more than 10px deadzone

	const target = type === 'mini' ? getTitleFromEvent(event) : getLiFromEvent(event)
	cox = event.offsetX
	coy = event.offsetY

	if (!target) {
		return
	}

	target?.addEventListener('pointermove', pointerDeadzone)
	target?.addEventListener('pointerup', pointerDeadzone)

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
			target?.removeEventListener('pointermove', pointerDeadzone)
			target?.removeEventListener('pointerup', pointerDeadzone)
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
	const isDifferentGroup = targetGroup !== draggedGroup

	if (type === 'group') {
		targetGroup = id

		if (isDifferentGroup) {
			applyDragChangeParent(id, 'group')
		}

		if (targetGroup === draggedGroup) {
			blocks.forEach(block => block.classList.remove('drop-target', 'drop-source'))
			groups.forEach(block => block.classList.remove('drop-target', 'drop-source'))
		}

		return
	}

	if (staysOutsideCenter || isDifferentGroup) {
		return
	}

	if (curr === '') {
		lastdropAreas.push('')
		clearTimeout(dragChangeParentTimeout)
		blocks.forEach(block => block.classList.remove('drop-target', 'drop-source'))
		return
	}

	const movesFromCenter = last === 'center' && (curr === 'left' || curr === 'right')
	const movesAcrossArea = curr !== secondlast
	const staysInCenter = last === curr && curr === 'center'
	const idAtCurrentArea = ids[initids.indexOf(id)]

	if (staysInCenter) {
		applyDragChangeParent(type === 'mini' ? id : idAtCurrentArea, type)
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

function applyDragChangeParent(id: string, type: DropType) {
	const propertyValue = getComputedStyle(domlinkblocks).getPropertyValue('--drop-delay')
	const dropDelay = type === 'group' ? 0 : Number.parseInt(propertyValue || '120')

	clearTimeout(dragChangeParentTimeout)

	dragChangeParentTimeout = setTimeout(() => {
		const isDraggedId = id === draggedId
		const inFolder = domlinkgroup?.classList.contains('in-folder')

		if (isDraggedId || inFolder) {
			return
		}

		if (type === 'mini') {
			const selectedGroup = document.querySelector<HTMLElement>('#link-mini .link-title.selected-group')
			const selection = selectedGroup?.dataset.group ?? id

			if (selection === id) {
				return
			}
		}

		targetId = id

		groups.forEach(block => block.classList.remove('drop-target', 'drop-source'))
		blocks.forEach(block => block.classList.remove('drop-target', 'drop-source'))
		blocks.get(draggedId)?.classList.toggle('drop-source', true)

		if (type === 'group') {
			groups.get(id)?.classList.toggle('drop-target', true)
		} else {
			blocks.get(id)?.classList.toggle('drop-target', true)
		}
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
	const type = findTypeFromElement(blocks.get(draggedId))
	const group = domlinkgroup?.dataset.group ?? ''
	const newIndex = ids.indexOf(draggedId)
	const block = blocks.get(draggedId)
	const coord = coords[newIndex]

	const isDroppable = !!document.querySelector('.drop-source')
	const outOfFolder = !path[0]?.classList.contains('link-list') && domlinkgroup?.classList.contains('in-folder')
	const targetIdIsLink = targetId.startsWith('links') && targetId.length === 11
	const toFolder = isDroppable && targetIdIsLink
	const toTab = isDroppable && !targetIdIsLink

	window.cancelAnimationFrame(dragAnimationFrame)
	blocks.get(draggedId)?.classList.remove('on')

	dragContainers.forEach(container => {
		container?.classList.replace('dragging', 'dropping')
	})

	if (outOfFolder || toFolder || toTab) {
		blocks.get(draggedId)?.classList.add('removed')
	} else {
		deplaceElem(block, coord.x, coord.y)
	}

	groups.forEach(block => block.classList.remove('drop-target', 'drop-source'))

	setTimeout(() => {
		const targetIsFolder = blocks.get(targetId)?.classList.contains('link-folder')
		const draggedIsFolder = blocks.get(draggedId)?.classList.contains('link-folder')
		const createFolder = toFolder && !targetIsFolder && !draggedIsFolder
		const moveToFolder = toFolder && targetIsFolder && !draggedIsFolder
		const concatFolders = toFolder && targetIsFolder && draggedIsFolder

		if (type === 'mini') {
			linksUpdate({ moveGroups: ids })
		}
		//
		else if (createFolder) {
			linksUpdate({ addFolder: { ids: [targetId, draggedId], group } })
		}
		//
		else if (moveToFolder) {
			linksUpdate({ moveToFolder: { source: draggedId, target: targetId } })
		}
		//
		else if (concatFolders) {
			linksUpdate({ concatFolders: { source: draggedId, target: targetId } })
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
			dragContainers.forEach(container => {
				container?.removeAttribute('style')
				container?.classList.remove('in-drag', 'dropping')

				container.querySelectorAll('li, button').forEach(element => {
					element.removeAttribute('style')
				})
			})
		}, 1)
	}, 200)
}

//	Small stuff

function deplaceElem(dom?: HTMLElement, x = 0, y = 0) {
	if (dom) {
		dom.style.transform = `translate(${Math.floor(x)}px, ${Math.floor(y)}px)`
	}
}

function deplaceDraggedElem() {
	const block = blocks.get(draggedId)

	if (block) {
		block.style.transform = `translate(${dx}px, ${dy}px)`
		dragAnimationFrame = window.requestAnimationFrame(deplaceDraggedElem)
	}
}

function isDraggingOver({ x, y }: { x: number; y: number }): [DropArea, string, DropType] | undefined {
	const findArea = (zones: Dropzones) => {
		for (const [id, zone] of zones) {
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

			if (isInLeftEdge) {
				area = 'left'
			}
			if (isInRightEdge) {
				area = 'right'
			}
			if (isInCenter) {
				area = 'center'
			}

			if (area) {
				return { area, id }
			}
		}
	}

	// moche pcq cerveau qui brûle
	// <!> doit etre dans l'ordre "link", "mini", "group"

	const linkarea = findArea(dropzones.link)
	if (linkarea) {
		return [linkarea.area, linkarea.id, 'link']
	}

	const miniarea = findArea(dropzones.mini)
	if (miniarea) {
		return [miniarea.area, miniarea.id, 'mini']
	}

	const grouparea = findArea(dropzones.group)
	if (grouparea) {
		return [grouparea.area, grouparea.id, 'group']
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

		default: {
			return { x: 0, y: 0 }
		}
	}
}

function findTypeFromElement(element?: HTMLElement): 'link' | 'mini' | 'group' {
	if (element?.classList.contains('link')) {
		return 'link'
	}
	if (element?.classList.contains('link-title')) {
		return 'mini'
	}
	if (element?.classList.contains('link-group')) {
		return 'group'
	}

	throw new Error('No valid type found for specified element')
}

function findIdFromElement(element?: HTMLElement, type?: 'link' | 'mini' | 'group'): string {
	const elementType = type ?? findTypeFromElement(element)

	if (elementType === 'link') {
		return element?.id ?? ''
	}
	if (elementType === 'mini') {
		return element?.dataset.group ?? ''
	}
	if (elementType === 'group') {
		return element?.dataset.group ?? ''
	}

	throw new Error('No valid type found for specified element')
}
