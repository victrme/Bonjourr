window.startupStorage = {}

chrome.storage.sync.get(null, (sync) => {
	window.startupStorage.sync = sync
})

chrome.storage.local.get(['quotesCache', 'unsplashCache', 'translations', 'fontface', 'userQuoteSelection'], (local) => {
	window.startupStorage.local = local
})
