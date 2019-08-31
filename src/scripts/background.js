function fin() {

	chrome.storage.sync.get("lang", (lang) => {

		var url =  "https://bonjourr.fr/";

		if (lang === "fr") {
			url += "fr/goodbye_firefox";
		} else {
			url += "goodbye_firefox";
		}

		chrome.runtime.setUninstallURL(url);
	});
}

fin();