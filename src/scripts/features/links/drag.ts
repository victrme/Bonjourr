import { getLiFromEvent } from './helpers'
import { linksUpdate } from '.'
import storage from '../../storage'

type Coords = {
	x: number
	y: number
	w: number
	h: number
}

type AddToFolder = {
	ids: string[]
	target: string
	source?: string
}

type BlockZone = 'left' | 'right' | 'center' | ''

const blocks: Map<string, HTMLLIElement> = new Map()
const dropzones: Set<Coords & { id: string }> = new Set()
let [dx, dy, cox, coy, lastIndex] = [0, 0, 0, 0, 0, 0]
let lastblockzone: BlockZone = ''
let draggedId = ''
let targetId = ''
let ids: string[] = []
let initids: string[] = []
let coords: Coords[] = []
let dragFolderTimeout = 0
let dragAnimationFrame = 0

const domlinklist = document.getElementById('link-list') as HTMLUListElement
const domlinkblocks = document.getElementById('linkblocks') as HTMLDivElement

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
	const lis = document.querySelectorAll<HTMLLIElement>('#linkblocks li.block')
	const rect = domlinklist?.getBoundingClientRect()
	const pos = getPosFromEvent(event)

	draggedId = target?.id ?? ''

	ids = []
	coords = []
	initids = []
	blocks.clear()
	dropzones.clear()

	for (const li of lis) {
		let { x, y, width, height } = li.getBoundingClientRect()
		const id = li.id

		dropzones.add({ id, x, y, w: width, h: height })

		x = x - rect!.x
		y = y - rect!.y

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

	domlinklist.style.setProperty('--drag-width', Math.floor(rect?.width) + 'px')
	domlinklist.style.setProperty('--drag-height', Math.floor(rect?.height) + 'px')

	domlinkblocks?.classList.add('dragging')
	document.body.classList.add('dragging')
	document.body.dispatchEvent(new Event('stop-select-all'))
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

	const [blockzone, id] = isDraggingOver({ x, y }) ?? ['', '']

	if (blockzone === '') {
		clearTimeout(dragFolderTimeout)
		blocks.forEach((block) => block.classList.remove('almost-folder'))
		lastblockzone = ''
		return
	}

	if (blockzone === lastblockzone && blockzone !== 'center') {
		return
	}

	if (lastblockzone === blockzone && blockzone === 'center') {
		applyDragFolder(id)
	}

	if (lastblockzone === 'center' && (blockzone === 'left' || blockzone === 'right')) {
		applyDragMove(id)
	}

	if (lastblockzone !== blockzone) {
		lastblockzone = blockzone
	}
}

function applyDragMove(id: string) {
	const targetIndex = initids.indexOf(id)

	if (lastIndex === targetIndex) {
		return
	}

	clearTimeout(dragFolderTimeout)

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

function applyDragFolder(id: string) {
	clearTimeout(dragFolderTimeout)

	dragFolderTimeout = setTimeout(() => {
		if (id === draggedId || domlinkblocks?.classList.contains('in-folder')) {
			return
		}

		targetId = id
		blocks.forEach((block) => block.classList.remove('almost-folder'))
		blocks.get(id)?.classList.toggle('almost-folder', true)
		blocks.get(draggedId)?.classList.toggle('almost-folder', true)
	}, 200)
}

function endDrag(event: Event) {
	event.preventDefault()

	document.documentElement.removeEventListener('pointermove', moveDrag)
	document.documentElement.removeEventListener('pointerup', endDrag)
	document.documentElement.removeEventListener('pointerleave', endDrag)
	document.documentElement.removeEventListener('touchmove', moveDrag)
	document.documentElement.removeEventListener('touchend', endDrag)

	const toTab = domlinkblocks.classList.contains('in-folder') && (event.composedPath() as Element[])[0] !== domlinklist
	const toFolder = !!document.querySelector('.almost-folder')
	const newIndex = ids.indexOf(draggedId)
	const block = blocks.get(draggedId)
	const coord = coords[newIndex]

	window.cancelAnimationFrame(dragAnimationFrame)
	blocks.get(draggedId)?.classList.remove('on')
	domlinkblocks?.classList.replace('dragging', 'dropping')
	document.body?.classList.replace('dragging', 'dropping')

	if (toFolder || toTab) {
		blocks.get(draggedId)?.classList.add('removed')
	} else {
		deplaceElem(block, coord.x, coord.y)
	}

	setTimeout(() => {
		storage.sync.get().then((data) => {
			if (toTab) dropToTab()
			else if (toFolder) dropToFolder(data)
			else dropToNewPosition(data)
			domlinkblocks?.classList.remove('dropping')
			document.body.classList.remove('dropping')
			domlinklist?.removeAttribute('style')
		})
	}, 1000)
}

function dropToTab() {
	linksUpdate({ removeFromFolder: [draggedId] })
	document.querySelectorAll<HTMLElement>('#linkblocks li.block').forEach((li) => {
		li.removeAttribute('style')
	})
}

function dropToFolder(data: Sync.Storage) {
	const almostFolders = [...document.querySelectorAll<HTMLElement>('.almost-folder')]
	const targetIsFolder = blocks.get(targetId)?.classList.contains('folder')
	const draggedIsFolder = blocks.get(draggedId)?.classList.contains('folder')
	const createsFolder = almostFolders.length > 0 && !targetIsFolder && !draggedIsFolder
	const concatFolders = almostFolders.length > 0 && (targetIsFolder || draggedIsFolder)

	blocks.forEach((block) => block.classList.remove('almost-folder'))

	if (createsFolder) {
		linksUpdate({ addFolder: [targetId, draggedId] })
	}
	//
	else if (concatFolders) {
		const addToFolder: AddToFolder = { target: '', ids: [] }

		if (targetIsFolder && draggedIsFolder) {
			addToFolder.source = draggedId
			addToFolder.target = targetId
			addToFolder.ids = (data[draggedId] as Links.Folder)?.ids ?? []
		}
		//
		else if (targetIsFolder && !draggedIsFolder) {
			addToFolder.target = targetId
			addToFolder.ids = [draggedId]
		}
		//
		else if (!targetIsFolder && draggedIsFolder) {
			addToFolder.target = draggedId
			addToFolder.ids = [targetId]
		}

		linksUpdate({ addToFolder })
	}
}

function dropToNewPosition(data: Sync.Storage) {
	const folderid = domlinkblocks.dataset.folderid

	for (const id of ids) {
		const elem = document.getElementById(id)

		if (elem) {
			domlinklist?.appendChild(elem)
			elem.removeAttribute('style')
		}
	}

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

function isDraggingOver({ x, y }: { x: number; y: number }): [BlockZone, string] | undefined {
	for (const zone of dropzones) {
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

		let side: BlockZone = ''

		if (isInLeftEdge) side = 'left'
		if (isInRightEdge) side = 'right'
		if (isInCenter) side = 'center'

		if (side) {
			return [side, zone.id]
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
