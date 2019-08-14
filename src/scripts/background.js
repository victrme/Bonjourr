
function intro(infolistener) {

	browser.management.getSelf((infoself) => {

		//check si l'ext installé est la meme que bonjourr
		if (infoself.id === infolistener.id) {

			chrome.storage.sync.get("isIntroduced", (isIntroduced) => {

				//si l'intro a deja été dismiss alors welcome back
				if (isIntroduced === true) chrome.storage.sync.set({"welcomeback": true});

				chrome.tabs.create({
					url:"../../index.html"
				});
			});
		}
	});	
}

//appelle intro à chaque install
browser.management.onInstalled.addListener(intro);


chrome.storage.sync.get("lang", (lang) => {

	var url =  "https://bonjourr.fr/";

	if (lang === "fr") {
		url += "fr/goodbye";
	} else {
		url += "goodbye";
	}

	browser.runtime.setUninstallURL(url);
});