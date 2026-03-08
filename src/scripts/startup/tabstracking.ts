import { TAB_ID, tabsBc } from '../defaults.ts'

/**
 * To keep track of which Bonjourr tab the user interacted with last
 */
export function tabsTracking(): void {
    // Whenever the tab becomes visible or focused, mark it as active
    function updateLastActiveTab(): void {
        localStorage.setItem('lastActiveTab', TAB_ID)
    }

    if (!document.hidden) {
        updateLastActiveTab()
    }

    globalThis.window.addEventListener('focus', updateLastActiveTab)
    globalThis.window.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            updateLastActiveTab()
        }
    })

    // sends event to other tabs when tab gets closed
    globalThis.window.addEventListener('beforeunload', () => {
        tabsBc.postMessage('tabClosed')
    })

    tabsBc.onmessage = (event) => {
        // when receiving tabClosed event, sets this tab as the last active one
        if (event.data === 'tabClosed') {
            updateLastActiveTab()
        }
    }
}
