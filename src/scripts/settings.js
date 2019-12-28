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
	const custom = id("i_bgfile");
	const customStyle = id("fileContainer");
	let fontObj = {};

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


	//custom bg

	id("i_bgfile").onchange = function(e) {
		renderImage(this.files[0], "change");
	};

	/*id("i_quality").oninput = function() {
		customBackground({cat: "quality", value: this.value})
	}*/



	id("i_blur").oninput = function() {
		filter("blur", this.value);
		slowRange({"background_blur": parseInt(this.value)});
	};

	id("i_bright").oninput = function() {
		filter("bright", this.value);
		slowRange({"background_bright": parseFloat(this.value)});
	};

	id("i_dark").onchange = function() {
		darkmode(this.value)
	}

	id("i_distract").onchange = function() {
		distractMode(this);
	}



	//Time and date

	id("i_analog").onchange = function() {
		newClock({param: "analog", value: this.checked});
	}

	id("i_seconds").onchange = function() {
		newClock({param: "seconds", value: this.checked});
	}

	id("i_ampm").onchange = function() {
		newClock({param: "ampm", value: this.checked});
	}

	id("i_timezone").onchange = function() {
		newClock({param: "timezone", value: this.value});
	}

	id("i_usdate").onchange = function() {

		let rep = (this.checked ? true : false);

		localStorage.usdate = rep;
		chrome.storage.sync.set({"usdate": rep});
		date();
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

function initParams() {

	const data = JSON.parse(sessionStorage.data);

	initInput = (dom, cat, base) => (id(dom).value = (cat !== undefined ? cat : base));
	initCheckbox = (dom, cat) => (id(dom).checked = (cat ? true : false));
	isThereData = (cat, sub) => (data[cat] ? data[cat][sub] : undefined);

	initInput("i_type", data.background_type, "default");
	initInput("i_blur", data.background_blur, 25);
	initInput("i_bright", data.background_bright, 1);
	initInput("i_dark", data.dark, "disable");
	initInput("i_sbengine", data.searchbar_engine, "s_startpage");
	initInput("i_timezone", isThereData("clock", "timezone"), "auto");
	initInput("i_freq", isThereData("dynamic", "every"), "hour");
	initInput("i_ccode", isThereData("weather", "ccode"), "US");

	initCheckbox("i_geol", isThereData("weather", "location"));
	initCheckbox("i_units", (isThereData("weather", "unit") === "imperial"));
	initCheckbox("i_distract", data.distract);
	initCheckbox("i_linknewtab", data.linknewtab);
	initCheckbox("i_sb", data.searchbar);
	initCheckbox("i_usdate", data.usdate);
	initCheckbox("i_ampm", isThereData("clock", "ampm"), false);
	

	if (sessionStorage.pro = "true") {

		initInput("i_row", data.linksrow, 8);
		initInput("i_customfont", isThereData("font", "family"), false);
		initInput("i_weight", isThereData("font", "weight"), "auto");
		initInput("i_size", isThereData("font", "size"), "auto");
		initInput("i_greeting", data.greeting, "");
		initInput("cssEditor", data.css, "");
		
		initCheckbox("i_seconds", isThereData("clock", "seconds"), false);
		initCheckbox("i_analog", isThereData("clock", "analog"), false);
		initCheckbox("i_quotes", isThereData("quote", "enabled"), false);

		id("e_weight").innerText = (isThereData("font", "weight") ? isThereData("font", "weight") : "Regular");
		id("e_size").innerText = (isThereData("font", "size") ? isThereData("font", "size") : "Auto");
	}

	
	//bg
	if (data.background_type !== undefined) {

		id(data.background_type).style.display = "block";

		if (data.background_type === "default") {

			for (let e of cl("imgpreview")) {
				if (data.background_image.includes(e.getAttribute("source"))) {
					attr(e, "imgpreview selected")
				}
			}
		}

	} else {
		id("default").style.display = "block";
	}


	if (data.weather) {

		let cityPlaceholder = (data.weather.city ? data.weather.city : "City");
		id("i_city").setAttribute("placeholder", cityPlaceholder);


		if (data.weather.location) id("sett_city").setAttribute("class", "city hidden");
	}
	

	
	//searchbar display settings 
	if (data.searchbar) {
		id("choose_searchengine").setAttribute("class", "shown");
	} else {
		id("choose_searchengine").setAttribute("class", "hidden");
	}


	//clock format localstorage control
	if (data.clockformat === 12) localStorage.clockformat = 12;


	//langue
	id("i_lang").value = localStorage.lang || "en";


	//firefox export
	if(!navigator.userAgent.includes("Chrome")) {
		id("submitExport").style.display = "none";
		id("i_export").style.width = "100%";
	}	
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

		let ui = dominterface;
		let uiClass = dominterface.getAttribute("class");


		if (has("settings", "shown")) {
			attr(that.children[0], "");
			attr(id("settings"), "");
			attr(dominterface, (uiClass === "pushed distract" ? "distract" : ""));

			if (editClass === "shown pushed") attr(edit, "shown");
			
		} else {
			attr(that.children[0], "shown");
			attr(id("settings"), "shown");
			attr(dominterface, (uiClass === "distract" ? "pushed distract" : "pushed"));
			
			if (editClass === "shown") attr(edit, "shown pushed");
		}
	}
} 

function showInterface(e) {

	//cherche le parent du click jusqu'a trouver linkblocks
	//seulement si click droit, quitter la fct
	let parent = e.target;

	while (parent !== null) {

		parent = parent.parentElement;
		if (parent && parent.id === "linkblocks" && e.which === 3) return false;
	}

	//close edit container on interface click
	if (has("edit_linkContainer", "shown")) {
		attr(id("edit_linkContainer"), "");
		domlinkblocks.querySelectorAll(".l_icon_wrap").forEach(function(e) {attr(e, "l_icon_wrap")})
	}

	if (has("settings", "shown")) {

		let edit = id("edit_linkContainer");
		let editClass = edit.getAttribute("class");
		let ui = dominterface;
		let uiClass = dominterface.getAttribute("class");

		attr(id("showSettings").children[0], "");
		attr(id("settings"), "");
		attr(dominterface, (uiClass === "pushed distract" ? "distract" : ""));

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
dominterface.onmouseup = function(e) {
	showInterface(e)
}

//autofocus
document.onkeydown = function(e) {

	//press escape to show settings
	if (e.code === "Escape") {
		showSettings({type: "mousedown"});

		setTimeout(() => {
			showSettings({type: "mouseup"}, id("showSettings"))
		}, 100);
	}


	let searchbar = (id("sb_container") ? has("sb_container", "shown") : false);
	let settings = (id("settings") ? has("settings", "shown") : false);

	if (searchbar && !settings) {

		id("searchbar").focus();
	}
}


function settings() {

	initParams();

	setTimeout(function() {
		settingsEvents();
		signature();
		defaultBg();
		if (sessionStorage.pro = "true") proEvents(); //init events
	}, 200);
}


function proEvents() {

	let fontObj = {}

	id("i_customfont").oninput = function() {
		fontObj = {family: this.value, weight: null, size: null};
		proFunctions({which: "font", event: fontObj});
	}

	id("i_weight").oninput = function() {
		id("e_weight").innerText = this.value;
		fontObj = {family: null, weight: this.value, size: null};
		proFunctions({which: "font", event: fontObj});
	}

	id("i_size").oninput = function() {
		id("e_size").innerText = this.value;
		fontObj = {family: null, weight: null, size: this.value};
		proFunctions({which: "font", event: fontObj});
	}

	id("i_row").oninput = function() {
		proFunctions({which: "row", event: this.value})
	}

	id("i_greeting").onkeyup = function() {
		proFunctions({which: "greet", event: this.value})
	}

	id("i_quotes").onchange = function() {
		proFunctions({which: "quote", event: this.checked});
	}

	id("cssEditor").onkeypress = function(e) {
		let data = {e: e, that: this};
		proFunctions({which: "css", event: data})
	}


	for(e of id("hideelem").children) {

		e.onmouseup = function() {
			proFunctions({which: "hide", event: this.getAttribute("data")})
		}
	}



	for (let i of cl("pro")) {
		i.style.display = "block";
	}

	// pour que ce soit pas trop sale le temps qu'on refasse le CSS
	for (let i of cl("proflex")) {
		i.style.display = "flex";
	}
}