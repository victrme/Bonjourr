
function intro(install) {

	//console.log(install)

	chrome.management.getSelf((infoself) => {

		chrome.storage.sync.get("boot", (b) => {

			if (b.boot) {

				if (install.reason === "update") chrome.storage.sync.set({"boot": "updated"});
				else chrome.storage.sync.set({"boot": "welcomeback"});

			}

			chrome.tabs.create({
				url:"../../index.html"
			});
		});
	});	
}

chrome.runtime.onInstalled.addListener(intro)


chrome.storage.sync.get("lang", (lang) => {

	var url =  "https://bonjourr.fr/";

	if (lang === "fr") {
		url += "fr/goodbye";
	} else {
		url += "goodbye";
	}

	chrome.runtime.setUninstallURL(url);
});