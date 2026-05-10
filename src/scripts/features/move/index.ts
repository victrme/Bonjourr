import { addOverlay, removeOverlay, removeSelection, setAlign, setAllAligns, setGridAreas } from './dom.ts'
import { addGridWidget, getWidgetsStorage, gridParse, isDomHealthy } from './helpers.ts'
import { SYNC_DEFAULT } from '../../defaults.ts'
import { toggleWidget } from './widgets.ts'
import { gridMove } from './grid.ts'
import { gridGrow } from './grow.ts'
import { tradThis } from '../../utils/translations.ts'
import { storage } from '../../storage.ts'

import type { SimpleMove, SimpleMoveHorizontal, SimpleMoveText, SimpleMoveVertical, Sync } from '../../../types/sync.ts'
import type { WidgetName } from '../../../types/shared.ts'

type Direction = 'up' | 'down' | 'left' | 'right'

interface UpdateMove {
    id?: string
    widget?: [WidgetName, boolean]
    grow?: Direction
    reset?: true
    toggle?: boolean
    text?: string
    vertical?: string
    horizontal?: string
    overlay?: boolean
    move?: Direction
}

interface AlignChangeOptions {
    horizontal?: string
    vertical?: string
    text?: string
}

const dominterface = document.querySelector<HTMLElement>('#interface')

export function moveElements(init?: SimpleMove, events?: UpdateMove): void {
    if (!init && !events) {
        updateMoveElement({ reset: true })
        return
    }

    if (events) {
        updateMoveElement(events)
        return
    }

    if (init) {
        setAllAligns(init.widgets)
        setGridAreas(init.grid)
    }

    queueMicrotask(() => {
        if (isDomHealthy() === false) {
            updateMoveElement({ reset: true })
        }
    })
}

export async function updateMoveElement(event: UpdateMove): Promise<void> {
    const data = await storage.sync.get()

    if (!data.move) {
        data.move = structuredClone(SYNC_DEFAULT.move)
    }

    if (event.reset) {
        layoutReset(data)
    }
    if (event.toggle !== undefined) {
        toggleMoveStatus(data, event.toggle)
    }
    if (event.overlay !== undefined) {
        // pageWidthOverlay(data.move, event.overlay)
    }

    if (isWidget(event.id)) {
        if (event.widget) {
            toggleWidget(data, event.widget)
        }
        if (event.move) {
            gridMove(data.move, event.id, event.move)
        }
        if (event.grow) {
            gridGrow(data.move, event.id, event.grow)
        }
        if (event.horizontal !== undefined) {
            alignChange(data.move, event.id, { horizontal: event.horizontal })
        }
        if (event.vertical !== undefined) {
            alignChange(data.move, event.id, { vertical: event.vertical })
        }
        if (event.text !== undefined) {
            alignChange(data.move, event.id, { text: event.text })
        }
    }
}

function alignChange(move: SimpleMove, id: WidgetName, options: AlignChangeOptions): void {
    if (isHorizontalAlign(options.horizontal)) {
        move.widgets[id].horizontal = options.horizontal
    }
    if (isVerticalAlign(options.vertical)) {
        move.widgets[id].vertical = options.vertical
    }
    if (isTextAlign(options.text)) {
        move.widgets[id].text = options.text
    }

    storage.sync.set({ move: move })

    setAlign(id, move.widgets[id])
}

function layoutReset(data: Sync): void {
    const enabledWidgets = getWidgetsStorage(data)
    let grid = ''

    for (const id of enabledWidgets) {
        grid = addGridWidget(grid, id)
    }

    data.move = {
        grid: gridParse(grid),
        widgets: structuredClone(SYNC_DEFAULT.move.widgets),
    }

    storage.sync.set(data)

    setGridAreas(grid)
    setAllAligns({
        time: {},
        main: {},
        notes: {},
        quotes: {},
        pomodoro: {},
        searchbar: {},
        quicklinks: {},
    })
}

function toggleMoveStatus(data: Sync, force?: boolean): void {
    const bEditmove = document.getElementById('b_editmove') as HTMLButtonElement
    const isEditing = dominterface?.classList.contains('move-edit')
    const hasOverlay = document.querySelector('.move-overlay') === null

    const state = force ?? !isEditing

    if (!state) {
        bEditmove.textContent = tradThis('Open')
        dominterface?.classList.remove('move-edit')
        removeOverlay()
    } //
    else if (hasOverlay) {
        bEditmove.textContent = tradThis('Close')
        dominterface?.classList.add('move-edit')
        for (const id of getWidgetsStorage(data)) {
            addOverlay(id)
        }
    }

    removeSelection()
}

// function pageWidthOverlay(move: Move, overlay?: boolean): void {
//     const isEditing = document.getElementById('interface')?.classList?.contains('move-edit')
//     const hasOverlays = document.querySelector('.move-overlay')

//     if (!isEditing && overlay === false) {
//         removeOverlay()
//         return
//     }

//     if (!hasOverlays) {
//         const layout = getLayout(move)
//         const grid = gridStringify(layout.grid)
//         const ids = getGridWidgets(grid)

//         for (const id of ids) {
//             addOverlay(id as WidgetName)
//         }
//     }
// }

function isWidget(str = ''): str is WidgetName {
    return ['time', 'main', 'quicklinks', 'notes', 'quotes', 'searchbar', 'pomodoro'].includes(str)
}
function isHorizontalAlign(str = ''): str is SimpleMoveHorizontal {
    return ['center', 'left', 'right'].includes(str)
}
function isVerticalAlign(str = ''): str is SimpleMoveVertical {
    return ['baseline', 'center', 'end'].includes(str)
}
function isTextAlign(str = ''): str is SimpleMoveText {
    return ['center', 'left', 'right'].includes(str)
}
