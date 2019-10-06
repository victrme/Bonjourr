
function darkmode(choix) {

	
	function isIOSwallpaper(dark) {

		//défini les parametres a changer en fonction du theme
		var modeurl, actual, urltouse;

		if (dark) {

			modeurl = "ios13_dark";
			actual = "ios13_light";
			urltouse = 'src/images/backgrounds/ios13_dark.jpg';

		} else {
			
			modeurl = "ios13_light";
			actual = "ios13_dark";
			urltouse = 'src/images/backgrounds/ios13_light.jpg';
		}

		//et les applique ici
		if (id("settings")) {
			id("ios_wallpaper").children[0].setAttribute("src", "src/images/backgrounds/" + modeurl + ".jpg");
		}
		
		if (imgBackground().includes(actual)) {

			imgBackground(urltouse, "default");
			chrome.storage.sync.set({"background_image": urltouse});
		}
	}

	
	function applyDark(add, system) {

		if (add) {

			if (system) {

				document.body.setAttribute("class", "autodark");

			} else {

				document.body.setAttribute("class", "dark");
				isIOSwallpaper(true);
			}

		} else {

			document.body.removeAttribute("class");
			isIOSwallpaper(false);
		}
	}

	
	function auto(weather) {

		chrome.storage.sync.get("weather", (data) => {

			var ls = data.weather.lastState;
			var sunrise = new Date(ls.sys.sunrise * 1000);
			var sunset = new Date(ls.sys.sunset * 1000);
			var hr = new Date();

			sunrise = sunrise.getHours() + 1;
			sunset = sunset.getHours();
			hr = hr.getHours();

			if (hr < sunrise || hr > sunset) {
				applyDark(true);
			} else {
				applyDark(false);
			}
		});
	}

	
	function initDarkMode() {

		chrome.storage.sync.get("dark", (data) => {

			var dd = (data.dark ? data.dark : "disable");

			if (dd === "enable") {
				applyDark(true);
			}

			if (dd === "disable") {
				applyDark(false);
			}

			if (dd === "auto") {
				auto();
			}

			if (dd === "system") {
				applyDark(true, true);
			}
		});		
	}

	
	function changeDarkMode() {

		if (choix === "enable") {
			applyDark(true);
			chrome.storage.sync.set({"dark": "enable"});
		}

		if (choix === "disable") {
			applyDark(false);
			chrome.storage.sync.set({"dark": "disable"});
		}

		if (choix === "auto") {

			//prend l'heure et ajoute la classe si nuit
			auto();
			chrome.storage.sync.set({"dark": "auto"});
		}

		if (choix === "system") {
			chrome.storage.sync.set({"dark": "system"});
			applyDark(true, true);
		}
	}

	if (choix) {
		changeDarkMode();
	} else {
		initDarkMode();
	}
}

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
		chrome.storage.local.get("background_blob", (data) => {
			imgBackground(setblob(data.background_blob));
			imgCredits(null, "custom");
		});	

	}
}

function settingsEvents() {

	//quick links
	id("i_title").onkeypress = function(e) {
		quickLinks("input", e)
	}

	id("i_url").onkeypress = function(e) {
		quickLinks("input", e)
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

	id("i_impexp").onchange = function() {
		importExport(this.value)
	}

	id("submitReset").onclick = function() {
		deleteBrowserStorage();
		setTimeout(function() {
			location.reload();
		}, 20);
	}

	id("submitImport").onclick = function() {
		importExport("imp", true);
	}

	id("i_import").onkeypress = function(e) {
		if (e.which === 13) importExport("imp", true);
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
	});		
}

function importExport(select, isEvent) {

	if (select === "exp") {

		id("reset_wrapper").style.display = "none";
		id("imp_wrapper").style.display = "none";
		id("exp_wrapper").style.display = "flex";

		chrome.storage.sync.get(null, (data) => {
			id("i_export").value = JSON.stringify(data);
			id("i_export").select();
		});
		
	}
	else if (select === "imp") {

		id("reset_wrapper").style.display = "none";
		id("exp_wrapper").style.display = "none";
		id("imp_wrapper").style.display = "flex";

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
	else if (select === "res") {

		id("exp_wrapper").style.display = "none";
		id("imp_wrapper").style.display = "none";
		id("reset_wrapper").style.display = "flex";
	}
}

function settings() {
	darkmode();
	settingsEvents();
	actualizeStartupOptions();
	signature();
	defaultBg();
	importExport("imp");
}

id("showSettings").onmousedown = function() {

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

id("showSettings").onmouseup = function() {

	let that = this;


	if (id("settings")) {

		if (id("settings").getAttribute("class") === "shown") {
			attr(that.children[0], "");
			attr(id("settings"), "");
			attr(id("interface"), "");
		} else {
			attr(that.children[0], "shown");
			attr(id("settings"), "shown");
			attr(id("interface"), "pushed");
		}
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

	if (id("settings") && id("settings").getAttribute("class") === "shown") {

		attr(id("showSettings").children[0], "");
		attr(id("settings"), "");
		attr(id("interface"), "");
	}
}

//autofocus
document.onkeydown = function(e) {

	if (id("sb_container").getAttribute("class") === "shown"
		&& id("settings").getAttribute("class") !== "shown") {

		id("searchbar").focus();
	}
}