
//thank you iChrome
/*chrome.webRequest.onBeforeRequest.addListener(
	function() {
		return {
			redirectUrl: "chrome-extension://" + chrome.i18n.getMessage("@@extension_id") + "/index.html"
		};
	},
	{
		urls: ["https://bonjourr.fr/redirect"]
	}
);*/

function fin() {
	browser.tabs.create({
		url:"../../index.html"
	});
}

browser.management.onUninstalled.addListener(fin);
var lol = browser.management.onUninstalled.hasListener(fin);

lol.then((rep) => {
	console.log(rep);
})