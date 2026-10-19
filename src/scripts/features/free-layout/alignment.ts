import { elements } from '../move/helpers.ts'
import { tradThis } from '../../utils/translations.ts'
import type { TextAlignment } from '../../../types/sync.ts'
import type { Widgets } from '../../../types/shared.ts'

let controls: HTMLElement

export function contentAlignment(id: Widgets, value?: TextAlignment): TextAlignment {
    if (value) return value
    const element = elements[id]!
    const style = getComputedStyle(element.querySelector('#pocket-editor, #searchbar') ?? element)
    if (style.textAlign === 'center') return 'center'
    if (style.textAlign === 'left' || style.textAlign === 'right') return style.textAlign
    return (style.textAlign === 'end') !== (style.direction === 'rtl') ? 'right' : 'left'
}

export function applyContentAlignment(id: Widgets, value?: TextAlignment): void {
    const element = elements[id]!
    element.toggleAttribute('data-text-aligned', !!value)
    if (value) {
        element.style.setProperty('--content-text', value)
    } else {
        element.style.removeProperty('--content-text')
    }
}

export function createAlignmentControls(change: (value: TextAlignment) => void): HTMLElement {
    controls = document.createElement('section')
    controls.id = 'free-layout-alignment'
    controls.hidden = true
    controls.append(document.createElement('strong'))
    const template = document.querySelector<HTMLTemplateElement>('#layout-alignment-controls')
    const group = template?.content.firstElementChild?.cloneNode(true) as HTMLElement | undefined
    if (group) {
        const label = tradThis('Text alignment')
        group.querySelector('p')!.textContent = label
        const buttons = group.querySelector<HTMLElement>('.mover')!
        buttons.id = 'free-layout-text-alignment'
        buttons.setAttribute('role', 'group')
        buttons.setAttribute('aria-label', label)
        for (const [index, button] of Array.from(buttons.querySelectorAll<HTMLButtonElement>('button')).entries()) {
            button.title = tradThis(['Left', 'Center', 'Right'][index])
            button.setAttribute('aria-label', button.title)
            button.addEventListener('click', () => change(button.dataset.align as TextAlignment))
        }
        controls.append(group)
    }
    return controls
}

export function showAlignmentControls(label?: string, align?: TextAlignment): void {
    controls.hidden = !label
    controls.querySelector('strong')!.textContent = label ?? ''
    for (const button of controls.querySelectorAll<HTMLButtonElement>('button')) {
        const pressed = button.dataset.align === align
        button.classList.toggle('selected', pressed)
        button.setAttribute('aria-pressed', String(pressed))
    }
}
