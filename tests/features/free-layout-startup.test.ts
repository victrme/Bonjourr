import { assert, assertEquals } from '@std/assert'
import { setupLayout, VIEWPORT, widget } from '../helpers/free-layout.ts'
import { gridToRect } from '../../src/scripts/features/free-layout/geometry.ts'
import type { FreeLayout } from '../../src/types/sync.ts'

setupLayout()
document.body.className = 'init loading'
widget('main').classList.add('hidden')
widget('quicklinks').innerHTML = '<div class="link-group"></div>'
Object.defineProperties(document.querySelector('.link-group')!, {
    offsetTop: { value: 0 },
    offsetHeight: { value: 900 },
})
const rect = { x: 0, y: 0, width: 200, height: 100 }
const saved: FreeLayout = {
    enabled: true,
    mode: 'grid',
    viewport: VIEWPORT,
    widgets: {
        time: gridToRect({ column: 0, row: 0, columns: 6, rows: 3 }, VIEWPORT, rect),
        main: gridToRect({ column: 0, row: 6, columns: 6, rows: 4 }, VIEWPORT, rect),
        quicklinks: gridToRect({ column: 8, row: 0, columns: 12, rows: 2 }, VIEWPORT, rect),
    },
}
const { beforeInterfaceDisplay, displayInterface } = await import('../../src/scripts/shared/display.ts')
const { freeLayout } = await import('../../src/scripts/features/free-layout/index.ts')

Deno.test({
    name: 'Cached widgets wait for startup settings; saved positions and link height precede first display',
    sanitizeResources: false,
    sanitizeOps: false,
    fn: () => {
        let prepared = 0
        beforeInterfaceDisplay(() => {
            assert(document.body.classList.contains('loading'))
            freeLayout(saved)
            prepared++
        })
        displayInterface('clock')
        displayInterface('links')
        assertEquals(prepared, 0)
        widget('main').classList.remove('hidden')
        displayInterface('startup')
        assertEquals(prepared, 1)
        assert(!document.body.classList.contains('loading'))
        assertEquals(widget('time').style.getPropertyValue('--tile-column'), '1')
        assertEquals(widget('main').style.getPropertyValue('--tile-row'), '7')
        assert(Number(widget('quicklinks').style.getPropertyValue('--tile-rows')) > 16)
        displayInterface('links')
        assertEquals(prepared, 1)
    },
})
