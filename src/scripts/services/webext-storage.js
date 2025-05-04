globalThis.startupBookmarks
globalThis.startupTopsites
globalThis.startupStorage = {
	sync: undefined,
	local: undefined,
}

chrome.storage.sync.get().then((data) => {
	globalThis.startupStorage.sync = data

	if (globalThis.pageReady) {
		document.dispatchEvent(
			new CustomEvent('webextstorage', { detail: 'sync' }),
		)
	}
})

chrome.storage.local.get().then((data) => {
	globalThis.startupStorage.local = data

	if (globalThis.pageReady) {
		document.dispatchEvent(
			new CustomEvent('webextstorage', { detail: 'local' }),
		)
	}
})

chrome.bookmarks?.getTree().then((data) => {
	globalThis.startupBookmarks = data
})

chrome.topSites?.get().then((data) => {
	globalThis.startupTopsites = data
})
