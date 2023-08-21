function createNewTab() {
	const url = chrome.runtime.getURL('index.html')
	chrome.tabs.create({ url })
}

function handleInstalled(details) {
	if (details.reason === 'install') createNewTab()
	console.log(details)
}

chrome.action.onClicked.addListener(createNewTab)
chrome.runtime.onInstalled.addListener(handleInstalled)
chrome.runtime.setUninstallURL('https://bonjourr.fr/goodbye')
