import { assertEquals } from '@std/assert'
import '../init.ts'
import { userActions } from '../../src/scripts/events.ts'

Deno.test('Escape closes the folder without toggling settings on release', () => {
    document.body.innerHTML = '<div class="in-folder"></div>'
    userActions({ escKey: true, altMode: false, mouseWheelOnGroups: false })

    let closes = 0
    let toggles = 0
    document.addEventListener('close-folder', () => {
        closes++
        document.querySelector('.in-folder')?.classList.remove('in-folder')
    })
    document.addEventListener('toggle-settings', () => toggles++)

    for (const type of ['keydown', 'keyup']) {
        document.body.dispatchEvent(new KeyboardEvent(type, { code: 'Escape', bubbles: true }))
    }

    assertEquals(closes, 1)
    assertEquals(toggles, 0)
})
