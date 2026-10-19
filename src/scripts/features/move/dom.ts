import { elements, gridStringify } from './helpers.ts'

import type { MoveAlign, MoveLayout } from '../../../types/sync.ts'
import type { Widgets } from '../../../types/shared.ts'

export function setGridAreas(grid: MoveLayout['grid'] | string): void {
    const property = typeof grid === 'string' ? grid : gridStringify(grid)
    document.documentElement.style.setProperty('--grid', property)
}

export function setAlign(id: Widgets, align?: MoveAlign): void {
    const { box, text } = align ?? { box: '', text: '' }
    const elem = elements[id]

    if (elem) {
        elem.style.placeSelf = box

        elem.classList.remove('layout-text-left', 'layout-text-right')

        if (text) {
            elem.classList.add(`layout-text-${text}`)
        }
    }
}

export function setAllAligns(items: MoveLayout['items']): void {
    for (const [widget, align] of Object.entries(items)) {
        setAlign(widget as Widgets, align)
    }
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
