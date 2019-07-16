
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

	chrome.storage.local.get(null, (data) => {

		if (data.isIntroduced === true) {

			chrome.storage.local.set({"welcomeback": true});
		}

		chrome.tabs.create({
			url:"chrome-extension://" + chrome.i18n.getMessage("@@extension_id") + "/index.html"
		});
	});

	console.log("installed")
}

function fin() {

	chrome.storage.local.get(null, (data) => {

		var url =  "https://bonjourr.fr/";

		if (data.lang === "fr") {
			url += "fr/goodbye";
		} else {
			url += "goodbye";
		}

		chrome.runtime.setUninstallURL(url);
	});

	
}

chrome.management.onInstalled.addListener(function(info) {
	intro();
});

/*fin();
intro();*/

chrome.management.onEnabled.addListener(function() {
	console.log("is enabled");
});