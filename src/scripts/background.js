
//thank you iChrome
/*chrome.webRequest.onBeforeRequest.addListener(
	function() {
		return {
			redirectUrl: "chrome-extension://" + chrome.i18n.getMessage("@@extension_id") + "/index.html"
		};
	},
	{
		urls: ["https://bonjourr.fr/redirect"]
	}
);*/

function intro() {

	browser.storage.local.get().then((data) => {

		if (data.isIntroduced === true) {

			browser.storage.local.set({"welcomeback": true});
		}

		browser.tabs.create({
			url:"../../index.html"
		});
	});
}

browser.management.onInstalled.addListener(intro);


/*

function fin() {

	browser.tabs.create({
		url:"https://bonjourr.fr#contact"
	});
}

browser.management.onUninstalled.addListener((info) => {
	console.log(info.name + " was uninstalled");
});

console.log(browser.management.onUninstalled.hasListener(fin));*/