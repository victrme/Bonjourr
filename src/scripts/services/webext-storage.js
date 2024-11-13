globalThis.startupStorage = {}
globalThis.startupBookmarks = undefined
globalThis.startupTopsites = undefined

chrome.storage.sync.get(null, (sync) => {
	globalThis.startupStorage.sync = sync
	document.dispatchEvent(new CustomEvent('webextstorage', { detail: 'sync' }))
})

chrome.storage.local.get(null, (local) => {
	globalThis.startupStorage.local = local
	document.dispatchEvent(new CustomEvent('webextstorage', { detail: 'local' }))
})

chrome.bookmarks?.getTree().then((bookmarks) => {
	globalThis.startupBookmarks = bookmarks
})

chrome.topSites?.get().then((topsites) => {
	globalThis.startupTopsites = topsites
})
