id = name => document.getElementById(name);
cl = name => document.getElementsByClassName(name);
attr = (that, val) => that.setAttribute("class", val);
has = (that, val) => id(that) && id(that).getAttribute("class", val) ? true : false;

let db = null;
let stillActive = false;
let rangeActive = false;
let lazyClockInterval = 0;
const domlinkblocks = id("linkblocks");
const dominterface = id("interface");

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

function getLocalStorage() {
	chrome.storage.local.get(null, (data) => {
		console.log(data);
	});
}

function slowRange(tosave) {
	//timeout avant de save pour éviter la surcharge d'instructions de storage
	clearTimeout(rangeActive);
	rangeActive = setTimeout(function() {
		//console.log(tosave);
		chrome.storage.sync.set(tosave);
	}, 150);
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

function newClock(eventObj, init) {

	function displayControl() {

		const numeric = id('clock');
		const analog = id('analogClock');
		const analSec = id('analogSeconds');

		//cache celle qui n'est pas choisi
		attr((clock.analog ? numeric : analog), "hidden");
		attr((clock.analog ? analog : numeric), "");

		//cache l'aiguille des secondes
		if (!clock.seconds && clock.analog) attr(analSec, "hidden");
		else attr(analSec, "");
	}

	function main() {

		//retourne une liste [heure, minutes, secondes]
		function time() {
			const date = new Date();
			return [date.getHours(), date.getMinutes(), date.getSeconds()]
		}

		//besoin pour numerique et analogue
		function timezone(timezone, hour) {

			if (timezone === "auto" || timezone === NaN) return hour;
			else {

				let d = new Date;
				let offset = d.getTimezoneOffset();
				let utc = hour + (offset / 60);
				let setTime = (utc + parseInt(timezone)) % 24;

				return setTime;
			}
		}
		
		function numerical(timearray) {

			//seul numerique a besoin du ampm
			function toAmpm(val) {

				if (val > 12)
					val -= 12;
				else
					if (val === 0)
						val = 12;
					else
						val;

				return val
			}

			function fixunits(val) {
				val = (val < 10 ? "0" + val : val);
				return val
			}

			let h = clock.ampm ? toAmpm(timearray[0]) : timearray[0],
				m = fixunits(timearray[1]),
				s = fixunits(timearray[2]);

			id('clock').innerText = clock.seconds ? `${h}:${m}:${s}` : `${h}:${m}`;
		}

		function analog(timearray) {

			function rotation(that, val) {

				const spancss = that.style;

				if (lazyClockInterval === 0 || val === 0) {
					spancss.transition = "none";
				} else {
					if (spancss.transition === "none 0s ease 0s") spancss.transition = "transform .1s";
				}

				spancss.transform = `rotate(${parseInt(val)}deg)`;
			}

			// Initial clock: https://codepen.io/josephshambrook/pen/xmtco
			let s = timearray[2] * 6,
				m = timearray[1] * 6,// + (s / 60),
				h = timearray[0] * 30;//% 12 / 12 * 360 + (m / 12);


			//bouge les aiguilles minute et heure quand seconde ou minute arrive à 0
			if (true || timearray[2] === 0) rotation(id('minutes'), m);
			if (true || timearray[1] === 0) rotation(id('hours'), h);
		    
		    //tourne pas les secondes si pas de seconds
		    if (clock.seconds) rotation(id('analogSeconds'), s);

			//fix 0deg transition

		}

		//timezone control
		//analog control
		const array = time();

		array[0] = timezone(clock.timezone, array[0]);
		clock.analog ? analog(array) : numerical(array);
	}

	function startClock() {
		//stops multiple intervals
		clearInterval(lazyClockInterval);

		displayControl();
		main();
		lazyClockInterval = setInterval(main, 1000);
	}

	//controle très stricte de clock comme vous pouvez le voir
	//(je sais que je peux faire mieux)
	let clock;

	if (init) {

		clock = {
			analog: init.analog || false,
			seconds: init.seconds || false,
			ampm: init.ampm || false,
			timezone: init.timezone || "auto"
		}

		startClock();

	} else {

		chrome.storage.sync.get("clock", (data) => {

			clock = {
				analog: (data.clock ? data.clock.analog : false),
				seconds: (data.clock ? data.clock.seconds : false),
				ampm: (data.clock ? data.clock.ampm : false),
				timezone: (data.clock ? data.clock.timezone : "auto")
			}

			//if event change of clock parameters
			if (eventObj) {
				clock[eventObj.param] = eventObj.value;
				chrome.storage.sync.set({clock: clock});
			}

			startClock();
		});
	}
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
	const h = (new Date()).getHours();
	let message;

	if (h > 6 && h < 12) message = "Good Morning";
	else if (h >= 12 && h < 18) message = "Good Afternoon";
	else if (h >= 18 && h <= 23) message = "Good Evening";
	else message = "Good Night";

	id("greetings").innerText = tradThis(message);
}

function quickLinks(event, that, initStorage) {

	//only on init
	if(!event && !that) {
		let dragged, hovered, current;
		let stillActive = false;
	}

	//enleve les selections d'edit
	const removeLinkSelection = x => (domlinkblocks.querySelectorAll(".l_icon_wrap").forEach(function(e) {attr(e, "l_icon_wrap")}));

	//initialise les blocs en fonction du storage
	//utilise simplement une boucle de appendblock
	function initblocks(storage) {

		let array = storage.links || false;

		if (array) {

			for (let i in array) {
				appendblock(array[i], i, array);
			}
		}
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
		domlinkblocks.appendChild(block_parent);

		//met les events au dernier elem rajouté
		addEvents(domlinkblocks.lastElementChild);

		//si online et l'icon charge, en rechercher une
		if (window.navigator.onLine && icon === "src/images/loading.gif")
			addIcon(domlinkblocks.lastElementChild, arr, index, links);
	}

	function addEvents(elem) {

		function handleDrag(is, that) {

			chrome.storage.sync.get("links", (data) => {

				const i = findindex(that);

				if (is === "start") dragged = [elem, data.links[i], i];

				else if (is === "enter") hovered = [elem, data.links[i], i];

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
			let block = domlinkblocks.children[i + 1];

			block.children[0].setAttribute("source", newElem.url);
			block.children[0].lastChild.innerText = newElem.title;
			block.querySelector("img").src = newElem.icon;
		}

		//edit est visible
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

		//affiche edit avec le bon index
		} else {

			const index = findindex(that);
			const liconwrap = that.querySelector(".l_icon_wrap");

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

	function findindex(that) {

		//passe la liste des blocks, s'arrete si that correspond
		//renvoie le nombre de loop pour l'atteindre

		const list = domlinkblocks.children;

		for (let i = 0; i < list.length; i++) if (that === list[i]) return i-1
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
			var block_parent = domlinkblocks.children[count + 1];
			block_parent.setAttribute("class", "block_parent removed");
			
			setTimeout(function() {

				domlinkblocks.removeChild(block_parent);

				//enleve linkblocks si il n'y a plus de links
				if (linkRemd.length === 0) {
					domlinkblocks.style.visibility = "hidden";
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

		faviconXHR("http://favicongrabber.com/api/grab/" + hostname).then((icon) => {

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
					domlinkblocks.style.visibility = "visible";
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

		const source = that.children[0].getAttribute("source");
		const a_hiddenlink = id("hiddenlink");

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

					a_hiddenlink.setAttribute("href", source);
					a_hiddenlink.setAttribute("target", "_self");
					a_hiddenlink.click();
				}
			}	
		});
	}

	//TOUT LES EVENTS, else init

	if (event === "input" && that.which === 13) linkSubmission();

	else if (event === "button") linkSubmission();

	else if (event === "linknewtab") {
		chrome.storage.sync.set({"linknewtab": (that.checked ? true : false)});
		id("hiddenlink").setAttribute("target", "_blank");
	}
	else {
		initblocks(initStorage);
		editEvents();
	}
}

function weather(event, that, initStorage) {

	function cacheControl(storage) {

		let now = Math.floor((new Date()).getTime() / 1000);
		let param = (storage.weather ? storage.weather : "");

		if (storage.weather && storage.weather.lastCall) {

			
			//si weather est vieux d'une demi heure (1800s)
			//ou si on change de lang
			//faire une requete et update le lastcall
			if (sessionStorage.lang || now > storage.weather.lastCall + 1800) {

				dataHandling(param.lastState);
				request(param, "current");

				//si la langue a été changé, suppr
				if (sessionStorage.lang) sessionStorage.removeItem("lang");

			} else {

				dataHandling(param.lastState);
			}

			//high ici
			if (storage.weather && storage.weather.fcDay === (new Date).getDay()) {
				id("temp_max").innerText = storage.weather.fcHigh + "°";
			} else {
				request(storage.weather, "forecast");
			}

		} else {

			//initialise a Paris + Metric
			//c'est le premier call, requete + lastCall = now
			initWeather();
		}
	}

	function initWeather() {

		let param = {
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

			let url = 'https://api.openweathermap.org/data/2.5/';


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
			let now = Math.floor((new Date()).getTime() / 1000);
			let param = parameters;
			param.lastState = response;
			param.lastCall = now;
			chrome.storage.sync.set({"weather": param});

			//la réponse est utilisé dans la fonction plus haute
			dataHandling(response);
		}

		
		function forecastResponse(parameters, response) {

			function findHighTemps(d) {
			
				let i = 0;
				let newDay = new Date(d.list[0].dt_txt).getDay();
				let currentDay = newDay;
				let arr = [];
				

				//compare la date toute les 3h (list[i])
				//si meme journée, rajouter temp max a la liste

				while (currentDay == newDay && i < 10) {

					newDay = new Date(d.list[i].dt_txt).getDay();
					arr.push(d.list[i].main.temp_max);

					i += 1;
				}

				let high = Math.floor(Math.max(...arr));

				//renvoie high
				return [high, currentDay];
			}

			let fc = findHighTemps(response);

			//sauvegarder la derniere meteo
			let param = parameters;
			param.fcHigh = fc[0];
			param.fcDay = fc[1];
			chrome.storage.sync.set({"weather": param});

			id("temp_max").innerText = param.fcHigh + "°";
		}

		let url = (wCat === "current" ? urlControl(arg, false) : urlControl(arg, true));

		let request_w = new XMLHttpRequest();
		request_w.open('GET', url, true);

		request_w.onload = function() {
			
			let resp = JSON.parse(this.response);

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
	 		id("widget").setAttribute("class", "shown");
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

		slow(that);

		chrome.storage.sync.get(["weather"], (data) => {

			const param = data.weather;

			param.ccode = i_ccode.value;
			param.city = i_city.value;

			if (param.city.length < 2) return false;

			request(param, "current");
			request(param, "forecast");

			i_city.setAttribute("placeholder", param.city);
			i_city.value = "";
			i_city.blur();

			chrome.storage.sync.set({"weather": param});
		});	
	}

	function updateUnit(that) {

		slow(that);

		chrome.storage.sync.get(["weather"], (data) => {

			const param = data.weather;

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

		slow(that);

		chrome.storage.sync.get(["weather"], (data) => {

			const param = data.weather;
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
					sett_city.setAttribute("class", "city hidden");
					that.removeAttribute("disabled");
					
				}, (refused) => {

					//désactive geolocation if refused
					that.checked = false
					that.removeAttribute("disabled");

					if (!param.city) initWeather();
				});

			} else {

				sett_city.setAttribute("class", "city");

				i_city.setAttribute("placeholder", param.city);
				i_ccode.value = param.ccode;

				param.location = false;
				chrome.storage.sync.set({"weather": param});
				
				request(param, "current");
				request(param, "forecast");
			}
		});
	}

	const WEATHER_API_KEY = [
	"YTU0ZjkxOThkODY4YTJhNjk4ZDQ1MGRlN2NiODBiNDU=",
	"Y2U1M2Y3MDdhZWMyZDk1NjEwZjIwYjk4Y2VjYzA1NzE=",
	"N2M1NDFjYWVmNWZjNzQ2N2ZjNzI2N2UyZjc1NjQ5YTk="];
	const i_city = id("i_city");
	const i_ccode = id("i_ccode");
	const sett_city = id("sett_city");

	//TOUT LES EVENTS, default c'est init
	switch(event) {

		case "city":
			updateCity();
			break;

		case "units":
			updateUnit(that);
			break;

		case "geol":
			updateLocation(that);
			break;

		default:
			cacheControl(initStorage);
	}
}

function imgCredits(src, type) {

	const location = id("location");
	const artist = id("artist");
	const credit = id("credit");
	const onUnsplash = id("onUnsplash");

	if (type === "dynamic") {
		attr(onUnsplash, "shown");
		location.innerText = src.location.text;
		location.setAttribute("href", src.location.url);
		artist.innerText = src.artist.text;
		artist.setAttribute("href", src.artist.url);
	} else {
		if (type === "default") attr(onUnsplash, "hidden")
	}

	if (type === "custom") attr(credit, "hidden");
	else attr(credit, "shown");

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
				location.setAttribute("href", credits[i].url);
				location.innerText = credits[i].title + " - ";
				artist.innerText = credits[i].artist;

				return true;
			}
		}
	}
}

function imgBackground(val) {

	if (val) {
		let img = new Image;

		img.onload = () => {
			id("background").style.backgroundImage = `url(${val})`;
			id("background_overlay").style.animation =  "fade .1s ease-in forwards";
		}

		img.src = val;
		img.remove();
		
	} 
	else return id("background").style.backgroundImage;
}

function initBackground(storage) {

		let type = storage.background_type || "default";
		let image = storage.background_image || "src/images/backgrounds/avi-richards-beach.jpg";

		if (storage.background_type === "custom") {
			//reste local !!!!
			chrome.storage.local.get("background_blob", (data) => {
				imgBackground(setblob(data.background_blob));
			});
			imgCredits(null, type);
		}
		else if (storage.background_type === "dynamic") {

			unsplash(storage.dynamic)

		} else {

			imgBackground(image);
			imgCredits(image, type);
			unsplash(null, null, true); //on startup
		}


		let blur = (Number.isInteger(storage.background_blur) ? storage.background_blur : 25);
		let bright = (!isNaN(storage.background_bright) ? storage.background_bright : 1);

		filter("init", [blur, bright]);
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

		let blobArray = setblob(event.target.result, true);

		if (is === "change") {

			imgBackground(blobArray[1]);

			chrome.storage.local.set({"background_blob": blobArray[0]}); //reste local !!!!
			chrome.storage.sync.set({"background_image": blobArray[1]});
			chrome.storage.sync.set({"background_type": "custom"});

		}
	}

	reader.readAsDataURL(file);
}

function unsplash(data, event, startup) {

	//on startup nothing is displayed
	const loadbackground = url => (startup ? noDisplayImgLoad(url) : imgBackground(url));

	function noDisplayImgLoad(val, callback) {
		let img = new Image;

		img.onload = callback;
		img.src = val;
		img.remove();
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

				loadbackground(d.next.url);
				credit(d.next);
				req("current", d, false);
			}

		//pas besoin d'image, simplement current
		} else {
			loadbackground(d.current.url);
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
						loadbackground(d.current.url);
						credit(d.current);
						req("next", d, true);
					}
					else if (which === "next") {
						d.next = resp;
						chrome.storage.sync.set({"dynamic": d});
					}

				//si next existe, current devient next et next devient la requete
				//preload la prochaine image (sans l'afficher)
				} else {

					noDisplayImgLoad(resp.url, () => {
						d.current = d.next;
						d.next = resp;
						chrome.storage.sync.set({"dynamic": d});
						//console.log("loaded")
					});
					
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
}

function remSelectedPreview() {
	let a = cl("imgpreview");

	for (var i = 0; i < a.length; i++) {

		if (a[i].classList[1] === "selected")
			a[i].setAttribute("class", "imgpreview")
	}
}

function filter(cat, val) {

	let result = "";

	switch (cat) {

		case "init":
			result = `blur(${val[0]}px) brightness(${val[1]})`;
			break;

		case "blur":
			result = `blur(${val}px) brightness(${id("i_bright").value})`;
			break;

		case "bright":
			result = `blur(${id("i_blur").value}px) brightness(${val})`;
			break;
	}

	id('background').style.filter = result;
}

function darkmode(choice, initStorage) {

	function apply(state) {

		function auto(wdata) {

			//compare current hour with weather sunset / sunrise

			const ls = wdata.lastState;
			const sunrise = new Date(ls.sys.sunrise * 1000).getHours();
			const sunset = new Date(ls.sys.sunset * 1000).getHours();
			const hr = (new Date()).getHours();

			return (hr < sunrise || hr > sunset ? "dark" : "");
		}

		//uses chromesync data on startup, sessionsStorage on change

		const weather = (initStorage ? initStorage.weather : JSON.parse(sessionStorage.data).weather);
		let bodyClass;

		//dark mode is defines by the body class

		switch (state) {
			case "system": 
				bodyClass = "autodark";
				break;

			case "auto": 
				bodyClass = auto(weather);
				break;
				
			case "enable": 
				bodyClass = "dark";
				break;
				
			default: 
				bodyClass = "";		
		}

		document.body.setAttribute("class", bodyClass);
	}
	
	//apply class, save if event
	if (choice) {
		apply(choice, true);
		chrome.storage.sync.set({"dark": choice});
	} else {
		apply(initStorage.dark)
	}
}

function distractMode(that, initStorage) {

	function apply(on) {

		let ui = dominterface;
		let uiClass = ui.getAttribute("class");

		if (on) {
			attr(ui, (uiClass === "pushed" ? "pushed distract" : "distract"));
			attr(id("showSettings"), "distract");
		} else {
			attr(ui, (uiClass === "pushed distract" ? "pushed" : ""));
			attr(id("showSettings"), "");
		}
	}

	//change event
	if (that || that === false) {
		apply(that.checked);
		chrome.storage.sync.set({"distract": that.checked});
		localStorage.distract = that.checked;
		return true;
	}

	//init
	let localDist = (localStorage.distract === "true" ? true : false);

	if (localDist) {
		apply(localDist);
	} else {
		apply(initStorage);
	}
}

function searchbarFlexControl(activated, linkslength) {

	let state = (activated ? "shown" : "removed");
	attr(id("sb_container"), state);
}

function searchbar(event, that, storage) {

	function display(value, init) {

		id("sb_container").setAttribute("class", (value ? "shown" : "hidden"));

		if(!init) {
			chrome.storage.sync.set({"searchbar": value});
			id("choose_searchengine").setAttribute("class", (value ? "shown" : "hidden"));
		}
	}

	function engine(value, init) {

		let engines = {
			"s_startpage" : ["https://www.startpage.com/do/dsearch?query=", "Search on Startpage"],
			"s_ddg" : ["https://duckduckgo.com/?q=", "Search on DuckDuckGo"],
			"s_qwant" : ["https://www.qwant.com/?q=", "Search on Qwant"],
			"s_ecosia" : ["https://www.ecosia.org/search?q=", "Search on Ecosia"],
			"s_google" : ["https://www.google.com/search", "Search on Google"],
			"s_yahoo" : ["https://search.yahoo.com/search?p=", "Search on Yahoo"],
			"s_bing" : ["https://www.bing.com/search?q=", "Search on Bing"]
		}

		id("sb_form").setAttribute("action", engines[value][0]);
		id("searchbar").setAttribute("placeholder", tradThis(engines[value][1]));

		if(!init) chrome.storage.sync.set({"searchbar_engine": value});
	}

	if (event) {

		(event === "searchbar" ? display(that.checked) : engine(that.value))

	//init
	} else {

		let searchbar = storage.searchbar || false;
		let searchengine = storage.searchbar_engine || "s_startpage";

		//display
		display(searchbar, true);
		engine(searchengine, true);
	}
}


// Signature aléatoire
function signature() {
	let v = "<a href='https://victor-azevedo.me/'>Victor Azevedo</a>";
	let t = "<a href='https://tahoe.be'>Tahoe Beetschen</a>";
	let e = document.createElement("span");

	e.innerHTML = Math.random() > 0.5 ? ` ${v} & ${t}` : ` ${t} & ${v}`;
	id("rand").appendChild(e);
}

function mobilecheck() {
	let check = false;
	(function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
	return check;
}


const firstReq = window.indexedDB.open("Bonjourr", 2)

firstReq.onsuccess = e => db = e.target.result
firstReq.onupgradeneeded = e => e.target.result.createObjectStore("settings")

function storage(obj) {

	//only key is defined, log val
	//if callback, use it with val
	if (!obj.delete && !obj.save) {
		db.transaction("settings")
		.objectStore("settings")
		.get(obj.key)
		.onsuccess = function(e) {

			if (obj.callback) 
				obj.callback(e.target.result)
			else console.log(e.target.result)
		}
	}

	//remove a object
	else if (obj.delete) 
		db.transaction(["settings"], "readwrite")
		.objectStore("settings")
		.delete(obj.key)

	//add an object (it has value)
	else if (obj.value || obj.save) 
		db.transaction(["settings"], "readwrite")
		.objectStore("settings")
		.put(obj.value, obj.key)
}

function proFunctions(obj) {

	function customFont(data, evnt) {

		function setFont(family, weight, size, is) {

			function getWeightText(val) {

				switch (parseInt(val)) {

					case 100:
					case 200:
						return "Thin";
						break;

					case 300:
						return "Light";
						break;

					case 400:
						return "Regular";
						break;

					case 500:
						return "Medium";
						break;

					case 600:
					case 700:
						return "Bold";
						break;

					case 800:
					case 900:
						return "Black";
						break;

					default:
						return "Auto"
				}
			}

			function saveFont() {

				const font = {
					family: id("i_customfont").value,
					weight: id("i_weight").value,
					size: id("i_size").value
				}

				chrome.storage.sync.set({"font": font});
			}

			if (has("settings", "shown")) {
				const fontlink = id("fontlink");
				const famInput = id("i_customfont").value;

				family = (family ? family : (famInput !== "" ? famInput : false));
			}
			

			if (family || weight) fontlink.href = `https://fonts.googleapis.com/css?family=${family}:100,300,400,500,700,900`;
			
			if (weight) {
				//id("e_weight").innerText = getWeightText(weight);
				document.body.style.fontWeight = weight;
			}

			if (family) {
				document.body.style.fontFamily = family;
				id("clock").style.fontFamily = family;
			}

			if (size) {
				//id("e_size").innerText = size;
				dominterface.style.fontSize = size + "px";
			}

			if (is === "event") saveFont()
		}

		if (data) setFont(data.family, data.weight, data.size)
		if (evnt) setFont(evnt.family, evnt.weight, evnt.size, "event")
	}

	function customCss(data, event) {
		
		const styleHead = id("styles");

		// Active l'indentation
		function syntaxControl(e, that) {

			if (e.key === "{") {

				that.value = that.value + `{\r  \r}`;

				that.selectionStart = that.selectionStart - 2;
				that.selectionEnd = that.selectionEnd - 2;

				e.preventDefault();

				/*let selectionStartPos = this.selectionStart;
				let selectionEndPos   = this.selectionEnd;
				let oldContent        = this.value;

				//console.log(that.selectionStart);

				this.value = oldContent.substring( 0, selectionStartPos ) + "\t" + oldContent.substring( selectionEndPos );

				this.selectionStart = this.selectionEnd = selectionStartPos + 1;*/
			}
		}

		if (data) {
			styleHead.innerText = data;
		}

		if (event) {

			const e = event.e;
			const that = event.that;
			syntaxControl(e, that);

			setTimeout(() => {
				const val = id("cssEditor").value;
				styleHead.innerText = val;
				chrome.storage.sync.set({css: val})
			}, 200)
		}
	}

	function linksrow(data, event) {

		function setRows(val) {

			function getWidth(val) {

				let width, margin, total = 0;
				let blocks = cl("block_parent");

				for (let i = 0; i < val; i++) {

					if (i >= blocks.length) {
						width = 96;
						margin = 16;
					} else {
						width = parseInt(getComputedStyle(blocks[i]).width) +1;
						margin = parseInt(getComputedStyle(blocks[i]).margin) +1;
					}

					//console.log(total)
					
					total += width + margin * 2;
				}

				return total
			}

			
			domlinkblocks.style.width = getWidth(val) + "px";
		}

		if (data !== undefined) setRows(data);

		if (event) {
			id("e_row").innerText = event;
			setRows(event);
			slowRange({"linksrow": parseInt(event)});
		}
	}

	function greeting(data, event) {

		let text = id("greetings").innerText;
		let pause;

		function apply(val) {

			//greeting is classic text + , + custom greet
			id("greetings").innerText = `${text}, ${val}`;

			//input empty removes ,
			if (val === "") id("greetings").innerText = text;
			console.log(text)
			console.log(val)
		}

		function setEvent(val) {

			const virgule = text.indexOf(",");

			//remove last input from greetings
			text = text.slice(0, (virgule === -1 ? text.length : virgule)); 
			apply(val);

			//reset save timeout
			//wait long enough to save to storage
			if (pause) clearTimeout(pause); 
			
			pause = setTimeout(function() {
				chrome.storage.sync.set({"greeting": val});
			}, 1200);
		}

		//init
		if (data !== undefined) apply(data)
		if (event !== undefined) setEvent(event)
	}

	function quoting(data, event) {

		function displayText(obj) {

			id('quote').innerText = obj.main;
			id('quoteAuthor').innerText = "- " + obj.author;
			attr(id("quotes_container"), obj.enabled ? "shown" : "");
		}

		function requestQuote() {
			/*let xhr = new XMLHttpRequest();
			xhr.withCredentials = true;

			xhr.addEventListener("readystatechange", function () {
				if (this.readyState === this.DONE) {
					
					let r = this.responseText;

					let respObj = {
						main: r.contents.quotes[0].quote,
						author: r.contents.quotes[0].author,
						last: Date.now()
					}

					console.log(r);
					displayText(respObj);
				}
			});

			xhr.open("POST", 'https://quotes.rest/qod');
			xhr.setRequestHeader("Accept", "application/json");

			xhr.send();*/

			//On va faire comme si la requete marchait

			let r = {
				"success": {
					"total": 1
				},
				"contents": {
					"quotes": [
					{
						"quote": "Do not worry if you have built your castles in the air. They are where they should be. Now put the foundations under them.",
						"length": "122",
						"author": "Henry David Thoreau",
						"tags": [
							"dreams",
							"inspire",
							"worry"
						],
						"category": "inspire",
						"date": "2016-11-21",
						"title": "Inspiring Quote of the day",
						"background": "https://theysaidso.com/img/bgs/man_on_the_mountain.jpg",
						"id": "mYpH8syTM8rf8KFORoAJmQeF"
					}]
				}
			}

			let respObj = {
				enabled: true,
				main: r.contents.quotes[0].quote,
				author: r.contents.quotes[0].author,
				last: Date.now()
			}

			console.log(r);
			displayText(respObj);
			chrome.storage.sync.set({quote: respObj});
		}

		function storageControl(obj) {

			if (!obj) {

				//first time quoting
				requestQuote();
			
			} else {
				//theres a storage

				if (Date.now() > obj.last + 1000*60*60) {
					//storage older than an hour
					requestQuote()
				}
				else {
					//storage too young, use storage
					displayText(obj);
				}
			}
		}

		if (data) storageControl(data)

		else {

			chrome.storage.sync.get("quote", (sync) => {

				if (event !== null) {

					if (event === true) {

						if (sync.quote) {
							sync.quote.enabled = true;
							storageControl(sync.quote);
						} else {
							storageControl(null);
						}
						
					}
					else if (event === false) {
						sync.quote.enabled = false;
					}

					//show/hides container
					//save to storage
					attr(id("quotes_container"), event ? "shown" : "");
					chrome.storage.sync.set({quote: sync.quote});

				} else {

					storageControl(sync.quote);
				}
			})
		}




		/*let motiQuotes = ['If we had no winter, the spring would not be so pleasant: if we did not sometimes taste of adversity, prosperity would not be so welcome.',
			'Prosperity makes friends, adversity tries them',
			'Virtue is not left to stand alone. He who practices it will have neighbors.',
			'Fear cuts deeper than swords'];

		function randomQuote(quoteType) {
			let RandomNumber = Math.floor(Math.random()*quoteType.length);
			let quote = quoteType[RandomNumber]

			return quote;
		}

		id('quote').innerText = randomQuote(motiQuotes);*/
	}

	switch (obj.which) {
		case "font":
		customFont(obj.data, obj.event)
		break

		case "css":
		customCss(obj.data, obj.event)
		break

		case "row":
		linksrow(obj.data, obj.event)
		break

		case "greet":
		greeting(obj.data, obj.event)
		break

		case "quote":
		quoting(obj.data, obj.event)
	}
}

function checkifpro(data) {

	const hash = "OGYyNGFjMDRkYjhlNDk5ZjQ2ZDM2NzJiNGZhZDYxM2VlYzY4MTlhYmVlYTU4YTdmNDlhYmIyMWRhOWM0ZjI5ZA==";

	async function encode(message) {
		const msgBuffer = new TextEncoder('utf-8').encode(message);
		const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		const hashHex = hashArray.map(b => ('00' + b.toString(16)).slice(-2)).join('');
		return hashHex;
	}

	encode(localStorage.login).then((a) => {
		if (a === atob(hash)) {
					
			proFunctions({which: "font", data: data.font})
			proFunctions({which: "css", data: data.css})
			proFunctions({which: "row", data: data.linksrow})
			proFunctions({which: "greet", data: data.greeting})
			proFunctions({which: "quote", data: data.quote})

			sessionStorage.pro = "true"
		}
	})
}

//comme un onload, sans le onload
chrome.storage.sync.get(null, (data) => {

	traduction();
	newClock(null, data.clock);
	date();
	greetings();
	distractMode(null, data.distract);
	darkmode(null, data);
	initBackground(data);
	weather(null, null, data);
	quickLinks(null, null, data);
	searchbar(null, null, data);

	checkifpro(data) //init profunctions

	//test pour webapp
	if (mobilecheck()) dominterface.style.height = `calc(${window.innerHeight}px`;

	//met le storage dans le sessionstorage
	//pour que les settings y accede plus facilement
	sessionStorage.data = JSON.stringify(data);
});