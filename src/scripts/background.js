
//thank you iChrome
chrome.webRequest.onBeforeRequest.addListener(
	function() {
		return {
			redirectUrl: "chrome-extension://" + chrome.i18n.getMessage("@@extension_id") + "/index.html"
		};
	},
	{
		urls: ["https://bonjourr.fr/redirect"]
	}
);

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

function fin() {

	browser.storage.local.get().then((data) => {

		var url =  "https://bonjourr.fr/";

		if (data.lang === "fr") {
			url += "fr/goodbye";
		} else {
			url += "goodbye";
		}

		browser.runtime.setUninstallURL(url);
	});

	
}

function alertUpdate() {
	browser.storage.local.set({"hasupdate": true});
	console.log("Please update Bonjourr !");
}

browser.runtime.onUpdateAvailable.addListener(alertUpdate);
browser.management.onInstalled.addListener(intro);
fin();
