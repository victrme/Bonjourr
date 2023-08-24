window.startupStorage = {}

chrome.storage.sync.get(null, (sync) => {
	window.startupStorage.sync = sync
})

chrome.storage.local.get(null, (local) => {
	window.startupStorage.local = local
})
