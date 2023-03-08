function createNewTab() {
	const url = browser.runtime.getURL('index.html')
	browser.tabs.create({ url })
}

function handleInstalled(details) {
	if (details.reason === 'install') createNewTab()
	console.log(details)
}

browser.browserAction.onClicked.addListener(createNewTab)
browser.runtime.onInstalled.addListener(handleInstalled)
browser.runtime.setUninstallURL('https://bonjourr.fr/goodbye')
