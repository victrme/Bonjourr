function createNewTab() {
	const url = browser.runtime.getURL('index.html')
	browser.tabs.create({ url })
}

function handleInstalled(details) {
	if (details.reason === 'install') createNewTab()
	console.log(details)
}

function goodbye() {
	return 'https://bonjourr.fr/goodbye?from=' + (navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Firefox')
}

browser.browserAction.onClicked.addListener(createNewTab)
browser.runtime.onInstalled.addListener(handleInstalled)
browser.runtime.setUninstallURL(goodbye())
