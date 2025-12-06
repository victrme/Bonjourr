import { storage } from '../storage.ts'
import { eventDebounce } from '../utils/debounce.ts'

import type { DragPosition, ElementPosition, Sync } from '../../types/sync.ts'
import type { Widgets } from '../../types/shared.ts'

const SNAP_THRESHOLD = 10 // pixels for snap-to-align
const EDGE_PADDING = 20 // minimum distance from screen edge

// DOM element IDs for each widget
const WIDGET_DOM_IDS: Record<Widgets, string> = {
	time: 'time',
	main: 'main',
	quicklinks: 'linkblocks',
	quotes: 'quotes_container',
	searchbar: 'sb_container',
}

let isDragging = false
let currentElement: HTMLElement | null = null
let currentWidget: Widgets | null = null
let startX = 0
let startY = 0
let elementStartX = 0
let elementStartY = 0

export function initDragPosition(sync: Sync): void {
	const { dragPosition } = sync

	// Apply saved positions
	applyPositions(dragPosition)

	// Setup edit mode toggle from settings
	const editButton = document.getElementById('b_drag_edit')
	const resetButton = document.getElementById('b_drag_reset')

	editButton?.addEventListener('click', () => toggleEditMode(sync))
	resetButton?.addEventListener('click', () => resetPositions())
}

export async function toggleEditMode(sync?: Sync): Promise<void> {
	const data = sync ?? (await storage.sync.get())

	data.dragPosition.editing = !data.dragPosition.editing
	storage.sync.set({ dragPosition: data.dragPosition })

	document.body.classList.toggle('drag-editing', data.dragPosition.editing)

	if (data.dragPosition.editing) {
		enableDragging(data.dragPosition)
	} else {
		disableDragging()
	}
}

export async function resetPositions(): Promise<void> {
	const data = await storage.sync.get('dragPosition')

	// Reset all positions to defaults
	const defaultPositions: Record<Widgets, ElementPosition> = {
		time: { x: 50, y: 30, enabled: false },
		main: { x: 50, y: 45, enabled: false },
		quicklinks: { x: 50, y: 85, enabled: false },
		quotes: { x: 50, y: 90, enabled: false },
		searchbar: { x: 50, y: 60, enabled: false },
	}

	data.dragPosition.positions = defaultPositions
	storage.sync.set({ dragPosition: data.dragPosition })

	// Remove inline styles
	for (const widget of Object.keys(WIDGET_DOM_IDS) as Widgets[]) {
		const element = document.getElementById(WIDGET_DOM_IDS[widget])
		if (element) {
			element.style.removeProperty('position')
			element.style.removeProperty('left')
			element.style.removeProperty('top')
			element.style.removeProperty('transform')
		}
	}
}

function applyPositions(dragPosition: DragPosition): void {
	for (const [widget, position] of Object.entries(dragPosition.positions) as [Widgets, ElementPosition][]) {
		if (position.enabled) {
			const element = document.getElementById(WIDGET_DOM_IDS[widget])
			if (element) {
				applyPositionStyle(element, position)
			}
		}
	}
}

function applyPositionStyle(element: HTMLElement, position: ElementPosition): void {
	element.style.position = 'absolute'
	element.style.left = `${position.x}%`
	element.style.top = `${position.y}%`
	element.style.transform = 'translate(-50%, -50%)'
}

function enableDragging(dragPosition: DragPosition): void {
	for (const widget of Object.keys(WIDGET_DOM_IDS) as Widgets[]) {
		const element = document.getElementById(WIDGET_DOM_IDS[widget])
		if (element) {
			element.classList.add('draggable')
			element.setAttribute('data-widget', widget)

			// If not already positioned, apply default position
			if (!dragPosition.positions[widget]?.enabled) {
				const position = dragPosition.positions[widget] || { x: 50, y: 50, enabled: false }
				applyPositionStyle(element, position)
			}

			element.addEventListener('mousedown', handleDragStart)
			element.addEventListener('touchstart', handleDragStart, { passive: false })
		}
	}

	document.addEventListener('mousemove', handleDragMove)
	document.addEventListener('mouseup', handleDragEnd)
	document.addEventListener('touchmove', handleDragMove, { passive: false })
	document.addEventListener('touchend', handleDragEnd)
}

function disableDragging(): void {
	for (const widget of Object.keys(WIDGET_DOM_IDS) as Widgets[]) {
		const element = document.getElementById(WIDGET_DOM_IDS[widget])
		if (element) {
			element.classList.remove('draggable')
			element.removeEventListener('mousedown', handleDragStart)
			element.removeEventListener('touchstart', handleDragStart)
		}
	}

	document.removeEventListener('mousemove', handleDragMove)
	document.removeEventListener('mouseup', handleDragEnd)
	document.removeEventListener('touchmove', handleDragMove)
	document.removeEventListener('touchend', handleDragEnd)
}

function handleDragStart(e: MouseEvent | TouchEvent): void {
	const target = e.currentTarget as HTMLElement
	const widget = target.getAttribute('data-widget') as Widgets

	if (!widget) return

	e.preventDefault()
	e.stopPropagation()

	isDragging = true
	currentElement = target
	currentWidget = widget

	const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
	const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

	startX = clientX
	startY = clientY

	const rect = target.getBoundingClientRect()
	elementStartX = rect.left + rect.width / 2
	elementStartY = rect.top + rect.height / 2

	currentElement.classList.add('dragging')
}

function handleDragMove(e: MouseEvent | TouchEvent): void {
	if (!isDragging || !currentElement) return

	e.preventDefault()

	const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
	const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

	const deltaX = clientX - startX
	const deltaY = clientY - startY

	let newX = elementStartX + deltaX
	let newY = elementStartY + deltaY

	// Constrain to screen bounds
	const rect = currentElement.getBoundingClientRect()
	const halfWidth = rect.width / 2
	const halfHeight = rect.height / 2

	newX = Math.max(halfWidth + EDGE_PADDING, Math.min(window.innerWidth - halfWidth - EDGE_PADDING, newX))
	newY = Math.max(halfHeight + EDGE_PADDING, Math.min(window.innerHeight - halfHeight - EDGE_PADDING, newY))

	// Snap to center and edges
	const snapPoints = getSnapPoints()
	const snapped = snapToPoints(newX, newY, snapPoints)

	// Convert to percentage
	const percentX = (snapped.x / window.innerWidth) * 100
	const percentY = (snapped.y / window.innerHeight) * 100

	currentElement.style.left = `${percentX}%`
	currentElement.style.top = `${percentY}%`
}

async function handleDragEnd(): Promise<void> {
	if (!isDragging || !currentElement || !currentWidget) return

	isDragging = false
	currentElement.classList.remove('dragging')

	// Save position
	const data = await storage.sync.get('dragPosition')
	const left = parseFloat(currentElement.style.left)
	const top = parseFloat(currentElement.style.top)

	data.dragPosition.positions[currentWidget] = {
		x: left,
		y: top,
		enabled: true,
	}

	eventDebounce({ dragPosition: data.dragPosition })

	currentElement = null
	currentWidget = null
}

interface SnapPoint {
	x: number
	y: number
	type: 'center' | 'element'
}

function getSnapPoints(): SnapPoint[] {
	const points: SnapPoint[] = [
		// Screen center
		{ x: window.innerWidth / 2, y: window.innerHeight / 2, type: 'center' },
		// Horizontal center line
		{ x: window.innerWidth / 2, y: 0, type: 'center' },
		// Vertical center line
		{ x: 0, y: window.innerHeight / 2, type: 'center' },
	]

	// Add other draggable elements as snap points
	for (const widget of Object.keys(WIDGET_DOM_IDS) as Widgets[]) {
		const element = document.getElementById(WIDGET_DOM_IDS[widget])
		if (element && element !== currentElement && element.style.position === 'absolute') {
			const rect = element.getBoundingClientRect()
			points.push({
				x: rect.left + rect.width / 2,
				y: rect.top + rect.height / 2,
				type: 'element',
			})
		}
	}

	return points
}

function snapToPoints(x: number, y: number, points: SnapPoint[]): { x: number; y: number } {
	let snappedX = x
	let snappedY = y

	// Snap to horizontal center
	if (Math.abs(x - window.innerWidth / 2) < SNAP_THRESHOLD) {
		snappedX = window.innerWidth / 2
	}

	// Snap to vertical center
	if (Math.abs(y - window.innerHeight / 2) < SNAP_THRESHOLD) {
		snappedY = window.innerHeight / 2
	}

	// Snap to other elements
	for (const point of points) {
		if (point.type === 'element') {
			// Horizontal alignment
			if (Math.abs(x - point.x) < SNAP_THRESHOLD) {
				snappedX = point.x
			}
			// Vertical alignment
			if (Math.abs(y - point.y) < SNAP_THRESHOLD) {
				snappedY = point.y
			}
		}
	}

	return { x: snappedX, y: snappedY }
}
