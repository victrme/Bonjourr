
chrome.storage.sync.get("lang", (lang) => {

	let url = "https://bonjourr.fr/" + (lang === "fr" ? "fr/" : "");
	url += (navigator.userAgent.includes("Chrome") ? "goodbye_chrome" : "goodbye_firefox");

	chrome.runtime.setUninstallURL(url);
});
