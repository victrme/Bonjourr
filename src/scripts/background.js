
function newTab() {

	chrome.tabs.create({
		url: 'chrome://newtab'
	});
}

function goodbye() {

	let url = "https://bonjourr.fr/";

	//url += (navigator.languages[0] === "fr" ? "fr/" : "");
	url += (isOnChrome ? "goodbye_chrome" : "goodbye_firefox");

	return url
}

const isOnChrome = (navigator.userAgent.includes("Chrome"));

chrome.runtime.setUninstallURL(goodbye());

if (isOnChrome) {
	chrome.browserAction.onClicked.addListener(newTab);
	chrome.runtime.onInstalled.addListener(function(d) {
		if (d && d.reason && d.reason == 'install') newTab();
	});
}