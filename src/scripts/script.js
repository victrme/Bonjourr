//var translator = $('html').translate({lang: "en", t: dict});
var stillActive = false;
const INPUT_PAUSE = 700;
const BLOCK_LIMIT = 16;
const TITLE_LIMIT = 42;
const WEATHER_API_KEY = ["YTU0ZjkxOThkODY4YTJhNjk4ZDQ1MGRlN2NiODBiNDU=", "Y2U1M2Y3MDdhZWMyZDk1NjEwZjIwYjk4Y2VjYzA1NzE=", "N2M1NDFjYWVmNWZjNzQ2N2ZjNzI2N2UyZjc1NjQ5YTk="];
const UNSPLASH = "https://source.unsplash.com/collection/4933370/1920x1200/daily";
const DATE = new Date();
const HOURS = DATE.getHours();
const START_LINKS = [
	{
		"title": "Unsplash",
		"url": "https://unsplash.com/",
		"icon": "https://besticon-demo.herokuapp.com/icon?url=unsplash.com&size=80"
	},
	{
		"title": "YouTube",
		"url": "https://youtube.com",
		"icon": "https://besticon-demo.herokuapp.com/icon?url=youtube.com&size=80"
	},
	{
		"title": "Bonjourr",
		"url": "https://bonjourr.fr",
		"icon": "https://besticon-demo.herokuapp.com/icon?url=bonjourr.fr&size=80"
	},
	{
		"title": "Wikipédia",
		"url": "http://wikipedia.org",
		"icon": "https://besticon-demo.herokuapp.com/icon?url=wikipedia.org&size=80"
	}];
const CREDITS = [
	{
		"title": "Santa Monica",
		"artist": "Avi Richards",
		"url": "https://unsplash.com/photos/KCgADeYejng",
		"id": "avi-richards-beach"
	},
	{
		"title": "Waimea Canyon",
		"artist": "Tyler Casey",
		"url": "https://unsplash.com/photos/zMyZrfcLXQE",
		"id": "tyler-casey-landscape"
	},
	{
		"title": "Fern",
		"artist": "Tahoe Beetschen",
		"url": "https://unsplash.com/photos/Tlw9fp2Z-8g",
		"id": "tahoe-beetschen-ferns"
	},
	{
		"title": "iOS 13 light wallpaper",
		"artist": "Apple",
		"url": "https://www.apple.com/ios/ios-13-preview/",
		"id": "ios13_light"
	},
	{
		"title": "iOS 13 dark wallpaper",
		"artist": "Apple",
		"url": "https://www.apple.com/ios/ios-13-preview/",
		"id": "ios13_dark"
	},
	{
		"title": "Unsplash Collection",
		"artist": "lots of artists",
		"url": "https://unsplash.com/collections/4933370/bonjourr-backgrounds",
		"id": "unsplash.com"
	}];


//jS steuplé
function id(name) {
	return document.getElementById(name);
}
function cl(name) {
	return document.getElementsByClassName(name);
}
function tg(name) {
	return document.getElementsbyTagName(name);
}
function getCl(that) {
	return that.getAttribute("class");
}
function setClass(that, val) {
	that.setAttribute("class", val);
}


//c'est juste pour debug le storage
function deleteBrowserStorage() {
	chrome.storage.sync.clear(() => {
		localStorage.clear();
	});
}

//c'est juste pour debug le storage
function getBrowserStorage() {
	chrome.storage.sync.get(null, (data) => {
		console.log(data);
	});
}

function slow(that) {

	$(that).attr("disabled", "");

	stillActive = setTimeout(function() {

		$(that).removeAttr("disabled");

		clearTimeout(stillActive);
		stillActive = false;
	}, INPUT_PAUSE);
}

function tradThis(str) {

	var lang = localStorage.lang;

	if (!lang || lang === "en") {
		return str
	} else {
		return dict[str][localStorage.lang]
	}
}

//fait
function clock() {

	var timesup, format;

	function start() {

		function fixSmallMinutes(i) {
			if (i < 10) {i = "0" + i};
			return i;
		}

		function is12hours(x) {

			if (x > 12) x -= 12; 
			if (x === 0) x = 12;

			return x;
		}

		var h = new Date().getHours();
		var m = new Date().getMinutes();
		m = fixSmallMinutes(m);

		if (format === 12) h = is12hours(h);

		id('clock').innerText = h + ":" + m;

		timesup = setTimeout(start, 5000);
	}


	//settings event
	id("i_ampm").onchange = function() {

		//change le format 
		if (this.checked) {

			format = 12;
			clearTimeout(timesup);
			start();

		} else {

			format = 24;
			clearTimeout(timesup);
			start();
		}

		//enregistre partout suivant le format
		chrome.storage.sync.set({"clockformat": format});
		localStorage.clockformat = format;
	}

	format = parseInt(localStorage.clockformat);
	start();
}

//fait
function date() {

	var days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
	var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];

	//la date defini l'index dans la liste des jours et mois pour l'afficher en toute lettres
	id("jour").innerText = tradThis(days[DATE.getDay()]);
	id("chiffre").innerText = DATE.getDate();
	id("mois").innerText = tradThis(months[DATE.getMonth()]);
}

//fait
function greetings() {
	let h = DATE.getHours();
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

function quickLinks() {

	var stillActive = false, oldURL = false;

	//initialise les blocs en fonction du storage
	//utilise simplement une boucle de appendblock
	function initblocks() {

		$(".linkblocks").empty();
		$(".linkblocks").append('<a href="" class="hiddenlink"></a>');

		chrome.storage.sync.get("links", (data) => {
	
			if (data.links && data.links.length > 0) {

				//1.6 fix
				if (data.links[0].icon.includes("https://besticon-demo.herokuapp.com")) {
					oldFaviconFix();
				}

				for (var i = 0; i < data.links.length; i++) {
					appendblock(data.links[i]);
				}
			}
		});
	}

	//rajoute l'html d'un bloc avec toute ses valeurs et events
	function appendblock(arr) {

		//le DOM du block
		var b = "<div class='block_parent'><div class='block' source='" + arr.url + "'><div class='l_icon_wrap'><button class='remove'><img src='src/images/icons/x.png' /></button><img class='l_icon' src='" + arr.icon + "'></div><span>" + arr.title + "</span></div></div>";

		$(".linkblocks").append(b);
	}

	//affiche le bouton pour suppr le link
	function showRemoveLink() {

		var remTimeout;
		var canRemove = false;

		function displaywiggle() {

			$(".block").find(".remove").addClass("visible");
			$(".block").addClass("wiggly");
			$(this).focus();

			canRemove = true;	
		}

		function stopwiggle() {
			clearTimeout(remTimeout);

			$(".block").find(".remove").removeClass("visible");
			$(".block").removeClass("wiggly");

			canRemove = false;
		}

		//click droit pour afficher le remove
		$(".linkblocks").on("contextmenu", ".block", function(event) {

			event.preventDefault();
			displaywiggle();
		});

		//je sors de la zone de linkblocks pour enlever le remove
		$(document).bind("mousedown", function (e) {

			// If the clicked element is not the menu
			if (!$(e.target).parents(".linkblocks").length > 0) {

				stopwiggle();
			}
		});

		function removeblock(i) {

			chrome.storage.sync.get(["links", "searchbar"], (data) => {

				function ejectIntruder(arr) {

					if (arr.length === 1) {
						return []
					}

					if (i === 0) {

						arr.shift();
						return arr;
					}
					else if (i === arr.length) {

						arr.pop();
						return arr;
					}
					else {

						arr.splice(i - 1, 1);
						return arr;
					}
				}

				var linkRemd = ejectIntruder(data.links);

				//si on supprime un block quand la limite est atteinte
				//réactive les inputs
				if (linkRemd.length === BLOCK_LIMIT - 1) {

					var input = $("input[name='url']");
					$(input).each(function() {
						$(this).removeAttr("disabled");
					});
				}

				//enleve le html du block
				var block = $(".linkblocks")[0].children[i];
				$(block).addClass("removed");
				
				setTimeout(function() {

					$(block).remove();
					//enleve linkblocks si il n'y a plus de links
					if (linkRemd.length === 0) {
						$(".interface .linkblocks").css("visibility", "hidden");
						searchbarFlexControl(data.searchbar, 0);
					}
				}, 200);

				chrome.storage.sync.set({"links": linkRemd});
			});
		}


		//event de suppression de block
		//prend l'index du parent du .remove clické
		$(".linkblocks").off("click").on("click", ".remove", function() {
			
			var index = $(this).parent().parent().parent().index();
			(canRemove ? removeblock(index) : "");
		});
	}

	function oldFaviconFix() {

		var str = "";
		var linkarray = {};
		chrome.storage.sync.get("links", (data) => {

			linkarray = data.links;

			for (var i = 0; i < data.links.length; i++) {

				
				link = data.links[i];

				str = link.icon;
				str = str.replace("https://besticon-demo.herokuapp.com/icon?url=", "");
				str = str.replace("&size=80", "");
				//console.log(str);

				iconReq(str, link, i);
			}

			console.log(linkarray)
			chrome.storage.sync.set({"links": linkarray});
		})

		function iconReq(hostname, link, index) {
			var req = new XMLHttpRequest();
			req.open('GET', "http://favicongrabber.com/api/grab/" + hostname, false);

			req.onload = function() {
				
				var resp = JSON.parse(this.response);

				if (req.status >= 200 && req.status < 400) {

					linkarray[index].icon = filterIcon(resp);

				} else {

					linkarray[index].icon = "src/images/weather/day/brokenclouds.png";
				}
			}

			req.send();
		}
	}

	function filterIcon(json) {
		//console.log(json);
		var s = 0;
		var a, b = 0;

		for (var i = 0; i < json.icons.length; i++) {	

			if (json.icons[i].sizes) {

				a = parseInt(json.icons[i].sizes);

				if (a > b) {
					s = i;
					b = a;
				}

				//console.log(b);
				//console.log(s);

			} else if (json.icons[i].src.includes("android-chrome") || json.icons[i].src.includes("apple-touch")) {
				return json.icons[i].src;
			}
		}

		return json.icons[s].src;
	}

	function linkSubmission() {

		function submissionError(erreur) {

			var input = $("input[name='url']");

			//affiche le texte d'erreur
			$("p.wrongURL").text(erreur[1]);
			$("p.wrongURL").css("display", "block");
			$("p.wrongURL").css("opacity", 1);
			
			setTimeout(function() {
				$("p.wrongURL").css("display", "none");
			}, 2000);		
		}

		function filterUrl(str) {

			var ipReg = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\/[-a-zA-Z0-9@:%._\+~#=]{2,256})?$/;
			var reg = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,10}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g;

			//config ne marche pas
			if (str.startsWith("about:") || str.startsWith("chrome://")) {
				return [str, "Bonjourr doesn't have permissions to access browser urls"];
			}

			if (str.startsWith("file://")) {
				return str;
			}

			if (str.match(ipReg)) {
				return "http://" + str.match(ipReg)[0];
			}

			//premier regex pour savoir si c'est http
			if (!str.match(reg)) {
				str = "http://" + str;
			}

			//deuxieme pour savoir si il est valide (avec http)
			if (str.match(reg)) {
				return str.match(reg)[0];
			} else {
				return [str, "URL not valid"];
			}
		}

		function saveLink(lll) {

			slow(id("i_url"));

			//remet a zero les inputs
			id("i_title").value = "";
			id("i_url").value = "";

			var full = false;

			chrome.storage.sync.get(["links", "searchbar"], (data) => {

				var arr = [];

				//array est tout les links + le nouveau
				if (data.links && data.links.length > 0) {

					if (data.links.length < BLOCK_LIMIT - 1) {

						arr = data.links;
						arr.push(lll);

					} else {
						full = true;
					}

				//array est seulement le link
				} else {
					arr.push(lll);
					$(".linkblocks").css("visibility", "visible");
					searchbarFlexControl(data.searchbar, 1);
				}
				
				if (!full) {
					chrome.storage.sync.set({"links": arr});
					appendblock(links);
				} else {

					//desactive tout les input url (fonctionne pour popup du coup)
					var input = $("input[name='url']");
					$(input).each(function() {
						$(this).attr("disabled", "disabled");
						submissionError([input.prop("value"), "No more than 16 links"]);
					});
				}
			});
		}

		//append avec le titre, l'url ET l'index du bloc
		var title = $(".addlink input[name='title']").val();
		var url = $(".addlink input[name='url']").val();
		var filtered = filterUrl(url);

		//Titre trop long, on rajoute "...""
		if (title.length > TITLE_LIMIT) title = title.slice(0, TITLE_LIMIT) + "...";

		//si l'url filtré est juste
		if (typeof(filtered) !== "object" && filtered) {


			//et l'input n'a pas été activé ya -1s
			if (!stillActive) {

				var links = {
					title: title,
					url: filtered,
					icon: ""
				}

				//prend le domaine de n'importe quelle url
				var a = document.createElement('a');
				a.href = filtered;
				var hostname = a.hostname;

				var req = new XMLHttpRequest();
				req.open('GET', "http://favicongrabber.com/api/grab/" + hostname, true);

				req.onload = function() {
					
					var resp = JSON.parse(this.response);

					if (req.status >= 200 && req.status < 400) {

					
						links.icon = filterIcon(resp);
						saveLink(links);
						

					} else {

						links.icon = "src/images/weather/day/brokenclouds.png";
						saveLink(links);
					}
				}

				req.send();
			}

		} else {
			if (url.length > 0) submissionError(filtered);
		}
	}

	function openlink(that, e) {

		if (e.originalEvent.which === 3 || $(".block").hasClass("wiggly")) return false;

		chrome.storage.sync.get("linknewtab", (data) => {

			if (data.linknewtab) {

				chrome.tabs.create({
					url: $(that).attr("source")
				});

			} else {

				if (e.originalEvent.which === 2) {

					console.log("hewwo")
					chrome.tabs.create({
						url: $(that).attr("source")
					});

				} else {

					$(".hiddenlink").attr("href", $(that).attr("source"));
					$(".hiddenlink").attr("target", "_self");
					$(".hiddenlink")[0].click();
				}
			}	
		});
	}

	$('input[name="title"]').on('keypress', function(e) {
		if (e.which === 13) linkSubmission();
	});

	$('input[name="url"]').on('keypress', function(e) {
		if (e.which === 13) linkSubmission();
	});

	$(".submitlink").click(function() {
		linkSubmission();
	});

	$(".interface .linkblocks").off("mouseup").on("mouseup", ".block", function(e) {

		openlink(this, e);
	});

	$(".linknewtab input").change(function() {

		if ($(this).prop("checked")) {
			chrome.storage.sync.set({"linknewtab": true});
			$(".hiddenlink").attr("target", "_blank");
		} else {
			chrome.storage.sync.set({"linknewtab": false});
			$(".hiddenlink").attr("target", "_self");
		}
	});

	initblocks();
	showRemoveLink();
}


//fait
function weather() {

	//fait
	function cacheControl() {

		chrome.storage.sync.get(["weather", "lang"], (data) => {

			var now = Math.floor(DATE.getTime() / 1000);
			var param = (data.weather ? data.weather : "");

			if (data.weather && data.weather.lastCall) {

				
				//si weather est vieux d'une demi heure (1800s)
				//faire une requete et update le lastcall
				if (now > data.weather.lastCall + 1800) {

					request(param, "current");

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

	//fait
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

			//update le setting
			//$(".w_auto input").prop("checked", true);
			//$(".change_weather .city").css("display", "none");
			//$(".w_auto input").removeAttr("disabled");
			id("i_geol").checked = true;
			id("i_geol").removeAttribute("disabled");
			id("sett_city").setAttribute("class", "city hidden");

			chrome.storage.sync.set({"weather": param});

			request(param, "current");
			request(param, "forecast");
			
		}, (refused) => {

			param.location = false;

			//désactive geolocation if refused
			id("i_geol").checked = false;
			id("i_geol").removeAttribute("disabled");

			chrome.storage.sync.set({"weather": param});

			request(param, "current");
			request(param, "forecast");
		});
	}

	//fait
	function request(arg, wCat) {

		//fait
		function urlControl(arg, forecast) {

			var url = 'https://api.openweathermap.org/data/2.5/';


			if (forecast)
				url += "forecast?appid=" + atob(WEATHER_API_KEY[0]);
			else
				url += "weather?appid=" + atob(WEATHER_API_KEY[1]);


			//auto, utilise l'array location [lat, lon]
			if (arg.location) {
				url += "&lat=" + arg.location[0] + "&lon=" + arg.location[1];
			} else {
				url += "&q=" + encodeURI(arg.city) + "," + arg.ccode;
			}

			url += '&units=' + arg.unit + '&lang=' + localStorage.lang;

			return url;
		}

		//fait
		function weatherResponse(parameters, response) {

			//sauvegarder la derniere meteo
			var now = Math.floor(DATE.getTime() / 1000);
			var param = parameters;
			param.lastState = response;
			param.lastCall = now;
			chrome.storage.sync.set({"weather": param});

			//la réponse est utilisé dans la fonction plus haute
			dataHandling(response);
		}

		//fait
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

	//fait
	function dataHandling(data) {

		//si le soleil est levé, renvoi jour
		//le renvoie correspond au nom du répertoire des icones jour / nuit
		function dayOrNight(sunset, sunrise) {
			var ss = new Date(sunset * 1000);
			var sr = new Date(sunrise * 1000);

			if (HOURS > sr.getHours() && HOURS < ss.getHours()) {
				return "day";
			}
			else {
				return "night";
			}
		}

		//prend l'id de la météo et renvoie une description
		//correspond au nom de l'icone (+ .png)
		function imgId(id) {
			if (id >= 200 && id <= 232) {
				return "thunderstorm"
			} 
			else if (id >= 300 && id <= 321) {
				return "showerrain"
			}
			else if (id === 500 || id === 501) {
				return "lightrain"
			}
			else if (id >= 502 && id <= 531) {
				return "showerrain"
			}
			else if (id >= 602 && id <= 622) {
				return "snow"
			}
			else if (id >= 701 && id <= 781) {
				return "mist"
			}
			else if (id === 800) {
				return "clearsky"
			}
			else if (id === 801 || id === 802) {
				return "fewclouds"
			}
			else if (id === 803 || id === 804) {
				return "brokenclouds"
			}
		}

		//pour la description et temperature
		//Rajoute une majuscule à la description
		var meteoStr = data.weather[0].description;
		meteoStr = meteoStr[0].toUpperCase() + meteoStr.slice(1);
		id("desc").innerText = meteoStr + ".";


		//si c'est l'après midi (apres 12h), on enleve la partie temp max
		var dtemp, wtemp;

		if (HOURS < 12) {

			//temp de desc et temp de widget sont pareil
			dtemp = wtemp = Math.floor(data.main.temp) + "°";
			id("temp_max_wrap").setAttribute("class", "hightemp shown");

		} else {

			//temp de desc devient temp de widget + un point
			//on vide la catégorie temp max
			wtemp = Math.floor(data.main.temp) + "°";
			dtemp = wtemp + ".";
		}

		id("temp").innerText = dtemp;
		id("widget_temp").innerText = wtemp;
		
		if (data.icon) {

			id("widget").setAttribute("src", data.icon);
			
		} else {
			//pour l'icone
			var d_n = dayOrNight(data.sys.sunset, data.sys.sunrise);
			var weather_id = imgId(data.weather[0].id);
	 		var icon_src = "src/images/weather/" + d_n + "/" + weather_id + ".png";
	 		id("widget").setAttribute("src", icon_src);

	 		//sauv l'icone dans wLastState
	 		//data.icon = icon_src;
	 		//localStorage.wLastState = JSON.stringify(data);
		}

		id("widget").setAttribute("class", "w_icon shown");
	}

	//fait
	function submissionError(error) {

		var input = $(".change_weather input[name='city']");

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

	//fait
	function updateCity() {

		chrome.storage.sync.get(["weather"], (data) => {

			var param = data.weather;

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

	//fait
	function updateUnit(that) {

		chrome.storage.sync.get(["weather"], (data) => {

			var param = data.weather;

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

	//fait
	function updateLocation(that) {

		chrome.storage.sync.get(["weather"], (data) => {

			var param = data.weather;
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

	id("b_city").onmouseup = function() {
		if (!stillActive) {
			updateCity();
			slow(this);
		}
	}

	id("i_city").onkeypress = function(e) {
		if (!stillActive && e.which === 13) {
			updateCity();
			slow(this);
		}
	}

	id("i_units").onchange = function() {
		if (!stillActive) {
			updateUnit(this);
			slow(this);
		}
	}

	id("i_geol").onchange = function() {
		if (!stillActive) {
			updateLocation(this);
		}
	}

	id("i_lang").onchange = function() {
		if (!stillActive) {
			chrome.storage.sync.get("weather", (data) => {

				localStorage.lang = this.value;
				chrome.storage.sync.set({"lang": this.value});
				//request(data.weather, "current");
				//request(data.weather, "forecast");
				location.reload()
			});		
		}
	}

	cacheControl();
}

//fait
function imgCredits(src, type) {

	if (type === "default" || type === "dynamic") {
		id("credit").setAttribute("class", "visible");
	}
	if (type === "custom") {
		id("credit").setAttribute("class", "hidden");
		return false;
	}

	for (var i = 0; i < CREDITS.length; i++) {

		if (src && src.includes(CREDITS[i].id)) {
			id("credit").setAttribute("href", CREDITS[i].url);
			id("credit").innerText = CREDITS[i].title + ", " + CREDITS[i].artist;
			id("credit").removeAttribute("class");

			return true;
		}
	}
}

//fait
function imgBackground(val) {
	if (val) {
		id("background").style.backgroundImage = "url(" + val + ")";
	} else {
		return id("background").style.backgroundImage;
	}
}

function applyBackground(src, type, blur) {

	//enleve les inputs selectionnés suivent le type
	if (type === "default") {
		id("i_dynamic").checked = false;
		id("i_bgfile").value = "";
	}
	else if (type === "custom") {
		id("i_dynamic").checked = false;
		remSelectedPreview();
		imgCredits(null, type);
	}
	else if (type === "dynamic") {
		remSelectedPreview();
	}
	
	imgBackground(src);
	if (blur) blurThis(blur);
}
 
//fait
function initBackground() {

	chrome.storage.sync.get(["background_image", "background_type", "background_blur"], (data) => {

		//si storage existe, utiliser storage, sinon default
		var image = (data.background_image ? data.background_image : "src/images/backgrounds/avi-richards-beach.jpg");
		var type = (data.background_type ? data.background_type : "default");
		var blur = (Number.isInteger(data.background_blur) ? data.background_blur : 25);

		//si custom, faire le blob
		if (data.background_type === "custom") {
			//reste local !!!!
			chrome.storage.local.get("background_blob", (data) => {
				applyBackground(blob(data.background_blob), type);
			});	
		} 
		else if (data.background_type === "dynamic") {
			dynamicBackground("init")
		}
		else {
			applyBackground(image, type);
		}
		
		imgCredits(image, type);
		blurThis(blur, true);

		//remet les transitions du blur
		setTimeout(function() {
			id("background").style.transition = "filter .2s";
		}, 500);
	});	
}

//fait
function blob(donnee, set) {

	//fonction compliqué qui créer un blob à partir d'un base64
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
	let base = (set ? donnee.split(",") : donnee);
	let contentType = base[0].replace("data:", "").replace(";base64", "");
	let b64Data = base[1];

	//creer le blob et trouve l'url
	let blob = b64toBlob(b64Data, contentType);
	let blobUrl = URL.createObjectURL(blob);

	if (set) {

		//enregistre l'url et applique le bg
		//blob est local pour avoir plus de place
		chrome.storage.local.set({"background_blob": base}); //reste local !!!!
		chrome.storage.sync.set({"background_image": blobUrl});
		chrome.storage.sync.set({"background_type": "custom"});

	}

	return blobUrl;
}

//fait
function renderImage(file) {

	// render the image in our view
	// ces commentaire anglais ne veulent pas dire que j'ai copié collé ok

	// generate a new FileReader object
	var reader = new FileReader();

	// inject an image with the src url
	reader.onload = function(event) {

		applyBackground(blob(event.target.result, true), "custom");
	}

	// when the file is read it triggers the onload event above.
	reader.readAsDataURL(file);
}

//fait
function defaultBg() {

	var bgTimeout, oldbg;

	id("default_background").onmouseenter = function() {
		oldbg = imgBackground().slice(4, imgBackground().length - 1);
	}

	id("default_background").onmouseleave = function() {
		clearTimeout(bgTimeout);
		imgBackground(oldbg);
	}

	function getSource(that) {
		var src = that.children[0].getAttribute("src");
		if (id("i_retina").checked) src = src.replace("/backgrounds/", "/backgrounds/4k/");
		if (!id("i_retina").checked) src = src.replace("/4k", "");

		return src
	}

	function imgEvent(state, that) {

		if (state === "enter") {
			if (bgTimeout) clearTimeout(bgTimeout);

			var src = getSource(that);

			bgTimeout = setTimeout(function() {

				//timeout de 300 pour pas que ça se fasse accidentellement
				//prend le src de la preview et l'applique au background
				imgBackground(src);

			}, 300);

		} else if (state === "leave") {

			clearTimeout(bgTimeout);

		} else if (state === "mouseup") {

			var src = getSource(that);

		    applyBackground(src, "default");
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
defaultBg();

//fait
function retina(check) {

	var b = id("background").style.backgroundImage.slice(4, imgBackground().length - 1);

	if (!check && b.includes("/4k")) {
		b = b.replace("/4k", "");
		imgBackground(b);
		chrome.storage.sync.set({"background_image": b});
		chrome.storage.sync.set({"retina": false});
	}

	if (check && !b.includes("/4k")) {
		b = b.replace("backgrounds/", "backgrounds/4k/");
		imgBackground(b);
		chrome.storage.sync.set({"background_image": b});
		chrome.storage.sync.set({"retina": true});
	}
}

//fait
function remSelectedPreview() {
	let a = cl("imgpreview");
	for (var i = 0; i < a.length; i++) {

		if (a[i].classList[1] === "selected")
			a[i].setAttribute("class", "imgpreview")
	}
}

function dynamicBackground(state, input) {

	function apply(condition, init) {

		chrome.storage.sync.get(["background_image", "background_type", "dynamic", "previous_type"], (data) => {

			if (condition) {

				if (!init) {
					//set un previous background si le user choisi de désactiver ce parametre
					chrome.storage.sync.set({"previous_type": data.background_type});
					chrome.storage.sync.set({"dynamic": true});
					chrome.storage.sync.set({"background_type": "dynamic"});
				}

				applyBackground(UNSPLASH, "dynamic");
				imgCredits(UNSPLASH, "dynamic");

				//enleve la selection default bg si jamais
				remSelectedPreview();

			} else {

				chrome.storage.sync.set({"dynamic": false});
				chrome.storage.sync.set({"background_type": data.previous_type});

				initBackground();
				imgCredits(data.background_image, data.background_type);
			}
		});	
	}

	
	if (state === "init") {
		apply(true, true);
	} else {
		apply(input)
	}	
}

//fait
function blurThis(val, init) {
	
	if (val > 0) {
		id('background').style.filter = 'blur(' + val + 'px)';
	} else {
		id('background').style.filter = '';
	}

	if (!init) chrome.storage.sync.set({"background_blur": parseInt(val)});
	else id("i_blur").value = val;
}

id("i_retina").onchange = function() {
	retina(this.checked)
}

id("i_dynamic").onchange = function() {
	dynamicBackground("change", this.checked)
};

id("i_bgfile").onchange = function() {
	renderImage(this.files[0]);
};

id("i_blur").onchange = function() {
	blurThis(this.value);
};


//fait
function darkmode(choix) {

	//fait
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
		id("ios_wallpaper").children[0].setAttribute("src", "src/images/backgrounds/" + modeurl + ".jpg");

		if (imgBackground().includes(actual)) {

			applyBackground(urltouse, "default");
			chrome.storage.sync.set({"background_image": urltouse});
		}
	}

	//fait
	function applyDark(add, system) {

		if (add) {

			if (system) {

				document.body.setAttribute("class", "autodark");

			} else {

				document.body.setAttribute("class", "dark");
				//$(".bonjourr_logo").attr("src", 'src/images/popup/bonjourrpopup_d.png');
				isIOSwallpaper(true);
			}

		} else {

			document.body.removeAttribute("class");
			//$(".bonjourr_logo").attr("src", 'src/images/popup/bonjourrpopup.png');
			isIOSwallpaper(false);
		}
	}

	//fait
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

	//fait
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

	//fait
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

id("i_dark").onchange = function() {
	darkmode(this.value)
}

//fait
function searchbarFlexControl(activated, linkslength) {

	if (linkslength > 0) {

		if (activated)
			id("sb_container").setAttribute("class", "shown");
		else
			id("sb_container").setAttribute("class", "removed");
		
	} else {

		if (activated)
			id("sb_container").setAttribute("class", "shown");
		else
			id("sb_container").setAttribute("class", "removed");
	}
}

function searchbar() {

	//fait
	function activate(activated, links) {

		//visibility hidden seulement si linkblocks est vide

		if (activated) {	

			id("choose_searchengine").setAttribute("class", "shown");

			searchbarFlexControl(activated, (links ? links.length : 0));
			chrome.storage.sync.set({"searchbar": true});
			
		} else {

			//pour animer un peu
			id("choose_searchengine").setAttribute("class", "hidden");
			
			searchbarFlexControl(activated, (links ? links.length : 0));
			chrome.storage.sync.set({"searchbar": false});
		}
	}

	function chooseSearchEngine(choice) {

		var engines = {
			"s_startpage" : ["https://www.startpage.com/do/dsearch?query=", "Startpage"],
			"s_ddg" : ["https://duckduckgo.com/?q=", "DuckDuckGo"],
			"s_qwant" : ["https://www.qwant.com/?q=", "Qwant"],
			"s_ecosia" : ["https://www.ecosia.org/search?q=", "Ecosia"],
			"s_google" : ["https://www.google.com/search", "Google"],
			"s_yahoo" : ["https://search.yahoo.com/search?p=", "Yahoo"],
			"s_bing" : ["https://www.bing.com/search?q=", "Bing"]
		}

		var trad = {
			en: "Search",
			fr: "Rechercher sur",
			sv: "Sök med",
			nl: "Zoek op",
			pl: "Szukaj z",
			ru: "Поиск в",
			zh_CN: "搜索"
		}

		var placeholder = "";

		if (localStorage.lang) {
			placeholder = trad[localStorage.lang] + " " + engines[choice][1];
		} else {
			placeholder = trad["en"] + " " + engines[choice][1];
		}

		id("sb_form").setAttribute("action", engines[choice][0]);
		id("searchbar").setAttribute("placeholder", placeholder);

		chrome.storage.sync.set({"searchbar_engine": choice});
	}

	
	//init
	chrome.storage.sync.get(["searchbar", "searchbar_engine", "links"], (data) => {

		if (data.searchbar) {

			//display
			activate(true, data.links);

			if (data.searchbar_engine) {
				chooseSearchEngine(data.searchbar_engine);
			} else {
				chooseSearchEngine("s_startpage");
			}

		} else {
			activate(false, data.links);
		}
	});
	

	// Active ou désactive la search bar
	id("i_sb").onchange = function() {

		if (!stillActive) {
			activate(this.checked);
		}
		slow(this);
	}

	// Change le moteur de recherche de la search bar selon le select .choose_search
	id("i_sbengine").onchange = function() {
		chooseSearchEngine(this.value);
	}
}

// Signature aléatoire
function signature() {
	var v = "<a href='https://victor-azevedo.me/'>Victor Azevedo</a>";
	var t = "<a href='https://tahoe.be'>Tahoe Beetschen</a>";
	var e = document.createElement("span");

	e.innerHTML = (Math.random() > 0.5 ? (v + " & " + t) : (t + " & " + v));
	id("rand").appendChild(e);
}

function actualizeStartupOptions() {

	let store = ["background_type", "retina", "dark", "linknewtab", "weather", "searchbar", "searchbar_engine", "clockformat", "lang"];

	chrome.storage.sync.get(store, (data) => {

		if (data.linknewtab) {
			id("i_linknewtab").checked = true;
		} else {
			id("i_linknewtab").checked = false;
		}

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

		if (data.retina) {
			id("i_retina").checked = true;
		} else {
			id("i_retina").checked = false;
		}

		//dynamic background
		if (data.background_type === "dynamic") {
			id("i_dynamic").checked = true;
		}

		//dark mode input
		if (data.dark) {
			id("i_dark").value = data.dark;
		} else {
			id("i_dark").value = "disable";
		}
		
		
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
			setTimeout(() => {
		    	id("searchbar").focus();
		    }, 100);
		} else {
			id("i_sb").checked = false;
		}	
		

		if (data.searchbar_engine) {
			id("i_sbengine").value = data.searchbar_engine;
		} else {
			id("i_sbengine").value = "s_startpage";
		}


		//clock
		if (data.clockformat === 12) {
			id("i_ampm").checked = true;
			localStorage.clockformat = 12;
		} else {
			id("i_ampm").checked = false;
		}
			

		//langue
		if (localStorage.lang) {
			id("i_lang").value = localStorage.lang;
		} else {
			id("i_lang").value = "en";
		}
	});		
}

function mobilecheck() {
	var check = false;
	(function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
	return check;
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

	for (var i = 0; i < e.path.length; i++) {
		if (e.path[i].id === "linkblocks") return false;
	}

	if (id("settings").getAttribute("class") === "shown") {

		setClass(id("showSettings").children[0], "");
		setClass(id("settings"), "");
		setClass(id("interface"), "");
	}
}

//autofocus
$(document).keydown(function(e) {

	if ($("#sb_container").hasClass("shown")
		&& !$("#settings").hasClass("shown")
		/*&& $("#start_popup").show().length === 0*/) {

		$("#searchbar").focus();
	}
})



$(document).ready(function() {
	//initTrad();
	darkmode();
	clock();
	date();
	greetings();
	weather();
	searchbar();
	quickLinks();
	signature();
	//introduction();
	actualizeStartupOptions();
	initBackground();

	document.body.style.animation = "fade .1s ease-in forwards";
});