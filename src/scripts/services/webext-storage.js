globalThis.startupStorage = {}
globalThis.startupBookmarks = undefined
globalThis.startupTopsites = undefined

chrome.runtime.onMessage.addListener(({ type, content }) => {
	if (type === 'BROWSER_START') {
		globalThis.browserStart = true
	}

	if (type === 'STARTUP_STORAGE') {
		globalThis.startupStorage.sync = content.sync
		globalThis.startupStorage.local = content.local
		globalThis.startupBookmarks = content.bookmarks
		globalThis.startupTopsites = content.topsites

		// document.dispatchEvent(new CustomEvent('webextstorage', { detail: 'sync' }))
		// document.dispatchEvent(new CustomEvent('webextstorage', { detail: 'local' }))
	}
})

chrome.runtime.sendMessage({ type: 'PAGE_READY' })
