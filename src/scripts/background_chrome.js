
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

function intro(infolistener) {

	chrome.management.getSelf().then((infoself) => {

		//check si l'ext installé est la meme que bonjourr
		if (infoself.id === infolistener.id) {

			chrome.storage.sync.get().then((data) => {

				//si l'intro a deja été dismiss alors welcome back
				if (data.isIntroduced === true) chrome.storage.sync.set({"welcomeback": true});

				chrome.tabs.create({
					url:"chrome-extension://" + chrome.i18n.getMessage("@@extension_id") + "/index.html"
				});
			});
		}
	});	
}

function fin() {

	chrome.storage.sync.get(null, (data) => {

		var url =  "https://bonjourr.fr/";

		if (data.lang === "fr") {
			url += "fr/goodbye";
		} else {
			url += "goodbye";
		}

		chrome.runtime.setUninstallURL(url);
	});	
}

chrome.management.onInstalled.addListener(intro);

fin();