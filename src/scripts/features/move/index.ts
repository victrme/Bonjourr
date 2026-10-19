import { interfaceFade, setAllAligns, setGridAreas } from './dom.ts'
import { toggleWidget, toggleWidgetInSettings, toggleWidgetOnInterface } from './widgets.ts'
import { getGridWidgets, getLayout, gridStringify, updateWidgetsStorage } from './helpers.ts'
import { transitioner } from '../../utils/transitioner.ts'
import { SYNC_DEFAULT } from '../../defaults.ts'
import { storage } from '../../storage.ts'
import type { Move, Sync } from '../../../types/sync.ts'
import type { Widgets } from '../../../types/shared.ts'

type UpdateMove = {
    widget?: [Widgets, boolean]
    layout?: string
}

export function moveElements(init?: Move, event?: UpdateMove): void {
    if (event) {
        void updateMoveElement(event).catch((error) => console.error('Could not update page layout', error))
        return
    }
    if (init) {
        const { grid, items } = getLayout(init)
        setAllAligns(items)
        setGridAreas(gridStringify(grid))
    }
}

async function updateMoveElement(event: UpdateMove): Promise<void> {
    const data = await storage.sync.get()
    if (!data.move) data.move = structuredClone(SYNC_DEFAULT.move)
    if (event.layout) layoutChange(data, event.layout)
    if (event.widget) toggleWidget(data, event.widget)
}

function layoutChange(data: Sync, column: string): void {
    if (column === data.move.selection) return
    if (column === 'single' || column === 'double' || column === 'triple') {
        data.move.selection = column
    }
    const layout = getLayout(data)
    const widgetsInGrid = getGridWidgets(gridStringify(layout.grid))
    const list: [Widgets, boolean][] = [
        ['time', widgetsInGrid.includes('time')],
        ['main', widgetsInGrid.includes('main')],
        ['notes', widgetsInGrid.includes('notes')],
        ['quotes', widgetsInGrid.includes('quotes')],
        ['pomodoro', widgetsInGrid.includes('pomodoro')],
        ['searchbar', widgetsInGrid.includes('searchbar')],
        ['quicklinks', widgetsInGrid.includes('quicklinks')],
    ]
    const newdata = updateWidgetsStorage(list, data)
    storage.sync.set(newdata)
    const interfaceTransition = transitioner()
    interfaceTransition.first(() => interfaceFade('out'))
    interfaceTransition.after(() => {
        const layout = getLayout(newdata)
        setAllAligns(layout.items)
        setGridAreas(layout.grid)
        toggleWidgetInSettings(list)
        toggleWidgetOnInterface(list)
    })
    interfaceTransition.finally(() => interfaceFade('in'))
    interfaceTransition.transition(200)
}
