import { debounce, eventDebounce } from '../utils/debounce.ts'
import { onSettingsLoad } from '../utils/onsettingsload.ts'
import { tradThis } from '../utils/translations.ts'
import { storage } from '../storage.ts'
import PocketEditor from 'pocket-editor'

import type { Scribble } from '../../types/sync.ts'

// <!> This is a brand-new, standalone widget -- it does NOT touch `Notes`,
// <!> `sync.notes`, `#notes_container`, or any of `notes.ts`. Separate
// <!> storage keys, separate DOM, separate module. It's a small draggable,
// <!> resizable "mini window" that remembers its screen position and size,
// <!> and holds BOTH typed markdown (reusing `pocket-editor`, same as
// <!> Notes) and a freehand doodle, stacked in the same space -- not two
// <!> separate modes/views. The pencil button just decides which layer
// <!> currently receives pointer input; both are always rendered, so ink
// <!> can overlap text, which is the point ("if the doodles overlap the
// <!> text, that's fine -- up to the user, it's a fun lil thing"). Position,
// <!> size, and drawing strokes are device-local (`Local.scribblePosition`/
// <!> `Local.scribbleSize`/`Local.scribbleDrawing`) since they're either
// <!> per-device or too bulky for `storage.sync`'s small quota; on/off +
// <!> draw-mode + markdown text stay in `storage.sync` since they're small
// <!> and worth syncing across devices, same tier as `sync.notes`.

type ScribbleEvent = {
    toggle?: boolean
    draw?: boolean
    text?: string
    clear?: true
}

type Point = [number, number]
type Size = { width: number; height: number }

const MIN_WIDTH = 200
const MIN_HEIGHT = 160
const MAX_WIDTH = 640
const MAX_HEIGHT = 640
const DEFAULT_SIZE: Size = { width: 260, height: 268 }

const container = document.getElementById('scribble_container')
const handle = document.getElementById('scribble_handle')
const stage = document.getElementById('scribble_stage')
const writeContainer = document.getElementById('scribble_write')
const canvas = document.getElementById('scribble_draw') as HTMLCanvasElement | null
const ctx = canvas?.getContext('2d') ?? undefined

let initialized = false
let strokes: Point[][] = []
let currentStroke: Point[] | undefined
let isDragging = false
let dragOffset: Point = [0, 0]
let isResizing = false
let editorInstance: PocketEditor | undefined

// <!> The single in-memory source of truth for `storage.sync.scribble`,
// <!> set once in `initScribble`. Every `updateScribble` call mutates THIS
// <!> object and debounce-saves it, rather than each call independently
// <!> re-reading storage, mutating, and writing back -- two events fired
// <!> close together (e.g. typing, then immediately pressing the pencil)
// <!> could otherwise each read the *same* pre-write snapshot, and whichever
// <!> one's debounced write lands last would silently clobber the other's
// <!> change (e.g. the draw-mode toggle winning and reverting the just-typed
// <!> text). Same reasoning as `strokes` already being in-memory state for
// <!> the drawing, just applied to the sync side too.
let scribbleState: Scribble | undefined

export function scribble(init?: Scribble, event?: ScribbleEvent): void {
    if (event) {
        updateScribble(event)
        return
    }

    if (init) {
        init.on ? initScribble(init) : onSettingsLoad(() => initScribble(init))
    }
}

// <!> Synchronous, not async -- mutates the in-memory `scribbleState` and
// <!> schedules a debounced `storage.sync.set` (see `eventDebounce`), no
// <!> `await` needed anywhere in between.
function updateScribble(event: ScribbleEvent): void {
    const scribble = scribbleState

    if (!scribble) {
        return
    }

    if (event.toggle !== undefined) {
        scribble.on = event.toggle
        handleToggle(scribble.on)
    }

    if (event.draw !== undefined) {
        scribble.draw = event.draw
        handleDraw(scribble.draw)
    }

    if (event.text !== undefined) {
        scribble.text = event.text
    }

    if (event.clear) {
        strokes = []
        clearCanvas()
        storage.local.set({ scribbleDrawing: '' })
    }

    eventDebounce({ scribble })
}

//
//	Funcs
//

function initScribble(init: Scribble): void {
    handleToggle(init.on)
    handleDraw(init.draw ?? false)
    syncSettingsCheckbox(init.on)

    if (initialized) {
        return
    }

    initialized = true
    scribbleState = { ...init }

    if (writeContainer) {
        editorInstance = new PocketEditor('#scribble_write', {
            text: init.text ?? translateScribbleText(),
            id: 'scribble-pocket-editor',
        })
        editorInstance.oninput((content) => {
            updateScribble({ text: content })
        })
        bindEmptySpaceFocus()
    }

    initPosition().catch((err) => console.error('Bonjourr: failed to restore scribble position', err))
    initSize().catch((err) => console.error('Bonjourr: failed to restore scribble size', err))
    initDrawing().catch((err) => console.error('Bonjourr: failed to restore scribble drawing', err))

    bindHandleDrag()
    bindResizeHandles()
    bindCanvasDrawing()
    bindControls()
    observeStageSize()
}

// <!> The mounted editor fills the *whole* pad (`min-height: 100%` on
// <!> `#scribble-pocket-editor`, see scribble.css), but its actual editable
// <!> line(s) are only as tall as their content -- on a short/empty pad,
// <!> that's a thin strip at the very top. Without this, clicking anywhere
// <!> in the (very plausible, it's a big blank writing surface) empty space
// <!> below that strip lands on nothing focusable, and every keystroke that
// <!> follows silently goes nowhere. Clicking empty space now focuses the
// <!> last line and drops the caret at its end, same as clicking below the
// <!> last line of text in a real text editor.
function bindEmptySpaceFocus(): void {
    writeContainer?.addEventListener('pointerdown', (event) => {
        const target = event.target as HTMLElement | null

        if (target?.closest('[contenteditable="true"]')) {
            return
        }

        event.preventDefault()
        focusEditorEnd()
    })
}

function focusEditorEnd(): void {
    const lines = editorInstance?.lines
    const lastLine = lines?.[lines.length - 1]

    // <!> `editor.lines` holds each line's *wrapper* element (e.g. the
    // <!> `<div>` around a `<p contenteditable>`), not necessarily something
    // <!> focusable itself -- the actual editable node one level down is
    // <!> what needs `.focus()`.
    const editable = lastLine?.querySelector<HTMLElement>('[contenteditable="true"]') ?? lastLine

    if (!editable) {
        return
    }

    editable.focus()

    const selection = globalThis.getSelection()
    const range = document.createRange()
    range.selectNodeContents(editable)
    range.collapse(false)
    selection?.removeAllRanges()
    selection?.addRange(range)
}

function handleToggle(state: boolean): void {
    container?.classList.toggle('hidden', !state)
}

function handleDraw(active: boolean): void {
    container?.classList.toggle('draw-mode', active)
    document.getElementById('scribble_pencil')?.classList.toggle('selected', active)

    // Entering doodle mode routes pointer input to the canvas (see CSS:
    // `.draw-mode #scribble_write { pointer-events: none }`) -- drop any
    // active text cursor/selection so it doesn't sit there uselessly
    // blinking underneath the ink.
    if (active) {
        const editor = document.getElementById('scribble-pocket-editor')
        if (editor?.contains(document.activeElement)) {
            ;(document.activeElement as HTMLElement | null)?.blur()
        }
    }
}

function syncSettingsCheckbox(state: boolean): void {
    const checkbox = document.getElementById('i_scribble') as HTMLInputElement | null

    if (checkbox) {
        checkbox.checked = state
    }
}

function translateScribbleText(): string {
    const line1 = tradThis('Scribble pad')
    const line2 = tradThis('A tiny playful window for quick markdown notes -- press the pencil to doodle on top')

    return `## ${line1}\n\n${line2}`
}

//	Position (drag to move, remembers where you left it)

async function initPosition(): Promise<void> {
    const { scribblePosition } = await storage.local.get('scribblePosition')
    applyPosition(scribblePosition ?? { x: 40, y: 120 })
}

function applyPosition(pos: { x: number; y: number }): void {
    if (!container) {
        return
    }

    const maxX = Math.max(0, globalThis.innerWidth - container.offsetWidth - 8)
    const maxY = Math.max(0, globalThis.innerHeight - container.offsetHeight - 8)
    const x = Math.min(Math.max(8, pos.x), maxX)
    const y = Math.min(Math.max(8, pos.y), maxY)

    container.style.left = `${x}px`
    container.style.top = `${y}px`
}

const savePosition = debounce((pos: { x: number; y: number }) => {
    storage.local.set({ scribblePosition: pos })
}, 300)

function bindHandleDrag(): void {
    if (!handle || !container) {
        return
    }

    handle.addEventListener('pointerdown', (event) => {
        const pointerEvent = event as PointerEvent

        if ((pointerEvent.target as HTMLElement)?.closest('button')) {
            return
        }

        const rect = container.getBoundingClientRect()
        dragOffset = [pointerEvent.clientX - rect.left, pointerEvent.clientY - rect.top]
        isDragging = true

        handle.setPointerCapture(pointerEvent.pointerId)
        container.classList.add('dragging')
    })

    handle.addEventListener('pointermove', (event) => {
        if (!isDragging) {
            return
        }

        const pointerEvent = event as PointerEvent
        const pos = {
            x: pointerEvent.clientX - dragOffset[0],
            y: pointerEvent.clientY - dragOffset[1],
        }

        applyPosition(pos)
        savePosition(pos)
    })

    const stopDrag = () => {
        isDragging = false
        container.classList.remove('dragging')
    }

    handle.addEventListener('pointerup', stopDrag)
    handle.addEventListener('pointercancel', stopDrag)

    globalThis.addEventListener('resize', () => {
        if (container.classList.contains('hidden')) {
            return
        }

        const left = Number.parseFloat(container.style.left || '0')
        const top = Number.parseFloat(container.style.top || '0')
        applyPosition({ x: left, y: top })
    })
}

//	Size (drag any edge/corner to resize, remembers its dimensions)

async function initSize(): Promise<void> {
    const { scribbleSize } = await storage.local.get('scribbleSize')
    applySize(scribbleSize ?? DEFAULT_SIZE)
}

function applySize(size: Size): void {
    if (!container) {
        return
    }

    const maxWidth = Math.min(MAX_WIDTH, globalThis.innerWidth - 16)
    const maxHeight = Math.min(MAX_HEIGHT, globalThis.innerHeight - 16)
    const width = Math.min(Math.max(MIN_WIDTH, size.width), Math.max(MIN_WIDTH, maxWidth))
    const height = Math.min(Math.max(MIN_HEIGHT, size.height), Math.max(MIN_HEIGHT, maxHeight))

    container.style.width = `${width}px`
    container.style.height = `${height}px`
}

const saveSize = debounce((size: Size) => {
    storage.local.set({ scribbleSize: size })
}, 300)

const RESIZE_DIRS = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as const

function bindResizeHandles(): void {
    if (!container) {
        return
    }

    for (const dir of RESIZE_DIRS) {
        const handleEl = container.querySelector<HTMLElement>(`.scribble_resize[data-dir="${dir}"]`)

        handleEl?.addEventListener('pointerdown', (event) => {
            const pointerEvent = event as PointerEvent
            const rect = container.getBoundingClientRect()

            const start = {
                x: pointerEvent.clientX,
                y: pointerEvent.clientY,
                width: rect.width,
                height: rect.height,
                left: rect.left,
                top: rect.top,
            }

            isResizing = true
            container.classList.add('resizing')
            handleEl.setPointerCapture(pointerEvent.pointerId)

            const onMove = (moveEvent: PointerEvent) => {
                if (!isResizing) {
                    return
                }

                const dx = moveEvent.clientX - start.x
                const dy = moveEvent.clientY - start.y

                let width = start.width
                let height = start.height
                let left = start.left
                let top = start.top

                if (dir.includes('e')) {
                    width = start.width + dx
                }
                if (dir.includes('w')) {
                    width = start.width - dx
                    left = start.left + dx
                }
                if (dir.includes('s')) {
                    height = start.height + dy
                }
                if (dir.includes('n')) {
                    height = start.height - dy
                    top = start.top + dy
                }

                applySize({ width, height })

                // Resizing from the top/left edges keeps the *opposite*
                // corner visually anchored -- the container grows/shrinks
                // toward the pointer instead of just toward the bottom-right,
                // which is what makes north/west handles feel like a real
                // resize instead of a move.
                if (dir.includes('w') || dir.includes('n')) {
                    applyPosition({ x: left, y: top })
                }
            }

            const onEnd = () => {
                isResizing = false
                container.classList.remove('resizing')
                handleEl.removeEventListener('pointermove', onMove)
                handleEl.removeEventListener('pointerup', onEnd)
                handleEl.removeEventListener('pointercancel', onEnd)

                const finalRect = container.getBoundingClientRect()
                const size = { width: finalRect.width, height: finalRect.height }
                saveSize(size)

                if (dir.includes('w') || dir.includes('n')) {
                    const left = Number.parseFloat(container.style.left || '0')
                    const top = Number.parseFloat(container.style.top || '0')
                    savePosition({ x: left, y: top })
                }
            }

            handleEl.addEventListener('pointermove', onMove)
            handleEl.addEventListener('pointerup', onEnd)
            handleEl.addEventListener('pointercancel', onEnd)
        })
    }
}

//	Drawing (freehand doodle mode)

// <!> Canvas backing-store size tracks the *actual* rendered size of
// <!> `#scribble_stage`, not a fixed constant -- the stage now flexes to
// <!> fill however big/small the user has resized the container to. A
// <!> `ResizeObserver` (not the resize-handle drag code) is the single
// <!> source of truth for this, so canvas sizing stays correct regardless
// <!> of *why* the stage's size changed (a resize-handle drag, the
// <!> viewport itself resizing and reflowing layout, etc).
function sizeCanvas(): void {
    if (!canvas || !stage) {
        return
    }

    const dpr = globalThis.devicePixelRatio || 1
    const width = stage.clientWidth
    const height = stage.clientHeight

    canvas.width = width * dpr
    canvas.height = height * dpr
    // Resizing a canvas element (setting .width/.height, even to the same
    // value) wipes its bitmap -- always redraw whatever strokes we have
    // right after, or a resize looks like it silently erased the doodle.
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
    redrawStrokes()
}

async function initDrawing(): Promise<void> {
    const { scribbleDrawing } = await storage.local.get('scribbleDrawing')

    try {
        strokes = scribbleDrawing ? JSON.parse(scribbleDrawing) : []
    } catch (_) {
        strokes = []
    }

    sizeCanvas()
}

// <!> Debounced, not called on every resize-handle pointermove frame --
// <!> tearing down/rebuilding the canvas backing store (and redrawing every
// <!> stroke) on each of those would be wasteful. The stage's CSS size
// <!> (driven by flex, following the container) already updates instantly
// <!> during a drag; only the canvas's actual pixel backing store lags
// <!> slightly behind, which is imperceptible at this debounce window.
const resizeCanvasDebounced = debounce(sizeCanvas, 80)

function observeStageSize(): void {
    if (!stage || typeof ResizeObserver === 'undefined') {
        return
    }

    new ResizeObserver(() => resizeCanvasDebounced()).observe(stage)
}

function bindCanvasDrawing(): void {
    if (!canvas) {
        return
    }

    canvas.addEventListener('pointerdown', (event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) {
            return
        }

        currentStroke = [[event.offsetX, event.offsetY]]
        strokes.push(currentStroke)
        canvas.setPointerCapture(event.pointerId)
        drawDot(event.offsetX, event.offsetY)
    })

    canvas.addEventListener('pointermove', (event) => {
        if (!currentStroke) {
            return
        }

        currentStroke.push([event.offsetX, event.offsetY])
        drawSegment(currentStroke)
    })

    const endStroke = () => {
        if (!currentStroke) {
            return
        }

        currentStroke = undefined
        persistDrawing()
    }

    canvas.addEventListener('pointerup', endStroke)
    canvas.addEventListener('pointerleave', endStroke)
    canvas.addEventListener('pointercancel', endStroke)
}

function drawDot(x: number, y: number): void {
    if (!ctx) {
        return
    }

    ctx.fillStyle = strokeColor()
    ctx.beginPath()
    ctx.arc(x, y, 1.25, 0, Math.PI * 2)
    ctx.fill()
}

function drawSegment(stroke: Point[]): void {
    if (!ctx || stroke.length < 2) {
        return
    }

    const [x1, y1] = stroke[stroke.length - 2]
    const [x2, y2] = stroke[stroke.length - 1]

    ctx.strokeStyle = strokeColor()
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
}

// <!> Canvas 2D context colors can't be CSS `var()` references -- unlike a
// <!> stylesheet, `ctx.fillStyle = 'rgb(var(--x))'` is silently rejected
// <!> (the assignment is ignored, leaving strokes drawn in the context's
// <!> previous/default color -- black, invisible against this widget's
// <!> dark blurred background). Resolve the custom property to real RGB
// <!> channel numbers once and reuse them.
let cachedStrokeColor: string | undefined

function strokeColor(): string {
    if (!cachedStrokeColor) {
        const channels = getComputedStyle(document.documentElement).getPropertyValue('--font-on-blur-color').trim()
        cachedStrokeColor = `rgb(${channels || '255 255 255'})`
    }

    return cachedStrokeColor
}

function redrawStrokes(): void {
    if (!ctx) {
        return
    }

    clearCanvas()

    for (const stroke of strokes) {
        if (stroke.length === 1) {
            drawDot(stroke[0][0], stroke[0][1])
            continue
        }

        for (let i = 1; i < stroke.length; i++) {
            drawSegment(stroke.slice(0, i + 1))
        }
    }
}

function clearCanvas(): void {
    if (!ctx || !canvas) {
        return
    }

    const dpr = globalThis.devicePixelRatio || 1
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
}

const persistDrawing = debounce(() => {
    storage.local.set({ scribbleDrawing: JSON.stringify(strokes) })
}, 400)

//	Controls (mode switch, clear, close)

function bindControls(): void {
    document.getElementById('scribble_pencil')?.addEventListener('click', () => {
        const active = container?.classList.contains('draw-mode') ?? false
        updateScribble({ draw: !active })
    })

    document.getElementById('scribble_clear')?.addEventListener('click', () => {
        updateScribble({ clear: true })
    })

    document.getElementById('scribble_close')?.addEventListener('click', () => {
        syncSettingsCheckbox(false)
        updateScribble({ toggle: false })
    })
}
