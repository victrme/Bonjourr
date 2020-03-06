function selectBackgroundType(cat) {

	id("dynamic").style.display = "none";
	id("custom").style.display = "none";
	id("unicolor").style.display = "none";
	id(cat).style.display = "block";

	if (cat === "dynamic") unsplash()
	else if (cat === "unicolor") {

		// Canvas implementation for modern browsers
		const preview = document.getElementById("colorpreview")
		const input = document.getElementById("hexa")
		var canvas = document.createElement('canvas');
		var ctx = canvas.getContext('2d');

		var drawFunc = function (width, height, type) {
			canvas.width = width;
			canvas.height = height;

			ctx.clearRect(0, 0, canvas.width, canvas.height);

			var hGrad = ctx.createLinearGradient(0, 0, canvas.width, 0);
			var vGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);

			hGrad.addColorStop(0 / 6, '#F00');
			hGrad.addColorStop(1 / 6, '#FF0');
			hGrad.addColorStop(2 / 6, '#0F0');
			hGrad.addColorStop(3 / 6, '#0FF');
			hGrad.addColorStop(4 / 6, '#00F');
			hGrad.addColorStop(5 / 6, '#F0F');
			hGrad.addColorStop(6 / 6, '#F00');

			ctx.fillStyle = hGrad;
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			vGrad.addColorStop(0, 'rgba(0,0,0,0)');
			vGrad.addColorStop(1, 'rgba(0,0,0,1)');
			
			ctx.fillStyle = vGrad;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
		};

		drawFunc(128, 64);
		let rgba = [0, 0, 0];
		
		canvas.onmouseover = function() {

			this.onmousemove = function(e) {

				if (true) {}

				let h = (e.offsetY * 4);
				let w = e.offsetX;
				let wcat = Math.floor(w / 21); //cat is 21px wide

				//module en 7 categories, et multiplie jusqua 255
				let modulated = (w % 21) * 12;

				//red
				if (wcat === 0) rgba = [255, modulated, 0]; 
				//yellow
				else if (wcat === 1) rgba = [255 - modulated, 255, 0]; 
				//green
				else if (wcat === 2) rgba = [0, 255, modulated]; 
				//indigo
				else if (wcat === 3) rgba = [0, 255 - modulated, 255]; 
				//blue
				else if (wcat === 4) rgba = [modulated, 0, 255];
				//purple
				else if (wcat === 5) rgba = [255, 0, 255 - modulated];
				//lastred
				else if (wcat === 6) rgba = [255, 0, 0];
				

				const negativeControl = a => (a < 0 ? 0 : a);


				let colors = 'rgb('
					+ negativeControl(rgba[0] - h) + ', '
					+ negativeControl(rgba[1] - h) + ', '
					+ negativeControl(rgba[2] - h) + ')';

				colorpreview.style.background = colors;
				input.value = colors;
			} 

			this.onmouseup = function(e) {
				console.log(rgba, "as been chosen")
				document.body.style.background = input.value;
			}
		}

		document.getElementById('palette').appendChild(canvas)
	}

	chrome.storage.sync.set({"background_type": cat});
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

	const data = JSON.parse(localEnc(sessionStorage.data, false));

	initInput = (dom, cat, base) => (id(dom).value = (cat !== undefined ? cat : base));
	initCheckbox = (dom, cat) => (id(dom).checked = (cat ? true : false));
	isThereData = (cat, sub) => (data[cat] ? data[cat][sub] : undefined);

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
	

	if (sessionStorage.pro === "true") {

		initInput("i_row", data.linksrow, 8);
		initInput("i_customfont", isThereData("font", "family"), false);
		initInput("i_weight", isThereData("font", "weight"), "auto");
		initInput("i_size", isThereData("font", "size"), "auto");
		initInput("i_greeting", data.greeting, "");
		initInput("cssEditor", data.css, "");
		
		initCheckbox("i_seconds", isThereData("clock", "seconds"), false);
		initCheckbox("i_analog", isThereData("clock", "analog"), false);
		/*initCheckbox("i_quotes", isThereData("quote", "enabled"), false);*/

		/*id("e_row").innerText = (data.linksrow ? data.linksrow : "8");*/
	}

	
	//bg
	if (data.background_type !== undefined)
		id(data.background_type).style.display = "block";
	else
		id("dynamic").style.display = "block";
	

	//ajoute les thumbnails au custom background
	chrome.storage.local.get(["custom"], (data) => {

		let cleanData;
				
		for (var i = 0; i < data.custom.length; i++) {
			cleanData = data.custom[i].replace("data:image/jpeg;base64,", ""); //used for blob
			addThumbnails(cleanData, i)
		}

		fullImage = data.custom
	})

	//weather settings
	if (data.weather) {

		let cityPlaceholder = (data.weather.city ? data.weather.city : "City");
		id("i_city").setAttribute("placeholder", cityPlaceholder);

		if (data.weather.location) id("sett_city").setAttribute("class", "city hidden");
	}
	
	//searchbar display settings 
	id("choose_searchengine").setAttribute("class", (data.searchbar ? "shown" : "hidden"));


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

function showSettings() {

	function display() {
		const edit = id("edit_linkContainer");
		const editClass = edit.getAttribute("class");
		const uiClass = dominterface.getAttribute("class");

		if (has("settings", "shown")) {
			attr(domshowsettings.children[0], "");
			attr(id("settings"), "");
			attr(dominterface, (uiClass === "pushed distract" ? "distract" : ""));

			if (editClass === "shown pushed") attr(edit, "shown");
			
		} else {
			attr(domshowsettings.children[0], "shown");
			attr(id("settings"), "shown");
			attr(dominterface, (uiClass === "distract" ? "pushed distract" : "pushed"));
			
			if (editClass === "shown") attr(edit, "shown pushed");
		}
	}

	function functions() {

		if (sessionStorage.pro === "true") {
			for (let i of cl("pro")) i.style.display = "block";
			for (let i of cl("proflex")) i.style.display = "flex";
		}

		initParams()
		traduction(true)
		setTimeout(() => (display()), 10)
		setTimeout(function() {
			settingsEvents()
			signature()
			if (sessionStorage.pro === "true") proEvents()
		}, 100)
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

function proEvents() {

	let fontObj = {}

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

	/*id("i_quotes").onchange = function() {
		proFunctions({which: "quote", event: this.checked});
	}*/

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