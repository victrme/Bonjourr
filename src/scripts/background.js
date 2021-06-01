function newTab() {
	chrome.tabs.create({
		url: 'chrome://newtab',
	})
}

function goodbye() {
	return 'https://bonjourr.fr/' + (isOnChrome ? 'goodbye_chrome' : 'goodbye_firefox')
}

const isOnChrome = navigator.userAgent.includes('Chrome')

chrome.runtime.setUninstallURL(goodbye())

if (isOnChrome) {
	chrome.browserAction.onClicked.addListener(newTab)
	chrome.runtime.onInstalled.addListener(function (d) {
		if (d && d.reason && d.reason == 'install') newTab()
	})
}
