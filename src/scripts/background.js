let extension = browser
if (chrome) extension = chrome

function createNewTab() {
	const url = extension.runtime.getURL('index.html')
	extension.tabs.create({ url })
}

function handleInstalled(details) {
	if (details.reason === 'install') createNewTab()
	console.log(details)
}

function goodbye() {
	return 'https://bonjourr.fr/goodbye?from=' + (navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Firefox')
}

extension.browserAction.onClicked.addListener(createNewTab)
extension.runtime.onInstalled.addListener(handleInstalled)
extension.runtime.setUninstallURL(goodbye())
