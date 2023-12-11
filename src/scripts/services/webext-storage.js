var startupStorage = {}

chrome.storage.sync.get(null, (sync) => {
	startupStorage.sync = sync
	document.dispatchEvent(new Event('webextstorage'))
})
chrome.storage.local.get(null, (local) => {
	startupStorage.local = local
	document.dispatchEvent(new Event('webextstorage'))
})
