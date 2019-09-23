/*id("i_dynamic").onchange = function() {

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
}*/
/*
id("i_retina").onchange = function() {
	retina(this.checked)
}*/

function defaultBg() {

	let bgTimeout, oldbg;

	id("default").onmouseenter = function() {
		oldbg = imgBackground().slice(4, imgBackground().length - 1);
	}

	id("default").onmouseleave = function() {
		clearTimeout(bgTimeout);
		imgBackground(oldbg);
	}

	function getSource(that) {
		let src = that.children[0].getAttribute("src");
		if (id("i_retina").checked) src = src.replace("/backgrounds/", "/backgrounds/4k/");
		if (!id("i_retina").checked) src = src.replace("/4k", "");

		return src
	}

	function imgEvent(state, that) {

		if (state === "enter") {
			if (bgTimeout) clearTimeout(bgTimeout);

			let src = getSource(that);

			bgTimeout = setTimeout(function() {

				//timeout de 300 pour pas que ça se fasse accidentellement
				//prend le src de la preview et l'applique au background
				imgBackground(src);

			}, 300);

		} else if (state === "leave") {

			clearTimeout(bgTimeout);

		} else if (state === "mouseup") {

			var src = getSource(that);

		    imgBackground(src, "default");
		    imgCredits(src, "default");

			clearTimeout(bgTimeout);
			oldbg = src;

			//enleve selected a tout le monde et l'ajoute au bon
			remSelectedPreview();
			//ici prend les attr actuels et rajoute selected après (pour ioswallpaper)
			var tempAttr = that.getAttribute("class");
			that.setAttribute("class", tempAttr + " selected");

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
	} else {
		/*chrome.storage.sync.get(["previous_type"], (data) => {

			if (data.previous_type && data.previous_type !== "dynamic") {
				chrome.storage.sync.set({"background_type": data.previous_type});
			} else {
				chrome.storage.sync.set({"background_type": "default"});
			}
			
			initBackground();
		});*/
	}
}

function settingsEvents() {

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

	id("i_ampm").onchange = function() {
		clock(this)
	}

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

	id("i_type").onchange = function() {
		selectBackgroundType(this.value)
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

	id("i_sb").onchange = function() {

		if (!stillActive) searchbar("searchbar", this);
		slow(this);
	}

	id("i_sbengine").onchange = function() {
		searchbar("engine", this)
	}

	id("i_lang").onchange = function() {
		localStorage.lang = this.value;
		sessionStorage.lang = this.value;

		//si local n'est pas utilisé, sync la langue
		if (!localStorage.data) chrome.storage.sync.set({"lang": this.value});

		location.reload();
	}
}

function actualizeStartupOptions() {

	let store = ["background_type", "background_blur", "background_bright", "retina", "dark", "linknewtab", "weather", "searchbar", "searchbar_engine", "clockformat", "lang"];

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
		id("i_lang").value = (localStorage.lang ? localStorage.lang : "en");
	});		
}

id("showSettings").onmouseup = function() {

	function settings() {
		settingsEvents();
		actualizeStartupOptions();
		signature();
		defaultBg();
		selectBackgroundType("default");
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

					setTimeout(function() {
						setClass(that.children[0], "shown");
						setClass(id("settings"), "shown");
						setClass(id("interface"), "pushed");
						settings();
					}, 50)
				}
			}
		}

		xhttp.open("GET", "/settings.html", true);
		xhttp.send();
	}

	let that = this;

	if (id("settings")) {

		if (id("settings").getAttribute("class") === "shown") {
			setClass(that.children[0], "");
			setClass(id("settings"), "");
			setClass(id("interface"), "");
		} else {
			setClass(that.children[0], "shown");
			setClass(id("settings"), "shown");
			setClass(id("interface"), "pushed");
		}

		/*setTimeout(function() {
			id("settings").remove();
		}, 200)*/

	} else {

		init();
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

		setTimeout(function() {
			id("settings").remove()
		}, 200)
	}
}

//autofocus
document.onkeydown = function(e) {

	if (id("sb_container").getAttribute("class") === "shown"
		&& id("settings").getAttribute("class") !== "shown") {

		id("searchbar").focus();
	}
}