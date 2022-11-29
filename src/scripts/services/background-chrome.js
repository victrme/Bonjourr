function createNewTab() {
	const url = chrome.runtime.getURL('index.html')
	chrome.tabs.create({ url })
}

function handleInstalled(details) {
	if (details.reason === 'install') createNewTab()
	console.log(details)
}

function goodbye() {
	return 'https://bonjourr.fr/goodbye?from=' + (navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Firefox')
}

chrome.action.onClicked.addListener(createNewTab) // Manifest v3 uses "action" instead of "browserAction"
chrome.runtime.onInstalled.addListener(handleInstalled)
chrome.runtime.setUninstallURL(goodbye())
