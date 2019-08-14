
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

function intro(info) {

	if (info.reason === "install") {

		chrome.storage.sync.get("isIntroduced", (isIntroduced) => {

			//si l'intro a deja été dismiss alors welcome back
			if (isIntroduced === true) chrome.storage.sync.set({"welcomeback": true});

			chrome.tabs.create({
				url: "chrome-extension://" + chrome.i18n.getMessage("@@extension_id") + "/index.html"
			});
		});
	}
}

function fin() {

	chrome.storage.sync.get("lang", (lang) => {

		var url =  "https://bonjourr.fr/";

		if (lang === "fr") {
			url += "fr/goodbye";
		} else {
			url += "goodbye";
		}

		chrome.runtime.setUninstallURL(url);
	});
}

chrome.runtime.onInstalled.addListener(intro);
fin();