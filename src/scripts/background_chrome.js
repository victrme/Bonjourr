function fin() {

	chrome.storage.sync.get("lang", (lang) => {

		var url =  "https://bonjourr.fr/";

		if (lang === "fr") {
			url += "fr/goodbye_chrome";
		} else {
			url += "goodbye_chrome";
		}

		chrome.runtime.setUninstallURL(url);
	});
}

fin();