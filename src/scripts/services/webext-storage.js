var startupStorage
var startupBookmarks
var startupTopsites

chrome.storage.sync.get(null, (sync) => {
	startupStorage = { ...startupStorage, sync: sync }
	document.dispatchEvent(new Event('webextstorage'))
})

chrome.storage.local.get(null, (local) => {
	startupStorage = { ...startupStorage, local: local }
	document.dispatchEvent(new Event('webextstorage'))
})

chrome.bookmarks?.getTree().then((bookmarks) => {
	startupBookmarks = bookmarks
})

chrome.topSites?.get().then((topsites) => {
	startupTopsites = topsites
})
