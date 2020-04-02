function selectBackgroundType(cat) {

	id("dynamic").style.display = "none";
	id("custom").style.display = "none";
	id(cat).style.display = "block";

	if (cat === "dynamic" || cat === "default")
		unsplash()
	else if (cat === "custom")
		displayCustomThumbnails()

	chrome.storage.sync.set({"background_type": cat});
}

function displayCustomThumbnails() {
	chrome.storage.local.get("customThumbnails", (data) => {

		if (data !== undefined) {

			let cleanData
			let thumbs = data.customThumbnails

			for (var i = 0; i < thumbs.length; i++) {
				cleanData = thumbs[i].replace("data:image/jpeg;base64,", ""); //used for blob
				addThumbnails(cleanData, i)
			}

			fullThumbnails = data.customThumbnails

			setTimeout(function() {
				chrome.storage.local.get("custom", (data) => {fullImage = data.custom})
			}, 200)
		}
	})
}

function showall(that) {

	const change = (ev) => {
		for (let d of cl("pro"))
			clas(d, ev ? "pro shown" : "pro")
	}

	const addtransitions = (dom, css) => {
		for (let d of cl(dom))
			d.style.transition = css
	}

	//event
	if (that !== undefined) {

		change(that)
		chrome.storage.sync.set({showall: that})

	//init
	} else {

		const data = JSON.parse(localEnc(disposableData, false))
		change(data.showall)

		//add transitions
		addtransitions("pro", "max-height .2s")
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


	//general

	id("i_showall").onchange = function() {
		showall(this.checked)
	}

	id("i_lang").onchange = function() {

		chrome.storage.sync.set({"lang": this.value});

		//session pour le weather
		sessionStorage.lang = this.value;

		if (sessionStorage.lang)
			location.reload()
	}

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
		date(true, this.checked)
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


	//settings

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


	id("i_customfont").oninput = function() {
		fontObj = {family: this.value, weight: null, size: null};
		proFunctions({which: "font", event: fontObj});
	}

	id("i_weight").oninput = function() {
		fontObj = {family: null, weight: this.value, size: null};
		proFunctions({which: "font", event: fontObj});
	}

	id("i_size").oninput = function() {
		fontObj = {family: null, weight: null, size: this.value};
		proFunctions({which: "font", event: fontObj});
	}

	id("i_row").oninput = function() {
		proFunctions({which: "row", event: this.value})
	}

	id("i_greeting").onkeyup = function() {
		proFunctions({which: "greet", event: this.value})
	}

	id("cssEditor").onkeypress = function(e) {
		let data = {e: e, that: this};
		proFunctions({which: "css", event: data})
	}


	for(e of id("hideelem").querySelectorAll("button")) {

		e.onmouseup = function() {
			proFunctions({which: "hide", event: this})
		}
	}
}

function initParams() {

	const data = JSON.parse(localEnc(disposableData, false))

	initInput = (dom, cat, base) => (id(dom).value = (cat !== undefined ? cat : base))
	initCheckbox = (dom, cat) => (id(dom).checked = (cat ? true : false))
	isThereData = (cat, sub) => (data[cat] ? data[cat][sub] : undefined)

	initInput("i_type", data.background_type, "dynamic")
	initInput("i_blur", data.background_blur, 15)
	initInput("i_bright", data.background_bright, .7)
	initInput("i_dark", data.dark, "disable")
	initInput("i_sbengine", data.searchbar_engine, "s_google")
	initInput("i_timezone", isThereData("clock", "timezone"), "auto")
	initInput("i_freq", isThereData("dynamic", "every"), "hour")
	initInput("i_ccode", isThereData("weather", "ccode"), "US")
	initInput("i_row", data.linksrow, 8)
	initInput("i_customfont", isThereData("font", "family"), "")
	initInput("i_weight", isThereData("font", "weight"), 400)
	initInput("i_size", isThereData("font", "size"), 12)
	initInput("i_greeting", data.greeting, "")
	initInput("cssEditor", data.css, "")

	initCheckbox("i_showall", data.showall)
	initCheckbox("i_geol", isThereData("weather", "location"))
	initCheckbox("i_units", (isThereData("weather", "unit") === "imperial"))
	initCheckbox("i_linknewtab", data.linknewtab)
	initCheckbox("i_sb", data.searchbar)
	initCheckbox("i_usdate", data.usdate)
	initCheckbox("i_ampm", isThereData("clock", "ampm"), false)
	initCheckbox("i_seconds", isThereData("clock", "seconds"), false)
	initCheckbox("i_analog", isThereData("clock", "analog"), false)

	//hide elems
	const all = id("hideelem").querySelectorAll("button")

	//pour tout elem, pour chaque data, trouver une equivalence, appliquer fct
	if (data.hide)
		for (let a of all)
			for (let b of data.hide)
				if (a.getAttribute("data") === b)
					proFunctions({which: "hide", event: a, sett: true})


	//input translation
	id("i_title").setAttribute("placeholder", tradThis("Name"))
	id("i_greeting").setAttribute("placeholder", tradThis("Name"))
	id("i_import").setAttribute("placeholder", tradThis("Import code"))
	id("i_export").setAttribute("placeholder", tradThis("Export code"))
	id("i_customfont").setAttribute("placeholder", tradThis("Any Google fonts"))
	id("cssEditor").setAttribute("placeholder", tradThis("Type in your custom CSS"))


	//bg
	if (data.background_type === "dynamic"
		|| Object.keys(data).length === 0
		|| data.background_type === undefined) {
		id("dynamic").style.display = "block"
	}
	else if (data.background_type === "custom") {
		id("custom").style.display = "block"
		displayCustomThumbnails()
	}
	else if (data.background_type === "default") {
		id("dynamic").style.display = "block"
		id("i_type").value = "dynamic"
		chrome.storage.sync.set({background_type: "dynamic"})
	}

	//weather settings
	if (data.weather && Object.keys(data).length > 0) {

		let cityPlaceholder = (data.weather.city ? data.weather.city : "City");
		id("i_city").setAttribute("placeholder", cityPlaceholder);

		if (data.weather.location)
			id("sett_city").setAttribute("class", "city hidden")

	} else {
		id("sett_city").setAttribute("class", "city hidden")
		id("i_geol").checked = true
	}



	//searchbar display settings
	id("choose_searchengine").setAttribute("class", (data.searchbar ? "shown" : "hidden"));

	//langue
	id("i_lang").value = data.lang || "en";


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

function showSettings() {

	function display() {
		const edit = id("edit_linkContainer");
		const editClass = edit.getAttribute("class");

		if (has("settings", "shown")) {
			clas(domshowsettings.children[0], "");
			clas(id("settings"), "");
			clas(dominterface, "");

			if (editClass === "shown pushed") clas(edit, "shown");

		} else {
			clas(domshowsettings.children[0], "shown");
			clas(id("settings"), "shown");
			clas(dominterface, "pushed");

			if (editClass === "shown") clas(edit, "shown pushed");
		}
	}

	function functions() {

		initParams()
		traduction(true)
		setTimeout(function() {
			display()
			showall()
			settingsEvents()
			signature()
		}, 10)
	}

	function init() {
		let node = document.createElement("div");
		let xhttp = new XMLHttpRequest();

		xhttp.onreadystatechange = function() {
			if (this.readyState == 4) {
				if (this.status == 200) {

					node.id = "settings";
					node.innerHTML = this.responseText;
					document.body.appendChild(node);

					functions()
				}
			}
		}

		xhttp.open("GET", "/settings.html", true);
		xhttp.send();
	}

	if (!id("settings")) init()
	else display()
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
		clas(id("edit_linkContainer"), "");
		domlinkblocks.querySelectorAll(".l_icon_wrap").forEach(function(e) {clas(e, "l_icon_wrap")})
	}

	if (has("settings", "shown")) {

		let edit = id("edit_linkContainer");
		let editClass = edit.getAttribute("class");
		let ui = dominterface;
		let uiClass = dominterface.getAttribute("class");

		clas(id("showSettings").children[0], "");
		clas(id("settings"), "");
		clas(dominterface, "");

		if (editClass === "shown pushed") clas(edit, "shown");
	}
}

domshowsettings.onmouseup = function() {showSettings()}
dominterface.onmouseup = function(e) {showInterface(e)}

document.onkeydown = function(e) {

	//focus la searchbar si elle existe et les settings sont fermé
	const searchbar = (id("sb_container") ? has("sb_container", "shown") : false);
	const settings = (id("settings") ? has("settings", "shown") : false);
	const edit = has("edit_linkContainer", "shown");

	if (searchbar && !settings && !edit) id("searchbar").focus()

	//press escape to show settings
	if (e.code === "Escape") showSettings()
}
