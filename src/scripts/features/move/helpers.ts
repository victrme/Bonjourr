import type { Move, MoveLayout, Sync } from '../../../types/sync.ts'
import type { Widgets } from '../../../types/shared.ts'

type Grid = string[][]

type Defaults = {
    single: MoveLayout
    double: MoveLayout
    triple: MoveLayout
}

const MOVE_WIDGETS = ['time', 'main', 'quicklinks', 'notes', 'quotes', 'searchbar', 'pomodoro']

export const elements = {
    time: globalThis.document.getElementById('time'),
    main: globalThis.document.getElementById('main'),
    quicklinks: globalThis.document.getElementById('linkblocks'),
    searchbar: globalThis.document.getElementById('sb_container'),
    notes: globalThis.document.getElementById('notes_container'),
    quotes: globalThis.document.getElementById('quotes_container'),
    pomodoro: globalThis.document.getElementById('pomodoro_container'),
} as const

export const defaultLayouts: Defaults = {
    single: {
        grid: [['time'], ['main'], ['quicklinks']],
        items: {} as MoveLayout['items'],
    },
    double: {
        grid: [
            ['time', '.'],
            ['main', '.'],
            ['quicklinks', '.'],
        ],
        items: {} as MoveLayout['items'],
    },
    triple: {
        grid: [
            ['time', '.', '.'],
            ['main', '.', '.'],
            ['quicklinks', '.', '.'],
        ],
        items: {} as MoveLayout['items'],
    },
}

export function getLayout(data: Move | Sync, selection?: Move['selection']): MoveLayout {
    if ('move' in data) {
        const layouts = data.move.layouts
        const selec = selection ?? data.move.selection
        return layouts[selec] ?? defaultLayouts[selec]
    }

    const layouts = data.layouts
    const selec = selection ?? data.selection
    return layouts?.[selec] ?? defaultLayouts[selec]
}

//	Grid

function gridValidate(grid: Grid): boolean {
    const cells = grid.flat()
    const cellsAreWidgets = cells.every((val) => val === '.' || MOVE_WIDGETS.includes(val))
    return cellsAreWidgets
}

export function gridParse(area = ''): Grid {
    const stringToGrid = (split: string): string[][] => {
        const rows = area.split(split).filter((a) => a.length > 1)
        const grid = rows.map((r) => r.split(' '))
        return grid
    }

    const result = stringToGrid("'")

    if (gridValidate(result)) {
        return result
    }

    return stringToGrid(`\"`)
}

export function gridStringify(grid: Grid): string {
    let areas = ''

    // 2
    const itemListToString = (row: string[]) => row.reduce((a, b) => `${a} ${b}`)

    // 1
    areas = grid.map((row) => `'${itemListToString(row)}'`).join(' ')

    return areas.trimEnd()
}

// Widgets

export function updateWidgetsStorage(states: [Widgets, boolean][], data: Sync): Sync {
    //

    for (const [id, on] of states) {
        if (id === 'time') {
            data.time = on
        }
        if (id === 'main') {
            data.main = on
        }
        if (id === 'quicklinks') {
            data.quicklinks = on
        }
        if (id === 'quotes') {
            data.quotes = { ...data.quotes, on: on }
        }
        if (id === 'pomodoro') {
            data.pomodoro = { ...data.pomodoro, on: on }
        }
        if (id === 'searchbar') {
            data.searchbar = { ...data.searchbar, on: on }
        }
        if (id === 'notes' && data.notes) {
            data.notes = { ...data.notes, on: on }
        }
    }

    return data
}

export function getGridWidgets(area: string): Widgets[] {
    const list = area.replaceAll("'", '').replaceAll('.', '').split(' ')
    const widgets = list.filter((str, i) => str && list.indexOf(str) === i) // remove duplicates
    return widgets as Widgets[]
}

export function addGridWidget(grid: string, id: Widgets, selection: Move['selection']): string {
    const newrow = addGridRow(selection, id)
    let rows = grid.split("'").filter((row) => !(row === ' ' || row === ''))
    let position = 0

    if (grid === '') {
        return `'${newrow}'`
    }

    const isFirstWidgetTime = rows[0].includes('time')
    const isLastWidgetQuotes = rows.at(-1)?.includes('quotes')

    if (id === 'time') {
        position = 0
    }
    if (id === 'main') {
        position = isFirstWidgetTime ? 1 : 0
    }
    if (id === 'notes') {
        position = rows.length === 1 ? 1 : 2
    }
    if (id === 'searchbar') {
        position = rows.length === 1 ? 1 : 2
    }
    if (id === 'pomodoro') {
        position = rows.length === 1 ? 1 : 2
    }
    if (id === 'quicklinks') {
        position = rows.length - (isLastWidgetQuotes ? 1 : 0)
    }
    if (id === 'quotes') {
        position = rows.length
    }

    rows.splice(position, 0, newrow)
    rows = rows.map((row) => `'${row}'`)

    return rows.join(' ')
}

export function removeGridWidget(grid: string, id: Widgets, _: Move['selection']): string {
    let rows = grid.split("'").filter((row) => !(row === ' ' || row === ''))

    rows = rows.filter((row) => !row.includes(id))
    rows = rows.map((row) => `'${row}'`)

    return rows.join(' ')
}

function addGridRow(selection: Move['selection'], id: Widgets): string {
    const firstcolumn = selection === 'triple' ? '. ' : ''
    const lastcolumn = selection === 'triple' || selection === 'double' ? ' .' : ''

    return `${firstcolumn}${id}${lastcolumn}`
}
