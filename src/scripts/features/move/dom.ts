import { elements, gridStringify } from './helpers.ts'
import { moveElements, updateMoveElement } from './index.ts'
import { getHTMLTemplate } from '../../shared/dom.ts'
import { onclickdown } from 'clickdown/mod'

import type { MoveLayout, SimpleMoveWidget } from '../../../types/sync.ts'
import type { WidgetName } from '../../../types/shared.ts'

const dominterface = document.querySelector<HTMLElement>('#interface')

export function setGridAreas(grid: MoveLayout['grid'] | string): void {
    if (typeof grid === 'string') {
        document.documentElement.style.setProperty('--grid', grid)
    } else {
        document.documentElement.style.setProperty('--grid', gridStringify(grid))
    }
}

export function setAlign(id: WidgetName, align: SimpleMoveWidget): void {
    const elem = elements[id]

    if (elem) {
        if (align.horizontal) {
            elem.style.justifySelf = align.horizontal
        }

        if (align.vertical) {
            elem.style.alignSelf = align.vertical
        }

        if (id === 'quicklinks') {
            document.getElementById('linkblocks')?.classList.remove('text-left', 'text-right')

            if (align.text === 'left') {
                document.getElementById('linkblocks')?.classList.add('text-left')
            }
            if (align.text === 'right') {
                document.getElementById('linkblocks')?.classList.add('text-right')
            }
        } else {
            elem.style.textAlign = align.text || ''
        }
    }
}

export function setAllAligns(widgets: Record<WidgetName, SimpleMoveWidget>): void {
    for (const [widget, align] of Object.entries(widgets)) {
        setAlign(widget as WidgetName, align)
    }
}

export function initOverlayActions(overlay: HTMLDivElement, id: WidgetName): void {
    // Grid move

    const moveGridBottom = overlay.querySelector<HTMLButtonElement>('#move-grid-bottom')
    const moveGridRight = overlay.querySelector<HTMLButtonElement>('#move-grid-right')
    const moveGridLeft = overlay.querySelector<HTMLButtonElement>('#move-grid-left')
    const moveGridTop = overlay.querySelector<HTMLButtonElement>('#move-grid-top')

    onclickdown(moveGridBottom, () => {
        moveElements(undefined, { id, move: 'down' })
    })
    onclickdown(moveGridRight, () => {
        moveElements(undefined, { id, move: 'right' })
    })
    onclickdown(moveGridLeft, () => {
        moveElements(undefined, { id, move: 'left' })
    })
    onclickdown(moveGridTop, () => {
        moveElements(undefined, { id, move: 'up' })
    })

    // Grid align

    const moveAlignHorizontal = overlay.querySelector<HTMLInputElement>('#i_move-align-horizontal')
    const moveAlignVertical = overlay.querySelector<HTMLInputElement>('#i_move-align-vertical')
    const moveAlignText = overlay.querySelector<HTMLInputElement>('#i_move-align-text')

    const horizontals = ['left', 'center', 'right']
    const verticals = ['baseline', 'center', 'end']
    const texts = ['left', 'center', 'right']

    moveAlignHorizontal?.addEventListener('input', function (): void {
        updateMoveElement({ id, horizontal: horizontals[parseInt(this.value)] })
    })
    moveAlignVertical?.addEventListener('input', function (): void {
        updateMoveElement({ id, vertical: verticals[parseInt(this.value)] })
    })
    moveAlignText?.addEventListener('input', function (): void {
        updateMoveElement({ id, text: texts[parseInt(this.value)] })
    })

    // Grid grow

    const moveGrowBottom = overlay.querySelector<HTMLElement>('#move-grow-bottom')
    const moveGrowRight = overlay.querySelector<HTMLElement>('#move-grow-right')
    const moveGrowLeft = overlay.querySelector<HTMLElement>('#move-grow-left')
    const moveGrowTop = overlay.querySelector<HTMLElement>('#move-grow-top')

    onclickdown(moveGrowBottom, () => {
        moveElements(undefined, { id, grow: 'down' })
    })
    onclickdown(moveGrowRight, () => {
        moveElements(undefined, { id, grow: 'right' })
    })
    onclickdown(moveGrowLeft, () => {
        moveElements(undefined, { id, grow: 'left' })
    })
    onclickdown(moveGrowTop, () => {
        moveElements(undefined, { id, grow: 'up' })
    })
}

export function addOverlay(id: WidgetName): void {
    const overlay = getHTMLTemplate<HTMLDivElement>('move-overlay-template', '.move-overlay')
    overlay.id = `move-overlay-${id}`

    dominterface?.appendChild(overlay)
    initOverlayActions(overlay, id)
}

export function removeOverlay(id?: WidgetName): void {
    if (id) {
        document.querySelector(`#move-overlay-${id}`)?.remove()
    } else {
        for (const overlay of document.querySelectorAll('.move-overlay')) {
            overlay.remove()
        }
    }
}

export function removeSelection(): void {
    // const toolbox = document.getElementById('element-mover')
    const elements = document.querySelectorAll<HTMLElement>(
        '.move-overlay, #grid-mover button, .grid-spanner, #element-mover button',
    )

    for (const elem of elements) {
        elem.classList.remove('selected')
        elem.removeAttribute('disabled')
    }

    // toolbox?.classList.remove('active')
}

export function interfaceFade(fade: 'in' | 'out'): void {
    if (fade === 'in') {
        const dominterface = document.getElementById('interface') as HTMLElement
        dominterface.style.removeProperty('opacity')
        setTimeout(() => {
            dominterface.style.transition = ''
        }, 200)
    }

    if (fade === 'out') {
        const dominterface = document.getElementById('interface') as HTMLElement
        dominterface.style.opacity = '0'
        dominterface.style.transition = 'opacity 200ms cubic-bezier(.215,.61,.355,1)'
    }
}
