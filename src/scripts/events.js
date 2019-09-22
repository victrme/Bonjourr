id("i_dynamic").onchange = function() {

	if (this.checked) {
		chrome.storage.sync.set({"background_type": "dynamic"});
		unsplash()
	} else {
		chrome.storage.sync.get(["previous_type"], (data) => {

			if (data.previous_type && data.previous_type !== "dynamic") {
				chrome.storage.sync.set({"background_type": data.previous_type});
			} else {
				chrome.storage.sync.set({"background_type": "default"});
			}
			
			initBackground();
		});
	}
}

id("i_retina").onchange = function() {
	retina(this.checked)
}

id("i_bgfile").onchange = function(e) {
	renderImage(this.files[0]);
};

id("i_blur").onchange = function() {
	filter("blur", this.value);
};

id("i_bright").onchange = function() {
	filter("bright", this.value);
};

id("i_dark").onchange = function() {
	darkmode(this.value)
}

id("i_lang").onchange = function() {
	localStorage.lang = this.value;
	sessionStorage.lang = this.value;

	//si local n'est pas utilisé, sync la langue
	if (!localStorage.data) chrome.storage.sync.set({"lang": this.value});

	location.reload();
}

//affiche les settings
id("showSettings").onmouseup = function() {

	if (this.children[0].getAttribute("class") === "shown") {

		setClass(this.children[0], "");
		setClass(id("settings"), "");
		setClass(id("interface"), "");
	} else {
		setClass(this.children[0], "shown");
		setClass(id("settings"), "shown");
		setClass(id("interface"), "pushed");
	}
}


//si settings ouvert, le ferme
id("interface").onmouseup = function(e) {

	//cherche le parent du click jusqu'a trouver linkblocks
	var parent = e.target;
	while (parent !== null) {

		//console.log(parent);
		parent = parent.parentElement;
		if (parent && parent.id === "linkblocks") return false;
	}

	if (id("settings").getAttribute("class") === "shown") {

		setClass(id("showSettings").children[0], "");
		setClass(id("settings"), "");
		setClass(id("interface"), "");
	}
}

//autofocus
document.onkeydown = function(e) {

	if (id("sb_container").getAttribute("class") === "shown"
		&& id("settings").getAttribute("class") !== "shown") {

		id("searchbar").focus();
	}
}