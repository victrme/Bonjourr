var stillActive = false;

id = name => document.getElementById(name);
cl = name => document.getElementsByClassName(name);
attr = (that, val) => that.setAttribute("class", val);
has = (that, val) => id(that) && id(that).getAttribute("class", val) ? true : false;

//cache rapidement temp max pour eviter que ça saccade
if ((new Date).getHours() >= 12) id("temp_max_wrap").style.display = "none";

//c'est juste pour debug le storage
function deleteBrowserStorage() {
	chrome.storage.sync.clear(() => {
		localStorage.clear();
	});
}

function getBrowserStorage() {
	chrome.storage.sync.get(null, (data) => {
		console.log(data);
	});
}

function slow(that) {

	that.setAttribute("disabled", "");

	stillActive = setTimeout(() => {

		that.removeAttribute("disabled");

		clearTimeout(stillActive);
		stillActive = false;
	}, 700);
}

function traduction(ofSettings) {

	let local = localStorage.lang || "en";

	if (local !== "en") {

		let trns = (ofSettings ? id("settings").querySelectorAll('.trn') : document.querySelectorAll('.trn'));
		let dom = [];
		let dict = askfordict();

		for (let k = 0; k < trns.length; k++) {

			//trouve la traduction, sinon laisse le text original
			if (dict[trns[k].innerText])
				dom.push(dict[trns[k].innerText][localStorage.lang]);
			else
				dom.push(trns[k].innerText);
		}
			
		for (let i in trns) {
			trns[i].innerText = dom[i]
		}
	}
}

function tradThis(str) {

	let dict = askfordict();
	let lang = localStorage.lang || "en";

	return (lang === "en" ? str : dict[str][localStorage.lang])
}

function clock(that, is) {

	//pour gerer timezone
	//prendre le timezone du weather
	//le diviser par 60 * 60
	//rajouter le résultat à l'heure actuelle

	let format, timezone;

	function start() {

		function fixSmallMinutes(min) {

			min = min < 10 ? "0" + min : min;
			return min
		}

		function timezoneControl(tz, hour) {

			if (tz === "auto" || tz === undefined) {

				return hour

			} else {

				let d = new Date;
				let offset = d.getTimezoneOffset();
				let utc = hour + (offset / 60);
				let setTime = (utc + parseInt(tz)) % 24;

				/*console.log("Without offset: ", utc);
				console.log("With offset: ", setTime);*/

				return setTime;
			}
		}

		function is12hours(hour) {

			if (hour > 12)
				hour -= 12;
			else
				if (hour === 0)
					hour = 12;
				else
					hour;

			return hour
		}
		
		let h = timezoneControl(timezone, new Date().getHours());
		let m = fixSmallMinutes(new Date().getMinutes());

		if (format === 12) h = is12hours(h);

		id('clock').innerText = h + ":" + m;

		sessionStorage.timesup = setTimeout(start, 5000);
	}

	function change(that) {

		clearTimeout(sessionStorage.timesup);

		if (is === "clock format") {

			format = (that.checked ? 12 : 24);

			//enregistre partout suivant le format
			chrome.storage.sync.set({"clockformat": format});
			localStorage.clockformat = format;

		} else {

			timezone = that.value;

			//enregistre partout suivant le timezone
			chrome.storage.sync.set({"timezone": timezone});
			localStorage.timezone = timezone;
		}

		start();
	}

	format = parseInt(localStorage.clockformat) || 24;
	timezone = (localStorage.timezone === "auto" ? localStorage.timezone : parseInt(localStorage.timezone));

	if (that) change(that);
	else start();
}

function date() {
	const date = new Date();
	const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
	const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];


	if (localStorage.usdate === "true") {

		id("jour").innerText = tradThis(days[date.getDay()]) + ",";
		id("chiffre").innerText = tradThis(months[date.getMonth()]);
		id("mois").innerText = date.getDate();

	} else {

		id("jour").innerText = tradThis(days[date.getDay()]);
		id("chiffre").innerText = date.getDate();
		id("mois").innerText = tradThis(months[date.getMonth()]);
	}
}
	
function greetings() {
	let h = (new Date()).getHours();
	let message;

	if (h > 6 && h < 12) {
		message = tradThis('Good Morning');
	} else if (h >= 12 && h < 18) {
		message = tradThis('Good Afternoon');
	} else if (h >= 18 && h <= 23) {
		message = tradThis('Good Evening');
	} else {
		message = tradThis('Good Night');
	}

	id("greetings").innerText = message;
}

function quickLinks(event, that) {

	//only on init
	if(!event && !that) {
		let dragged, hovered, current;
		let stillActive = false;
	}

	//enleve les selections d'edit
	const removeLinkSelection = x => (id("linkblocks").querySelectorAll(".l_icon_wrap").forEach(function(e) {attr(e, "l_icon_wrap")}));

	//initialise les blocs en fonction du storage
	//utilise simplement une boucle de appendblock
	function initblocks() {

		chrome.storage.sync.get("links", (data) => {

			let array = data.links || false;

			if (array) {

				for (let i in array) {
					appendblock(array[i], i, array);
				}
			}
		});
	}

	function appendblock(arr, index, links) {

		//console.log(arr)
		let icon = (arr.icon.length > 0 ? arr.icon : "src/images/loading.gif");

		//le DOM du block
		let b = `<div class='block' draggable="false" source='${arr.url}'><div class='l_icon_wrap' draggable="false"><img class='l_icon' src='${icon}' draggable="false"></div><span>${arr.title}</span></div>`;

		//ajoute un wrap
		let block_parent = document.createElement('div');
		block_parent.setAttribute("class", "block_parent");
		block_parent.setAttribute("draggable", "true");
		block_parent.innerHTML = b;

		//l'ajoute au dom
		id("linkblocks").appendChild(block_parent);

		//met les events au dernier elem rajouté
		addEvents(id("linkblocks").lastElementChild);

		//si online et l'icon charge, en rechercher une
		if (window.navigator.onLine && icon === "src/images/loading.gif")
			addIcon(id("linkblocks").lastElementChild, arr, index, links);
	}

	function addEvents(elem) {

		function handleDrag(is, that) {

			chrome.storage.sync.get("links", (data) => {

				if (is === "start") {
					let i = findLinkIndex(that, true);
					dragged = [elem, data.links[i], i];
				}
				else if (is === "enter") {
					let i = findLinkIndex(that, true);
					hovered = [elem, data.links[i], i];
				}
				else if (is === "end") {

					//changes html blocks
					current = hovered[0].innerHTML;
					hovered[0].innerHTML = dragged[0].innerHTML;
					dragged[0].innerHTML = current;


					//changes link storage
					let allLinks = data.links;

					allLinks[dragged[2]] = hovered[1];
					allLinks[hovered[2]] = dragged[1];

					chrome.storage.sync.set({"links": allLinks});
				}	
			});	
		}

		elem.ondragstart = function(e) {
			//e.preventDefault();
			e.dataTransfer.setData("text/plain", e.target.id);
			e.currentTarget.style.cursor = "pointer";
			handleDrag("start", this)
		}

		elem.ondragenter = function(e) {
			e.preventDefault();
			handleDrag("enter", this)
		}

		elem.ondragend = function(e) {
			e.preventDefault();
			handleDrag("end", this)
		}

		elem.oncontextmenu = function(e) {
			e.preventDefault();
		}

		elem.onmouseup = function(e) {

			removeLinkSelection();
			(e.which === 3 ? editlink(this) : (!has("settings", "shown") ? openlink(this, e) : ""));
		}
	}

	function editEvents() {
		id("e_delete").onclick = function() {
			removeLinkSelection();
			removeblock(parseInt(id("edit_link").getAttribute("index")));
			attr(id("edit_linkContainer"), "");
		}

		id("e_submit").onclick = function() {
			removeLinkSelection();
			editlink(null, parseInt(id("edit_link").getAttribute("index")))
			attr(id("edit_linkContainer"), "");
		}

		id("e_close").onmouseup = function() {
			removeLinkSelection();
			attr(id("edit_linkContainer"), "");
		}

		id("re_title").onmouseup = function() {
			id("e_title").value = "";
		}

		id("re_url").onmouseup = function() {
			id("e_url").value = "";
		}

		id("re_iconurl").onmouseup = function() {
			id("e_iconurl").value = "";
		}

		//id("e_iconfile").onchange = function(e) {
			//plus tard
		//};
	}

	function editlink(that, i, customIcon) {

		function controlIcon(old) {
			let iconurl = id("e_iconurl");
			let iconfile = id("e_iconfile");

			if (iconurl.value !== "")
				return iconurl.value;
			else
				return old;
		}

		function updateLinkHTML(newElem) {
			let block = id("linkblocks").children[i + 1];

			block.children[0].setAttribute("source", newElem.url);
			block.children[0].lastChild.innerText = newElem.title;
			block.querySelector("img").src = newElem.icon;
		}

		//i is the quick link index here
		if (i || i === 0) {

			chrome.storage.sync.get("links", (data) => {
				let allLinks = data.links;
				let element = {
					title: id("e_title").value,
					url: id("e_url").value,
					icon: controlIcon(data.links[i].icon)
				}

				allLinks[i] = element;
				updateLinkHTML(element);
				chrome.storage.sync.set({"links": allLinks});
			});

		} else {

			let index = findLinkIndex(that, true);
			let liconwrap = that.querySelector(".l_icon_wrap");

			attr(liconwrap, "l_icon_wrap selected");


			if (has("settings", "shown"))
				attr(id("edit_linkContainer"), "shown pushed");
			else
				attr(id("edit_linkContainer"), "shown");



			id("edit_link").setAttribute("index", index);

			chrome.storage.sync.get("links", (data) => {
				id("e_title").value = data.links[index].title;
				id("e_url").value = data.links[index].url;
				id("e_iconurl").value = data.links[index].icon;
			});
		}
	}

	function findLinkIndex(that, isEdit) {
		var bp = (isEdit ? "" : that.parentElement.parentElement.parentElement);
		var sibling = (isEdit ? that : bp);
		var index = -2;

		//trouve l'index avec le nombre d'elements dans linkblocks
		while (sibling.id !== "hiddenlink" || index === 16) {

			sibling = sibling.previousSibling;
			index++;
		}

		return index;
	}

	function removeblock(index) {

		let count = index;

		chrome.storage.sync.get(["links", "searchbar"], (data) => {

			function ejectIntruder(arr) {

				if (arr.length === 1) {
					return []
				}

				if (count === 0) {

					arr.shift();
					return arr;
				}
				else if (count === arr.length) {

					arr.pop();
					return arr;
				}
				else {

					arr.splice(count, 1);
					return arr;
				}
			}

			var linkRemd = ejectIntruder(data.links);

			//si on supprime un block quand la limite est atteinte
			//réactive les inputs
			if (linkRemd.length === 16 - 1) {

				id("i_url").removeAttribute("disabled");
			}

			//enleve le html du block
			var block_parent = id("linkblocks").children[count + 1];
			block_parent.setAttribute("class", "block_parent removed");
			
			setTimeout(function() {

				id("linkblocks").removeChild(block_parent);

				//enleve linkblocks si il n'y a plus de links
				if (linkRemd.length === 0) {
					id("linkblocks").style.visibility = "hidden";
					searchbarFlexControl(data.searchbar, 0);
				}
			}, 200);

			chrome.storage.sync.set({"links": linkRemd});
		});
	}

	function addIcon(elem, arr, index, links) {

		function faviconXHR(url) {

			return new Promise(function(resolve, reject) {

				var xhr = new XMLHttpRequest();
				xhr.open('GET', url, true);

				xhr.onload = function() {

					if (xhr.status >= 200 && xhr.status < 400)
						resolve(JSON.parse(this.response));
					else
						resolve(null);
				}

				xhr.onerror = reject;
				xhr.send()
			})
		}

		function filterIcon(json) {
			//prend le json de favicongrabber et garde la meilleure

			//si le xhr est cassé, prend une des deux icones
			if (json === null) {
				let path = "src/images/icons/";
				path += (Math.random() > .5 ? "orange.png" : "yellow.png");
				return path;
			}

			var s = 0;
			var a, b = 0;

			//garde la favicon la plus grande
			for (var i = 0; i < json.icons.length; i++) {	

				if (json.icons[i].sizes) {

					a = parseInt(json.icons[i].sizes);

					if (a > b) {
						s = i;
						b = a;
					}

				//si il y a une icone android ou apple, la prendre direct
				} else if (json.icons[i].src.includes("android-chrome") || json.icons[i].src.includes("apple-touch")) {
					return json.icons[i].src;
				}
			}

			//si l'url n'a pas d'icones, utiliser besticon
			if (json.icons.length === 0) {
				return "https://besticon.herokuapp.com/icon?url=" + json.domain + "&size=80"
			} else {
				return json.icons[s].src;
			}
		}

		//prend le domaine de n'importe quelle url
		var a = document.createElement('a');
		a.href = arr.url;
		var hostname = a.hostname;

		faviconXHR("https://favicongrabber.com/api/grab/" + hostname).then((icon) => {

			var img = elem.querySelector("img");
			var icn = filterIcon(icon);
			img.src = icn;

			links[index].icon = icn;
			chrome.storage.sync.set({"links": links});
		})
	}

	function linkSubmission() {

		function filterUrl(str) {

			//var ipReg = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\/[-a-zA-Z0-9@:%._\+~#=]{2,256})?$/;
			//var reg = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,10}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g;
			let reg = new RegExp("^(http|https)://", "i");

			//config ne marche pas
			if (str.startsWith("about:") || str.startsWith("chrome://")) {
				return false;
			}

			if (str.startsWith("file://")) {
				return str;
			}

			//premier regex pour savoir si c'est http
			if (!str.match(reg)) {
				str = "http://" + str;
			}

			//deuxieme pour savoir si il est valide (avec http)
			if (str.match(reg)) {
				return str.match(reg).input;
			} else {
				return false;
			}
		}

		function saveLink(lll) {

			slow(id("i_url"));

			//remet a zero les inputs
			id("i_title").value = "";
			id("i_url").value = "";

			let full = false;

			chrome.storage.sync.get(["links", "searchbar"], (data) => {

				let arr = [];

				//array est tout les links + le nouveau
				if (data.links && data.links.length > 0) {

					if (data.links.length < 16 - 1) {

						arr = data.links;
						arr.push(lll);

					} else {
						full = true;
					}

				//array est seulement le link
				} else {
					arr.push(lll);
					id("linkblocks").style.visibility = "visible";
					searchbarFlexControl(data.searchbar, 1);
				}
				
				//si les blocks sont moins que 16
				if (!full) {
					chrome.storage.sync.set({"links": arr});
					appendblock(lll, arr.length - 1, arr);
				} else {

					//desactive tout les input url
					id("i_url").setAttribute("disabled", "disabled");
				}
			});
		}

		titleControl = t => (t.length > 42 ? t.slice(0, 42) + "..." : t);

		//append avec le titre, l'url ET l'index du bloc

		let links = {
			title: titleControl(id("i_title").value),
			url: filterUrl(id("i_url").value),
			icon: ""
		}
		
		//si l'url filtré est juste
		if (links.url && id("i_url").value.length > 2) {

			//et l'input n'a pas été activé ya -1s
			if (!stillActive) saveLink(links);
		}
	}

	function openlink(that, e) {

		let source = that.children[0].getAttribute("source");

		chrome.storage.sync.get("linknewtab", (data) => {

			if (data.linknewtab) {

				chrome.tabs.create({
					url: source
				});

			} else {

				if (e.which === 2) {

					chrome.tabs.create({
						url: source
					});

				} else {

					id("hiddenlink").setAttribute("href", source);
					id("hiddenlink").setAttribute("target", "_self");
					id("hiddenlink").click();
				}
			}	
		});
	}

	if (event === "input") {
		if (that.which === 13) linkSubmission();
	}
	else if (event === "button") {
		linkSubmission();
	}
	else if (event === "linknewtab") {
		if (that.checked) {
			chrome.storage.sync.set({"linknewtab": true});
			id("hiddenlink").setAttribute("target", "_blank");
		} else {
			chrome.storage.sync.set({"linknewtab": false});
			id("hiddenlink").setAttribute("target", "_blank");
		}
	}
	else {
		initblocks();
		editEvents();
	}
}

function weather(event, that) {

	const WEATHER_API_KEY = ["YTU0ZjkxOThkODY4YTJhNjk4ZDQ1MGRlN2NiODBiNDU=", "Y2U1M2Y3MDdhZWMyZDk1NjEwZjIwYjk4Y2VjYzA1NzE=", "N2M1NDFjYWVmNWZjNzQ2N2ZjNzI2N2UyZjc1NjQ5YTk="];

	function cacheControl() {

		chrome.storage.sync.get(["weather", "lang"], (data) => {

			let now = Math.floor((new Date()).getTime() / 1000);
			let param = (data.weather ? data.weather : "");

			if (data.weather && data.weather.lastCall) {

				
				//si weather est vieux d'une demi heure (1800s)
				//ou si on change de lang
				//faire une requete et update le lastcall
				if (sessionStorage.lang || now > data.weather.lastCall + 1800) {

					dataHandling(param.lastState);
					request(param, "current");

					//si la langue a été changé, suppr
					if (sessionStorage.lang) sessionStorage.removeItem("lang");

				} else {

					dataHandling(param.lastState);
				}

				//high ici
				if (data.weather && data.weather.fcDay === (new Date).getDay()) {
					id("temp_max").innerText = data.weather.fcHigh + "°";
				} else {
					request(data.weather, "forecast");
				}

			} else {

				//initialise a Paris + Metric
				//c'est le premier call, requete + lastCall = now
				initWeather();
			}
		});
	}

	
	function initWeather() {

		var param = {
			city: "Paris",
			ccode: "FR",
			location: false,
			unit: "metric"
		};

		navigator.geolocation.getCurrentPosition((pos) => {

			param.location = [];

			//update le parametre de location
			param.location.push(pos.coords.latitude, pos.coords.longitude);
			chrome.storage.sync.set({"weather": param});

			chrome.storage.sync.set({"weather": param});

			request(param, "current");
			request(param, "forecast");
			
		}, (refused) => {

			param.location = false;

			chrome.storage.sync.set({"weather": param});

			request(param, "current");
			request(param, "forecast");
		});
	}

	
	function request(arg, wCat) {

		
		function urlControl(arg, forecast) {

			var url = 'https://api.openweathermap.org/data/2.5/';


			if (forecast)
				url += "forecast?appid=" + atob(WEATHER_API_KEY[0]);
			else
				url += "weather?appid=" + atob(WEATHER_API_KEY[1]);


			//auto, utilise l'array location [lat, lon]
			if (arg.location) {
				url += `&lat=${arg.location[0]}&lon=${arg.location[1]}`;
			} else {
				url += `&q=${encodeURI(arg.city)},${arg.ccode}`;
			}

			url += `&units=${arg.unit}&lang=${localStorage.lang}`;

			return url;
		}

		
		function weatherResponse(parameters, response) {

			//sauvegarder la derniere meteo
			var now = Math.floor((new Date()).getTime() / 1000);
			var param = parameters;
			param.lastState = response;
			param.lastCall = now;
			chrome.storage.sync.set({"weather": param});

			//la réponse est utilisé dans la fonction plus haute
			dataHandling(response);
		}

		
		function forecastResponse(parameters, response) {

			function findHighTemps(d) {
			
				var i = 0;
				var newDay = new Date(d.list[0].dt_txt).getDay();
				var currentDay = newDay;
				var arr = [];
				

				//compare la date toute les 3h (list[i])
				//si meme journée, rajouter temp max a la liste

				while (currentDay == newDay && i < 10) {

					newDay = new Date(d.list[i].dt_txt).getDay();
					arr.push(d.list[i].main.temp_max);

					i += 1;
				}

				var high = Math.floor(Math.max(...arr));

				//renvoie high
				return [high, currentDay];
			}

			var fc = findHighTemps(response);

			//sauvegarder la derniere meteo
			var param = parameters;
			param.fcHigh = fc[0];
			param.fcDay = fc[1];
			chrome.storage.sync.set({"weather": param});

			id("temp_max").innerText = param.fcHigh + "°";
		}

		var url = (wCat === "current" ? urlControl(arg, false) : urlControl(arg, true));

		var request_w = new XMLHttpRequest();
		request_w.open('GET', url, true);

		request_w.onload = function() {
			
			var resp = JSON.parse(this.response);

			if (request_w.status >= 200 && request_w.status < 400) {

				if (wCat === "current") {
					weatherResponse(arg, resp);
				}
				else if (wCat === "forecast") {
					forecastResponse(arg, resp);
				}

			} else {
				submissionError(resp.message);
			}
		}

		request_w.send();
	}	

	
	function dataHandling(data) {

		let hour = (new Date).getHours();

		function getIcon() {
			//si le soleil est levé, renvoi jour
			//le renvoie correspond au nom du répertoire des icones jour / nuit
			function dayOrNight(sunset, sunrise) {
				let ss = new Date(sunset * 1000);
				let sr = new Date(sunrise * 1000);

				return (hour > sr.getHours() && hour < ss.getHours() ? "day" : "night")
			}

			//prend l'id de la météo et renvoie une description
			//correspond au nom de l'icone (+ .png)
			function imgId(c) {

				let temp, codes = {
					"thunderstorm": 200,
					"lightdrizzle": 300,
					"showerdrizzle": 302,
					"lightrain": 500,
					"showerrain": 502,
					"snow": 602,
					"mist": 701,
					"clearsky": 800,
					"fewclouds": 801,
					"brokenclouds": 803
				}	

				for(let key in codes) {

					if (c >= codes[key]) temp = key;
				}

				return temp || "clearsky";
			}

			let d_n = dayOrNight(data.sys.sunset, data.sys.sunrise);
			let weather_id = imgId(data.weather[0].id);
	 		let icon_src = `src/images/weather/${d_n}/${weather_id}.png`;
	 		id("widget").setAttribute("src", icon_src);
	 		id("widget").setAttribute("class", "w_icon shown");
		}

		function getDescription() {

			//pour la description et temperature
			//Rajoute une majuscule à la description
			let meteoStr = data.weather[0].description;
			meteoStr = meteoStr[0].toUpperCase() + meteoStr.slice(1);
			id("desc").innerText = meteoStr + ".";


			//si c'est l'après midi (apres 12h), on enleve la partie temp max
			let dtemp, wtemp;

			if (hour < 12) {

				//temp de desc et temp de widget sont pareil
				dtemp = wtemp = Math.floor(data.main.temp) + "°";

			} else {

				//temp de desc devient temp de widget + un point
				//on vide la catégorie temp max
				wtemp = Math.floor(data.main.temp) + "°";
				dtemp = wtemp + ".";
			}

			id("temp").innerText = dtemp;
			id("widget_temp").innerText = wtemp;
		}

		getDescription();
		getIcon();
	}

	
	function submissionError(error) {

		//affiche le texte d'erreur
		id("wrongCity").innerText = error;
		id("wrongCity").style.display = "block";
		id("wrongCity").style.opacity = 1;

		//l'enleve si le user modifie l'input
		id("i_city").onkeydown = function() {

			id("wrongCity").style.opacity = 0;
			setTimeout(function() {
				id("wrongCity").style.display = "none";
			}, 200);
		}
	}

	
	function updateCity() {

		chrome.storage.sync.get(["weather"], (data) => {

			let param = data.weather;

			param.ccode = id("i_ccode").value;
			param.city = id("i_city").value;

			if (param.city.length < 2) return false;

			request(param, "current");
			request(param, "forecast");

			id("i_city").setAttribute("placeholder", param.city);
			id("i_city").value = "";
			id("i_city").blur();

			chrome.storage.sync.set({"weather": param});
		});	
	}

	
	function updateUnit(that) {

		chrome.storage.sync.get(["weather"], (data) => {

			let param = data.weather;

			if (that.checked) {
				param.unit = "imperial";
			} else {
				param.unit = "metric";
			}

			request(param, "current");
			request(param, "forecast");
			
			chrome.storage.sync.set({"weather": param});
		});
	}

	
	function updateLocation(that) {

		chrome.storage.sync.get(["weather"], (data) => {

			let param = data.weather;
			param.location = [];

			if (that.checked) {

				that.setAttribute("disabled", "");

				navigator.geolocation.getCurrentPosition((pos) => {

					//update le parametre de location
					param.location.push(pos.coords.latitude, pos.coords.longitude);
					chrome.storage.sync.set({"weather": param});

					//request la meteo
					request(param, "current");
					request(param, "forecast");

					//update le setting
					id("sett_city").setAttribute("class", "city hidden");
					that.removeAttribute("disabled");
					
				}, (refused) => {

					//désactive geolocation if refused
					that.checked = false
					that.removeAttribute("disabled");

					if (!param.city) initWeather();
				});

			} else {

				id("sett_city").setAttribute("class", "city");

				id("i_city").setAttribute("placeholder", param.city);
				id("i_ccode").value = param.ccode;

				param.location = false;
				chrome.storage.sync.set({"weather": param});
				
				request(param, "current");
				request(param, "forecast");
			}
		});
	}

	//TOUT LES EVENTS
	if (event === "city") {
		updateCity();
		slow(that);
	}
	else if (event === "units") {
		updateUnit(that);
		slow(that);
	}
	else if (event === "geol") {
		updateLocation(that);
	}
	else {
		cacheControl();
	}
}

function imgCredits(src, type) {

	if (type === "dynamic") {
		attr(id("onUnsplash"), "shown");
		id("location").innerText = src.location.text;
		id("location").setAttribute("href", src.location.url);
		id("artist").innerText = src.artist.text;
		id("artist").setAttribute("href", src.artist.url);
	} else {
		if (type === "default") attr(id("onUnsplash"), "hidden")
	}

	if (type === "custom") attr(id("credit"), "hidden");
	else attr(id("credit"), "shown");

	if (type === "default") {

		const credits = [
			{"title": "Santa Monica",
				"artist": "Avi Richards",
				"url": "https://unsplash.com/photos/KCgADeYejng",
				"id": "avi-richards-beach"},
			{"title": "Waimea Canyon",
				"artist": "Tyler Casey",
				"url": "https://unsplash.com/photos/zMyZrfcLXQE",
				"id": "tyler-casey-landscape"},
			{"title": "Fern",
				"artist": "Tahoe Beetschen",
				"url": "https://unsplash.com/photos/Tlw9fp2Z-8g",
				"id": "tahoe-beetschen-ferns"},
			{"title": "iOS 13 wallpaper",
				"artist": "Apple",
				"url": "https://www.apple.com/ios/ios-13-preview/",
				"id": "ios13"}];

		for (let i in credits) {

			if (src && src.includes(credits[i].id)) {
				id("location").setAttribute("href", credits[i].url);
				id("location").innerText = credits[i].title + " - ";
				id("artist").innerText = credits[i].artist;

				return true;
			}
		}
	}
}

function imgBackground(val) {

	if (val) {
		let img = new Image;
		let load = () => id("background").style.backgroundImage = `url(${val})`;

		img.onload = load;
		img.src = val;
		img.remove();
	} 
	else return id("background").style.backgroundImage;
}
 
function initBackground() {

	chrome.storage.sync.get(["dynamic", "background_image", "background_type", "background_blur", "background_bright"], (data) => {

		let type = data.background_type || "default";
		let image = data.background_image || "src/images/backgrounds/avi-richards-beach.jpg";


		if (data.background_type === "custom") {
			//reste local !!!!
			chrome.storage.local.get("background_blob", (data) => {
				imgBackground(setblob(data.background_blob));
			});
			imgCredits(null, type);
		}
		else if (data.background_type === "dynamic") {

			unsplash(data.dynamic)

		} else {

			//1.6 4k fix
			if (image.includes("4k")) {
				image = image.replace("4k/", "");
			}

			imgBackground(image)
			imgCredits(image, type)
		}


		var blur = (Number.isInteger(data.background_blur) ? data.background_blur : 25);
		var bright = (!isNaN(data.background_bright) ? data.background_bright : 1);

		filter("init", [blur, bright]);

		id("background").style.animation =  "fade .15s ease-in forwards";

		//remet les transitions du blur
		setTimeout(function() {
			id("background").style.transition = "filter .2s";
		}, 50);
	});	
}

function setblob(donnee, reader) {

	const b64toBlob = (b64Data, contentType='', sliceSize=512) => {
		const byteCharacters = atob(b64Data);
		const byteArrays = [];

		for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
			const slice = byteCharacters.slice(offset, offset + sliceSize);

			const byteNumbers = new Array(slice.length);
			for (let i = 0; i < slice.length; i++) {
				byteNumbers[i] = slice.charCodeAt(i);
			}

			const byteArray = new Uint8Array(byteNumbers);
			byteArrays.push(byteArray);
		}

		const blob = new Blob(byteArrays, {type: contentType});
		return blob;
	}

	//découpe les données du file en [contentType, base64data]
	let base = (reader ? donnee.split(",") : donnee);
	let contentType = base[0].replace("data:", "").replace(";base64", "");
	let b64Data = base[1];

	//creer le blob et trouve l'url
	let blob = b64toBlob(b64Data, contentType);
	let blobUrl = URL.createObjectURL(blob);

	return (reader ? [base, blobUrl] : blobUrl);
}

function renderImage(file, is) {

	let reader = new FileReader();
	reader.onload = function(event) {

		let result = event.target.result;
		let blobArray = setblob(result, true);

		if (is === "change") {

			imgBackground(blobArray[1]);

			chrome.storage.local.set({"background_blob": blobArray[0]}); //reste local !!!!
			chrome.storage.sync.set({"background_image": blobArray[1]});
			chrome.storage.sync.set({"background_type": "custom"});

		}
	}

	reader.readAsDataURL(file);
}

function unsplash(data, event) {

	if (data && data !== true) cacheControl(data);
	else {

		chrome.storage.sync.get("dynamic", (storage) => {

			//si on change la frequence, juste changer la freq
			if (event) {
				storage.dynamic.every = event;
				chrome.storage.sync.set({"dynamic": storage.dynamic});
				return true;
			}

			if (storage.dynamic && storage.dynamic !== true) {
				cacheControl(storage.dynamic)
			} else {
				let initDyn = {
					current: {
						url: "",
						link: "",
						username: "",
						name: "",
						city: "",
						country: ""
					},
					next: {
						url: "",
						link: "",
						username: "",
						name: "",
						city: "",
						country: "",
					},
					every: "hour",
					time: 0
				}

				cacheControl(initDyn)
			}
		});
	}

	function freqControl(state, every, last) {

		const d = new Date;
		if (state === "set") return (every === "tabs" ? 0 : d.getTime());

		if (state === "get") {

			let calcLast = 0;
			let today = d.getTime();

			if (every === "hour") calcLast = last + 3600 * 1000;
			else if (every === "day") calcLast = last + 86400 * 1000;
			else if (every === "pause") calcLast = 10**13 - 1; //le jour de la fin du monde lmao

			//retourne le today superieur au calculated last
			return (today > calcLast);
		}
	}

	function cacheControl(d) {

		//as t on besoin d'une nouvelle image ?
		let needNewImage = freqControl("get", d.every, d.time);
		if (needNewImage) {

			//sauvegarde le nouveau temps
			d.time = freqControl("set", d.every);

			//si next n'existe pas, init
			if (d.next.url === "") {

				req("current", d, true);

			//sinon prendre l'image preloaded (next)
			} else {

				imgBackground(d.next.url);
				credit(d.next);
				req("current", d, false);
			}

		//pas besoin d'image, simplement current
		} else {
			imgBackground(d.current.url);
			credit(d.current);
		}
	}

	function req(which, d, init) {

		obf = n => (n===0?atob("aHR0cHM6Ly9hcGkudW5zcGxhc2guY29tL3Bob3Rvcy9yYW5kb20/Y29sbGVjdGlvbnM9NDkzMzM3MA=="):atob("MzY4NmMxMjIyMWQyOWNhOGY3OTQ3Yzk0NTQyMDI1ZDc2MGE4ZTBkNDkwMDdlYzcwZmEyYzRiOWY5ZDM3N2IxZA=="));
		let xhr = new XMLHttpRequest();
		xhr.open('GET', obf(0), true);
		xhr.setRequestHeader('Authorization',`Client-ID ${obf(1)}`);

		xhr.onload = function() {
			
			let resp = JSON.parse(this.response);

			if (xhr.status >= 200 && xhr.status < 400) {

				let screenWidth = window.devicePixelRatio * screen.width;

				resp = {
					url: resp.urls.raw +`&w=${screenWidth}&fm=jpg&q=70`,
					link: resp.links.html,
					username: resp.user.username,
					name: resp.user.name,
					city: resp.location.city,
					country: resp.location.country
				}

				if (init) {

					//si init, fait 2 req (current, next) et save sur la 2e
					if (which === "current") {
						d.current = resp;
						imgBackground(d.current.url);
						credit(d.current);
						req("next", d, true);
					}
					else if (which === "next") {
						d.next = resp;
						chrome.storage.sync.set({"dynamic": d});
					}

				//si next existe, current devient next et next devient la requete
				} else {

					d.current = d.next;
					d.next = resp;
					chrome.storage.sync.set({"dynamic": d});
				}
			}
		}
		xhr.send();
	}

	function credit(d) {

		let loc = "";

		if (d.city !== null && d.country !== null) loc = `${d.city}, ${d.country} - `;
		else if (d.country !== null) loc = `${d.country} - `;
		else loc = "Photo - ";

		let infos = {
			location: {
				text: loc,
				url: `${d.link}?utm_source=Bonjourr&utm_medium=referral`
			},
			artist: {
				text: d.name, 
				url: `https://unsplash.com/@${d.username}?utm_source=Bonjourr&utm_medium=referral`
			}
		}

		imgCredits(infos, "dynamic");
	}
}

function remSelectedPreview() {
	let a = cl("imgpreview");

	for (var i = 0; i < a.length; i++) {

		if (a[i].classList[1] === "selected")
			a[i].setAttribute("class", "imgpreview")
	}
}

function filter(cat, val) {

	if (cat === "init") {
		id('background').style.filter = `blur(${val[0]}px) brightness(${val[1]})`;
	}

	if (cat === "blur") {
		let brightness = id("i_bright").value;
		id('background').style.filter = `blur(${val}px) brightness(${brightness})`;
		chrome.storage.sync.set({"background_blur": +val})
	}

	if (cat === "bright") {
		let blur = id("i_blur").value;
		id('background').style.filter = `blur(${blur}px) brightness(${val})`;
		chrome.storage.sync.set({"background_bright": +val});
	}
}

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

function searchbarFlexControl(activated, linkslength) {

	if (linkslength > 0) {

		if (activated)
			attr(id("sb_container"), "shown");
		else
			attr(id("sb_container"), "removed");
		
	} else {

		if (activated)
			attr(id("sb_container"), "shown");
		else
			attr(id("sb_container"), "removed");
	}
}

function searchbar(event, that) {

	function activate(activated, links, init) {

		if (activated) {	

			if(!init) id("choose_searchengine").setAttribute("class", "shown");

			searchbarFlexControl(activated, (links ? links.length : 0));
			chrome.storage.sync.set({"searchbar": true});
			
		} else {

			//pour animer un peu
			if(!init) id("choose_searchengine").setAttribute("class", "hidden");
			
			searchbarFlexControl(activated, (links ? links.length : 0));
			chrome.storage.sync.set({"searchbar": false});
		}
	}

	function chooseSearchEngine(choice) {

		var engines = {
			"s_startpage" : ["https://www.startpage.com/do/dsearch?query=", "Search on Startpage"],
			"s_ddg" : ["https://duckduckgo.com/?q=", "Search on DuckDuckGo"],
			"s_qwant" : ["https://www.qwant.com/?q=", "Search on Qwant"],
			"s_ecosia" : ["https://www.ecosia.org/search?q=", "Search on Ecosia"],
			"s_google" : ["https://www.google.com/search", "Search on Google"],
			"s_yahoo" : ["https://search.yahoo.com/search?p=", "Search on Yahoo"],
			"s_bing" : ["https://www.bing.com/search?q=", "Search on Bing"]
		}

		var placeholder = tradThis(engines[choice][1]);

		id("sb_form").setAttribute("action", engines[choice][0]);
		id("searchbar").setAttribute("placeholder", placeholder);

		chrome.storage.sync.set({"searchbar_engine": choice});
	}

	function init() {

		chrome.storage.sync.get(["searchbar", "searchbar_engine", "links"], (data) => {

			if (data.searchbar) {

				//display
				activate(true, data.links, true);

				if (data.searchbar_engine) {
					chooseSearchEngine(data.searchbar_engine);
				} else {
					chooseSearchEngine("s_startpage");
				}

			} else {
				activate(false, data.links, true);
			}
		});
	}
	

	if (event === "searchbar") activate(that.checked);
	else if (event === "engine") chooseSearchEngine(that.value);
	else init();
}

// Signature aléatoire
function signature() {
	var v = "<a href='https://victor-azevedo.me/'>Victor Azevedo</a>";
	var t = "<a href='https://tahoe.be'>Tahoe Beetschen</a>";
	var e = document.createElement("span");

	e.innerHTML = (Math.random() > 0.5 ? (v + " & " + t) : (t + " & " + v));
	id("rand").appendChild(e);
}

function mobilecheck() {
	var check = false;
	(function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
	return check;
}


initBackground();
traduction();
clock();
date();
greetings();
weather();
searchbar();
quickLinks();
darkmode();