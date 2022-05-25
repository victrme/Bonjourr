const isOnChrome = navigator.userAgent.includes('Chrome')
const newTab = () => chrome.tabs.create({ url: 'chrome://newtab' })
const goodbye = () => 'https://bonjourr.fr/goodbye' + (isOnChrome ? '?from=Chrome' : '?from=Firefox')

if (isOnChrome) chrome.action.onClicked.addListener(newTab)

chrome.runtime.setUninstallURL(goodbye())

browser.runtime.onInstalled.addListener(function (d) {
	if (d?.reason === 'install') newTab()
	if (d?.reason === 'update') localStorage.hasUpdated = true
})
