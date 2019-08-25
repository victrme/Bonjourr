
function intro(install) {

	//console.log(install)

	chrome.management.getSelf((infoself) => {

		chrome.storage.local.get("boot", (b) => {

			if (b.boot) {

				if (install.reason === "update") chrome.storage.local.set({"boot": "updated"});
				else chrome.storage.local.set({"boot": "welcomeback"});

			}

			chrome.tabs.create({
				url:"../../index.html"
			});
		});
	});	
}

chrome.runtime.onInstalled.addListener(intro)


chrome.storage.local.get("lang", (lang) => {

	var url =  "https://bonjourr.fr/";

	if (lang === "fr") {
		url += "fr/goodbye";
	} else {
		url += "goodbye";
	}

	chrome.runtime.setUninstallURL(url);
});