function defaultBg() {

	let bgTimeout, oldbg;

	id("default").onmouseenter = function() {
		oldbg = id("background").style.backgroundImage.slice(5, imgBackground().length - 2);
	}

	id("default").onmouseleave = function() {
		clearTimeout(bgTimeout);
		imgBackground(oldbg);
	}

	function imgEvent(state, that) {

		if (state === "enter") {

			if (bgTimeout) clearTimeout(bgTimeout);

			let src = "/src/images/backgrounds/" + that.getAttribute("source");

			bgTimeout = setTimeout(function() {

				//timeout de 300 pour pas que ça se fasse accidentellement
				//prend le src de la preview et l'applique au background
				imgBackground(src);

			}, 300);

		} else if (state === "leave") {

			clearTimeout(bgTimeout);

		} else if (state === "mouseup") {

			var src = "/src/images/backgrounds/" + that.getAttribute("source");

		    imgBackground(src);
		    imgCredits(src, "default");

			clearTimeout(bgTimeout);
			oldbg = src;

			//enleve selected a tout le monde et l'ajoute au bon
			remSelectedPreview();
			//ici prend les attr actuels et rajoute selected après (pour ioswallpaper)
			var tempAttr = that.getAttribute("class");
			that.setAttribute("class", tempAttr + " selected");

			chrome.storage.sync.set({"last_default": src});
			chrome.storage.sync.set({"background_image": src});
			chrome.storage.sync.set({"background_type": "default"});
		}
	}

	var imgs = cl("imgpreview");
	for (var i = 0; i < imgs.length; i++) {

		imgs[i].onmouseenter = function() {imgEvent("enter", this)}
		imgs[i].onmouseleave = function() {imgEvent("leave", this)}
		imgs[i].onmouseup = function() {imgEvent("mouseup", this)}
	}
}

function selectBackgroundType(cat) {

	id("default").style.display = "none";
	id("dynamic").style.display = "none";
	id("custom").style.display = "none";

	id(cat).style.display = "block";

	if (cat === "dynamic") {
		chrome.storage.sync.set({"background_type": "dynamic"});
		unsplash()
	}
	else if (cat === "custom") {

		chrome.storage.sync.set({"background_type": "custom"});

		//reste local !!!
		chrome.storage.local.get("background_blob", (data) => {
			if (data.background_blob) {
				imgBackground(setblob(data.background_blob));
			}
			imgCredits(null, "custom");
		});	

	}
}

function settingsEvents() {

	// file input animation
	let custom = id("i_bgfile");
	let customStyle = id("fileContainer");

	custom.addEventListener("dragenter", function(){
	  customStyle.classList.add("dragover");
	});

	custom.addEventListener("dragleave", function(){
	  customStyle.classList.remove("dragover");
	});

	custom.addEventListener("drop", function(){
	  customStyle.classList.remove("dragover");
	});

	//quick links
	id("i_title").onkeypress = function(e) {
		if (e.which === 13) quickLinks("input", e)
	}

	id("i_url").onkeypress = function(e) {
		if (e.which === 13) quickLinks("input", e)
	}

	id("submitlink").onmouseup = function() {
		quickLinks("button", this)
	}

	id("i_linknewtab").onchange = function() {
		quickLinks("linknewtab", this)
	}

	//visuals
	id("i_type").onchange = function() {
		selectBackgroundType(this.value)
	}

	id("i_freq").onchange = function() {
		unsplash(null, this.value);
	}

	id("i_bgfile").onchange = function(e) {
		renderImage(this.files[0], "change");
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

	//weather
	id("b_city").onmouseup = function() {
		if (!stillActive) weather("city", this);
	}

	id("i_city").onkeypress = function(e) {
		if (!stillActive && e.which === 13) weather("city", this)
	}

	id("i_units").onchange = function() {
		if (!stillActive) weather("units", this)
	}

	id("i_geol").onchange = function() {
		if (!stillActive) weather("geol", this)
	}
	
	//searchbar
	id("i_sb").onchange = function() {

		if (!stillActive) searchbar("searchbar", this);
		slow(this);
	}

	id("i_sbengine").onchange = function() {
		searchbar("engine", this)
	}

	//general
	id("i_ampm").onchange = function() {
		clock(this)
	}

	id("i_lang").onchange = function() {

		localStorage.lang = this.value;
		sessionStorage.lang = this.value;
		//si local n'est pas utilisé, sync la langue
		if (!localStorage.data) chrome.storage.sync.set({"lang": this.value});

		//s'assure que le localStorage a bien changé
		if (localStorage.lang) location.reload();
	}


	id("submitReset").onclick = function() {
		importExport("reset");
	}

	id("submitExport").onclick = function() {
		importExport("exp", true);
	}

	id("submitImport").onclick = function() {
		importExport("imp", true);
	}

	id("i_import").onkeypress = function(e) {
		if (e.which === 13) importExport("imp", true);
	}

	id("i_export").onfocus = function() {
		importExport("exp")
	}
}

function actualizeStartupOptions() {

	let store = ["dynamic_freq", "background_type", "background_blur", "background_bright", "retina", "dark", "linknewtab", "weather", "searchbar", "searchbar_engine", "clockformat", "lang"];

	chrome.storage.sync.get(null, (data) => {

		//open in new tab
		id("i_linknewtab").checked = (data.linknewtab ? true : false);

		//default background
		var imgs = cl("imgpreview");
		var bgURL = id("background").style.backgroundImage;
		var previewURL = "";	

		for (var i = 0; i < imgs.length; i++) {
			
			previewURL = imgs[i].children[0].getAttribute("src");

			if (bgURL.includes(previewURL)) {
				imgs[i].setAttribute("class", "imgpreview selected");
			}
		}

		if (data.background_type !== undefined) {
			id("i_type").value = data.background_type;
			id(data.background_type).style.display = "block";
		} else {
			id("i_type").value = "default";
			id("default").style.display = "block";
		}

		id("i_freq").value = (data.dynamic ? (data.dynamic.every ? data.dynamic.every : "hour") : "hour");

		//blur
		id("i_blur").value = (data.background_blur !== undefined ? data.background_blur : 25);


		//brightness
		id("i_bright").value = (data.background_bright !== undefined ? data.background_bright : 1);


		//dark mode input
		id("i_dark").value = (data.dark ? data.dark : "disable");
		

		//weather city input
		if (data.weather && data.weather.city) {
			id("i_city").setAttribute("placeholder", data.weather.city);
		} else {
			id("i_city").setAttribute("placeholder", "City");
		}


		if (data.weather && data.weather.ccode) {
			id("i_ccode").value = data.weather.ccode;
		} else {
			id("i_ccode").value = "US";
		}

		//check geolocalisation
		//enleve city
		if (data.weather && data.weather.location) {

			id("i_geol").checked = true;
			id("sett_city").setAttribute("class", "city hidden");

		} else {

			id("i_geol").checked = false;
		}

		//check imperial
		if (data.weather && data.weather.unit === "imperial") {
			id("i_units").checked = true;
		} else {
			id("i_units").checked = false;
		}

		
		//searchbar switch et select
		if (data.searchbar) {
			id("i_sb").checked = true;
			id("choose_searchengine").setAttribute("class", "shown");
			setTimeout(() => {
		    	id("searchbar").focus();
		    }, 100);
		} else {
			id("i_sb").checked = false;
			id("choose_searchengine").setAttribute("class", "hidden");
		}	
		
		//search engine
		id("i_sbengine").value = (data.searchbar_engine ? data.searchbar_engine : "s_startpage");



		//clock
		if (data.clockformat === 12) {
			id("i_ampm").checked = true;
			localStorage.clockformat = 12;
		} else {
			id("i_ampm").checked = false;
		}
			

		//langue
		id("i_lang").value = localStorage.lang || "en";


		//firefox export
		if(!navigator.userAgent.includes("Chrome")) {
			id("submitExport").style.display = "none";
			id("i_export").style.width = "100%";
		}
	});		
}

function importExport(select, isEvent) {

	if (select === "exp") {

		const input = id("i_export");
		const isOnChrome = (navigator.userAgent.includes("Chrome"));

		chrome.storage.sync.get(null, (data) => {
			input.value = JSON.stringify(data);

			if (isEvent) {

				input.select();

				//doesn't work on firefox for security reason
				//don't want to add permissions just for this
				if (isOnChrome) {
					document.execCommand("copy");
					id("submitExport").innerText = tradThis("Copied");
				}
			}
		});
	}

	else if (select === "imp") {

		if (isEvent) {

			let val = id("i_import").value;

			if (val.length > 0) {

				let data;

				try {

					data = JSON.parse(val);
					chrome.storage.sync.set(data);
					setTimeout(function() {
						location.reload();
					}, 20);

				} catch(e) {
					alert(e);
				}
			}
		}
	}

	else if (select === "reset") {

		let input = id("submitReset");

		if (!input.hasAttribute("sure")) {

			input.innerText = "Are you sure ?";
			input.setAttribute("sure", "");

		} else {

			deleteBrowserStorage();
			setTimeout(function() {
				location.reload();
			}, 20);
		}
	}
}

function settings() {
	settingsEvents();
	actualizeStartupOptions();
	signature();
	defaultBg();
	importExport("exp");
}

function showSettings(e, that) {

	if (e.type === "mousedown") {

		function init() {
			let node = document.createElement("div");
			let xhttp = new XMLHttpRequest();
			
			xhttp.onreadystatechange = function() {
				if (this.readyState == 4) {
					if (this.status == 200) {

						node.id = "settings";
						node.innerHTML = this.responseText;
						document.body.appendChild(node);
						settings();
						traduction(true);
					}
				}
			}

			xhttp.open("GET", "/settings.html", true);
			xhttp.send();
		}

		if (!id("settings")) {
			init();
		}
	}

	if (e.type === "mouseup") {

		let edit = id("edit_linkContainer");
		let editClass = edit.getAttribute("class");

		if (has("settings", "shown")) {
			attr(that.children[0], "");
			attr(id("settings"), "");
			attr(id("interface"), "");

			if (editClass === "shown pushed") attr(edit, "shown");
			
		} else {
			attr(that.children[0], "shown");
			attr(id("settings"), "shown");
			attr(id("interface"), "pushed");
			
			if (editClass === "shown") attr(edit, "shown pushed");
		}
	}
} 

function showInterface(e) {
	//cherche le parent du click jusqu'a trouver linkblocks
	var parent = e.target;
	while (parent !== null) {

		parent = parent.parentElement;
		if (parent && parent.id === "linkblocks") return false;
	}

	//close edit container on interface click
	if (has("edit_linkContainer", "shown")) {
		attr(id("edit_linkContainer"), "");
		id("linkblocks").querySelectorAll(".l_icon_wrap").forEach(function(e) {attr(e, "l_icon_wrap")})
	}

	if (has("settings", "shown")) {

		attr(id("showSettings").children[0], "");
		attr(id("settings"), "");
		attr(id("interface"), "");

		let edit = id("edit_linkContainer");
		let editClass = edit.getAttribute("class");
		if (editClass === "shown pushed") attr(edit, "shown");
	}
}

id("showSettings").onmousedown = function(e) {
	showSettings(e)
}

id("showSettings").onmouseup = function(e) {
	showSettings(e, this)
}

//si settings ouvert, le ferme
id("interface").onmouseup = function(e) {
	showInterface(e)
}

//autofocus
document.onkeydown = function(e) {

	let searchbar = (id("sb_container") ? id("sb_container").getAttribute("class") === "shown" : false);
	let settings = (id("settings") ? (id("settings").getAttribute("class") === "shown") : false);

	if (searchbar && !settings) {

		id("searchbar").focus();
	}
}