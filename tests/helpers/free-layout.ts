import '../init.ts'
import type { Window } from 'happy-dom'
import type { Widgets } from '../../src/types/shared.ts'

export const VIEWPORT = { width: 1200, height: 800 }
const WIDGET_IDS: Record<Widgets, string> = {
    time: 'time',
    main: 'main',
    quicklinks: 'linkblocks',
    searchbar: 'sb_container',
    notes: 'notes_container',
    quotes: 'quotes_container',
    pomodoro: 'pomodoro_container',
}

export function setupLayout(): void {
    setViewport(VIEWPORT.width, VIEWPORT.height)
    document.body.innerHTML = `
        <main id="interface">
            <div id="time"></div><div id="main"></div><div id="linkblocks"></div>
            <form id="sb_container" class="hidden"></form><div id="notes_container" class="hidden"></div>
            <div id="quotes_container" class="hidden"></div><div id="pomodoro_container" class="hidden"></div>
        </main>
        <div id="show-settings"></div><dialog id="contextmenu"></dialog>
        <button id="b_editmove"></button><button id="b_interface-quotes-refresh"></button>
    `
    const template = Deno.readTextFileSync('src/index.html')
        .match(/<template id="layout-alignment-controls"[\s\S]*?<\/template>/)![0]
    document.body.insertAdjacentHTML('beforeend', template)
}

export function setViewport(width: number, height = VIEWPORT.height): void {
    Object.defineProperty(globalThis, 'innerWidth', { configurable: true, value: width })
    Object.defineProperty(globalThis, 'innerHeight', { configurable: true, value: height })
}

export function widget(id: Widgets): HTMLElement {
    return document.getElementById(WIDGET_IDS[id])!
}

export function click(selector: string): void {
    document.querySelector<HTMLButtonElement>(selector)!.click()
}

export function selectWidget(id: Widgets): void {
    document.querySelector(`[data-widget="${id}"] [data-handle="move"]`)!
        .dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
}

export async function flush(): Promise<void> {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    await (globalThis as unknown as Window).happyDOM.waitUntilComplete()
}
