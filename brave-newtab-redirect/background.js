// Leitet jeden neuen Tab (brave://newtab) auf die Bonjourr-Startseite um.
//
// Wichtig: Die Bonjourr-Extension muss "index.html" in web_accessible_resources
// deklarieren (seit diesem Change im Repo enthalten), sonst blockt Chromium die
// Navigation mit ERR_BLOCKED_BY_CLIENT (ExtensionNavigationThrottle).

const STORE_ID = 'amflfpakcennfhbnaepmbnfhmjlbcnfk'
const PAGE_PATH = '/index.html'

let targetUrl = `chrome-extension://${STORE_ID}${PAGE_PATH}`

async function resolveBonjourr() {
    try {
        const extensions = await chrome.management.getAll()
        const candidates = extensions.filter(
            (ext) =>
                ext.enabled &&
                ext.type === 'extension' &&
                ext.name.toLowerCase().includes('bonjourr'),
        )
        const bonjourr = candidates.find((ext) => ext.id === STORE_ID) ?? candidates[0]
        if (bonjourr) {
            targetUrl = `chrome-extension://${bonjourr.id}${PAGE_PATH}`
        }
    } catch {
        // Fallback: Store-ID bleibt gesetzt
    }
}

resolveBonjourr()

// Falls Bonjourr später aktiviert/neu geladen wird, Ziel-URL aktualisieren.
chrome.management.onEnabled.addListener(resolveBonjourr)
chrome.management.onInstalled.addListener(resolveBonjourr)

// Erkennt einen frisch geöffneten New-Tab (Brave-eigene Seite).
const isNewTab = (url) =>
    !!url && (url.startsWith('brave://newtab') || url.startsWith('chrome://newtab'))

// Fall 1: Der Tab existiert noch nicht, die URL ist aber schon bekannt.
chrome.tabs.onCreated.addListener((tab) => {
    if (isNewTab(tab.pendingUrl)) {
        chrome.tabs.update(tab.id, { url: targetUrl })
    }
})

// Fall 2: Der Tab wurde bereits auf brave://newtab committet.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (isNewTab(tab.url) || isNewTab(tab.pendingUrl)) {
        chrome.tabs.update(tabId, { url: targetUrl })
    }
})
