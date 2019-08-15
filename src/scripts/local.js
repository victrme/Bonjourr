var translator = $('html').translate({lang: "en", t: dict});
var stillActive = false;
const INPUT_PAUSE = 700;
const BLOCK_LIMIT = 16;
const TITLE_LIMIT = 42;
const WEATHER_API_KEY = "7c541caef5fc7467fc7267e2f75649a9";
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

//c'est juste pour debug le storage
function deleteBrowserStorage() {
	localStorage.clear();
}

//c'est juste pour debug le storage
function getBrowserStorage() {
	console.log(localStorage);
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

	translator.lang(localStorage.lang);
	return translator.get(str);
}

function initTrad() {

	var data = localStorage;

	//init
	translator.lang(data.lang);

	//selection de langue
	//localStorage + weather update + body trad
	$(".lang").change(function() {

		localStorage.lang = this.value;
		translator.lang(this.value);

		date();
		greetings();
	});

	$(".popup .lang").change(function() {
		$(".settings .lang")[0].value = $(this)[0].value;
	});
}

function introduction() {

	function welcomeback(iswelcomed) {

		//regarde si le storage déclare un welcome back
		//si oui on affiche welcome back et le supprime

		if (iswelcomed) {
			$(".welcomeback_wrapper").css("display", "flex");
			localStorage.removeItem("welcomeback");
		}

		function remWelcome() {
			$(".welcomeback_wrapper").css("background-color", 'transparent');
			$(".welcomeback").css("margin-top", "200%");
			
			setTimeout(function() {
				$(".welcomeback_wrapper").remove();
			}, 400);
		}

		$(".welcomeback button").click(function() {
			remWelcome();
		});
	}

	var data = localStorage;
		
	if (!data.isIntroduced) {

		$("#start_popup").css("display", "flex");

	} else {
		
		$("#start_popup").remove();

		if (data.links && data.links.length > 0) $(".interface .linkblocks").css("visibility", "visible");
		
		welcomeback(data.welcomeback);
	}

	//la marge des popups en pourcentages
	var margin = 0; 
	//init le premier counter avec le style actif
	var premier = $("div.counter span:first-child")[0];
	$(premier).addClass("actif");


	// Start popup
	function dismiss() {

		$("#start_popup").css("background-color", 'transparent');
		$(".popup_window").css("margin-top", "200%");

		//les links modifié en intro sont réinitialisés
		if ($(".popup .linkblocks").css("visibility") === "visible") {
			$(".interface .linkblocks").css("visibility", 'visible');
			quickLinks();
		}
		
		setTimeout(function() {
			$("#start_popup").remove();
			$(".interface .linkblocks").css("opacity", 1)
		}, 400);

		//mettre ça en false dans la console pour debug la popup
		localStorage.isIntroduced = true;
	}

	function countPopup(c) {
		//prend le span qui correspond au margin / 100
		var elem = $("div.counter")[0].children[c / 100];

		//change le style de tous par defaut
		//puis l'element choisi
		$("div.counter span").removeClass("actif");
		$(elem).addClass("actif");
	}

	function btnLang(margin, state) {

		if (state === "pre") {
			if (margin === 0) {
				$(".previous_popup").text(tradThis("Dismiss"));
				$(".next_popup").text(tradThis("Begin"));
			}

			if (margin === 400) {
				$(".next_popup").text(tradThis("Next"));
			}
		}

		if (state === "nxt") {
			if (margin === 100) {

				localStorage.links = JSON.stringify(START_LINKS);
				$(".popup .linkblocks").css("visibility", "visible");
				quickLinks();

				$(".previous_popup").text(tradThis("Back"));
				$(".next_popup").text(tradThis("Next"));
			}

			if (margin === 500) {
				$(".next_popup").text(tradThis("All set!"));
			}
		}

		if (state === "lng") {
			$(".previous_popup").text(tradThis("Dismiss"));
			$(".next_popup").text(tradThis("Begin"));
		}
	}

	function previous() {

		//event different pour chaque slide
		//le numero du slide = margin / 100
		//ici quand on recule
		margin -= 100;
		btnLang(margin, "pre");

		if (margin === -100) {
			dismiss();
		} else {
			countPopup(margin);
			$(".popup_line").css("margin-left", "-" + margin + "%");
		}
	}

	function next(lang) {

		margin += 100;
		btnLang(margin, "nxt");

		if (margin === 600) {
			dismiss();
		}
		else {
			countPopup(margin);
			$(".popup_line").css("margin-left", "-" + margin + "%");
		}
	}

	$(".previous_popup").click(function() {
		previous();
	});

	$(".next_popup").click(function(){
		next();
	});

	$(".popup .lang").change(function() {
		localStorage.lang = this.value;
		btnLang(null, "lng");
	});
}

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

		$('#clock').text(h + ":" + m);

		timesup = setTimeout(start, 5000);
	}


	//settings event
	$(".12hour input").change(function() {

		//change le format 
		if ($(this)[0].checked) {

			format = 12;
			clearTimeout(timesup);
			start();

		} else {

			format = 24;
			clearTimeout(timesup);
			start();
		}

		//enregistre partout suivant le format
		localStorage.clockformat = format;
	});

	format = parseInt(localStorage.clockformat);
	start();
}

function date() {

	var days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
	var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];

	//la date defini l'index dans la liste des jours et mois pour l'afficher en toute lettres
	$(".date .jour").text(tradThis(days[DATE.getDay()]));
	$(".date .chiffre").text(tradThis(DATE.getDate()));
	$(".date .mois").text(tradThis(months[DATE.getMonth()]));
}

function greetings() {
	var h = DATE.getHours();
	var m;

	if (h >= 6 && h < 12) {
		m = tradThis('Good Morning'); 

	} else if (h >= 12 && h < 17) {
		m = tradThis('Good Afternoon');

	} else if (h >= 17 && h < 23) {
		m = tradThis('Good Evening');

	} else if (h >= 23 && h < 6) {
		m = tradThis('Good Night');
	}

	$('.greetings').text(m);
}

function quickLinks() {

	var stillActive = false, oldURL = false;

	//initialise les blocs en fonction du storage
	//utilise simplement une boucle de appendblock
	function initblocks() {

		$(".linkblocks").empty();

		var data = localStorage;
		var links = (data.links ? JSON.parse(data.links) : "");

		if (links) {

			for (var i = 0; i < links.length; i++) {
				appendblock(links[i]);
			}
		}
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
		var mobile = mobilecheck();

		//si mobile, un simple hover ative le remove
		//sinon il faut appuyer sur le block
		var eventEnter = (mobile ? "contextmenu" : "mousedown");

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

		//j'appuie sur le block pour afficher le remove
		$(".linkblocks").on("mousedown", ".block", function() {

			remTimeout = setTimeout(function() {
				displaywiggle();
			}, 800);
		});

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


		//c'est l'event qui active le block comme un lien <a>
		//je l'ai mis la à cause du clearTimeout
		$(".linkblocks").on("click", ".block", function(e) {

			clearTimeout(remTimeout);

			if (canRemove === false) {
				window.location = $(this).attr("source");
			}
		});




		function removeblock(i) {

			var data = localStorage;
			var storagelinks = (data.links ? JSON.parse(data.links) : null);

			//si on supprime un block quand la limite est atteinte
			//réactive les inputs
			if (storagelinks.length === BLOCK_LIMIT) {

				var input = $("input[name='url']");
				$(input).each(function() {
					$(this).attr("placeholder", "URL");
					$(this).removeAttr("disabled");
				});
			}

			//enleve le html du block
			var block = $(".linkblocks")[0].children[i];
			$(block).addClass("removed");
			
			setTimeout(function() {

				$(block).remove();
				//enleve linkblocks si il n'y a plus de links
				if (storagelinks.length === 1) {
					$(".interface .linkblocks").css("visibility", "hidden");
					searchbarFlexControl(data.searchbar, 0);
				}
			}, 200);
			
			
			//coupe en 2 et concat sans le link a remove
			function ejectIntruder(arr) {
				
				return arr.slice(0, i).concat(arr.slice(i + 1));
			}
			
			var links = storagelinks;
			localStorage.links = JSON.stringify(ejectIntruder(links));
		}


		//event de suppression de block
		//prend l'index du parent du .remove clické
		$(".linkblocks").on("click", ".remove", function() {
			
			var index = $(this).parent().parent().parent().index();
			(canRemove ? removeblock(index) : "");
		});
	}

	function linkSubmission() {

		function submissionError(str) {

			oldURL = str;
			var input = $("input[name='url']");

			//affiche le texte d'erreur
			$("p.wrongURL").css("display", "block");
			$("p.wrongURL").css("opacity", 1);

			//l'enleve si le user modifie l'input
			$(input).keypress(function() {

				if ($(this).val() !== oldURL) {
					$("p.wrongURL").css("opacity", 0);
					setTimeout(function() {
						$("p.wrongURL").css("display", "none");
					}, 200);
				}
			});
		}

		function filterUrl(str) {

			var regHTTP = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/gm;
			var regVal = /^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/gm;

			//premier regex pour savoir si c'est http
			if (!str.match(regHTTP)) {
				str = "http://" + str;
			}

			//deuxieme pour savoir si il est valide (avec http)
			if (str.match(regVal)) {
				return str.match(regVal)[0];
			} else {
				return false;
			}
		}

		function fetchIcon(str) {

			//prend le domaine de n'importe quelle url
			var a = document.createElement('a');
			a.href = str;
			var hostname = a.hostname;

			return "https://besticon-demo.herokuapp.com/icon?url=" + hostname + "&size=80";
		}

		function saveLink(lll) {

			var full = false;

			var data = localStorage;
			var storagelinks = (data.links ? JSON.parse(data.links) : null);

			var arr = [];

			//array est tout les links + le nouveau
			if (storagelinks && storagelinks.length > 0) {

				if (storagelinks.length < BLOCK_LIMIT - 1) {

					arr = storagelinks;
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

				localStorage.links = JSON.stringify(arr);
				appendblock(lll);

			} else {

				//desactive tout les input url (fonctionne pour popup du coup)
				var input = $("input[name='url']");
				$(input).each(function() {
					$(this).attr("placeholder", "Quick Links full");
					$(this).attr("disabled", "disabled");
				});
			}
		}

		//append avec le titre, l'url ET l'index du bloc
		var title = $(".addlink input[name='title']").val();
		var url = $(".addlink input[name='url']").val();
		var filtered = filterUrl(url);

		//Titre trop long, on rajoute "...""
		if (title.length > TITLE_LIMIT) title = title.slice(0, TITLE_LIMIT) + "...";

		//si l'url filtré est juste
		if (filtered) {
			//et l'input n'a pas été activé ya -1s
			if (!stillActive) {

				var links = {
					title: title,
					url: filtered,
					icon: fetchIcon(filtered)
				}

				saveLink(links);
				slow($(".addlink input[name='url']"));

				//remet a zero les inputs
				$(".addlink input[name='title']").val("");
				$(".addlink input[name='url']").val("");
			}	
		} else {
			if (url.length > 0) submissionError(url);
		}
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

	initblocks();
	showRemoveLink();
}

function weather() {

	//init la requete;
	var req;
	
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
		$(".w_desc_meteo").text(meteoStr + ".");



		//si c'est l'après midi (apres 12h), on enleve la partie temp max
		var dtemp, wtemp;

		if (HOURS < 12) {

			//temp de desc et temp de widget sont pareil

			dtemp = wtemp = Math.floor(data.main.temp) + "°";
			$("div.hightemp").css("display", "block");
			$(".w_desc_temp_max").text(Math.floor(data.main.temp_max) + "°");

		} else {

			//temp de desc devient temp de widget + un point
			//on vide la catégorie temp max
			wtemp = Math.floor(data.main.temp) + "°";
			dtemp = wtemp + ".";
		}

		$(".w_desc_temp").text(dtemp);
		$(".w_widget_temp").text(wtemp);
		
		if (data.icon) {

			$(".w_icon").attr("src", data.icon);
			
		} else {
			//pour l'icone
			var d_n = dayOrNight(data.sys.sunset, data.sys.sunrise);
			var weather_id = imgId(data.weather[0].id);
	 		var icon_src = "src/images/weather/" + d_n + "/" + weather_id + ".png";
	 		$(".w_icon").attr("src", icon_src);

	 		//sauv l'icone dans wLastState
	 		data.icon = icon_src;
	 		localStorage.wLastState = JSON.stringify(data);
		}

		$(".w_icon").css("opacity", 1);
	}

	function weatherRequest(arg) {

		//a changer
		var url = 'https://api.openweathermap.org/data/2.5/weather?appid=' + WEATHER_API_KEY;

		//auto, utilise l'array location [lat, lon]
		if (arg.geol_lat && arg.geol_long) {
			url += "&lat=" + arg.geol_lat + "&lon=" + arg.geol_long;
		} else {
			url += "&q=" + encodeURI(arg.city);
		}

		url += '&units=' + arg.unit + '&lang=' + arg.lang;


		var request_w = new XMLHttpRequest();
		request_w.open('GET', url, true);

		request_w.onload = function() {
			
			var data = JSON.parse(this.response);

			if (request_w.status >= 200 && request_w.status < 400) {

				//la réponse est utilisé dans la fonction plus haute
				dataHandling(data);

				//sauvegarde la derniere meteo
				localStorage.wLastState = JSON.stringify(data);

				$("p.wrongCity").css("opacity", 0);
				return true;

			} else {
				submissionError(arg.city);
			}
		}

		request_w.send();
	}

	function initWeather() {
		req.city = "Paris";
		req.unit = "metric";

		weatherRequest(req);

		localStorage.weather_city = "Paris";
		localStorage.weather_unit = "metric";
	}
 
	function apply() {

		//enleve les millisecondes
		var now = Math.floor(DATE.getTime() / 1000);
		var lastCall = parseInt(localStorage.wlastCall);
		var lastState = localStorage.wLastState;

		//1.0.7 --> 1.1.0 bug corrigé
		try {
			lastState = JSON.parse(lastState);
		} catch {
			lastCall = undefined;
			lastState = "";
		}

		if (lastState) dataHandling(lastState);

		var data = localStorage;

		req = {
			city: data.weather_city,
			unit: data.weather_unit,
			geol_lat: data.weather_geol_lat,
			geol_long: data.weather_geol_long,
			lang: data.lang
		};

		if (lastCall) {

			//si weather est vieux d'une demi heure (1800s)
			//faire une requete et update le lastcall
			if (now > lastCall + 1800) {
				weatherRequest(req);
				localStorage.wlastCall = now;
			} else {
				dataHandling(lastState);
			}

		} else {

			//initialise a Paris + Metric
			//c'est le premier call, requete + lastCall = now
			initWeather();
			localStorage.wlastCall = now;
		}
	}

	function submissionError(str) {

			oldCity = str;
			var input = $(".change_weather input[name='city']");

			//affiche le texte d'erreur
			$("p.wrongCity").css("display", "block");
			$("p.wrongCity").css("opacity", 1);

			//l'enleve si le user modifie l'input
			$(input).keyup(function() {

				if ($(this).val() !== oldCity) {
					$("p.wrongCity").css("opacity", 0);
					setTimeout(function() {
						$("p.wrongCity").css("display", "none");
					}, 200);
				}
			});
	}

	function updateCity() {

		var city = $(".change_weather input[name='city']");
		req.city = city[0].value;

		if (req.city.length < 2) return "";

		weatherRequest(req);

		localStorage.weather_city = req.city;

		city.attr("placeholder", req.city);
		city.val("");
		city.blur();
	}

	function updateUnit(that) {

		if ($(that).is(":checked")) {
			req.unit = "imperial";
		} else {
			req.unit = "metric";
		}

		weatherRequest(req);
		
		localStorage.weather_unit = req.unit;
	}

	//automatise la meteo
	//demande la geoloc et enleve l'option city
	function updateLocation(that) {

		if ($(that).is(":checked")) {

			$(that).attr("disabled", "");

			navigator.geolocation.getCurrentPosition((pos) => {

				req.geol_lat = pos.coords.latitude
				req.geol_long = pos.coords.longitude;
				localStorage.weather_geol_lat = req.geol_lat;
				localStorage.weather_geol_long = req.geol_long;

				weatherRequest(req);

				$(".change_weather .city").css("display", "none");
				$(that).removeAttr("disabled");
				
			}, (refused) => {

				//désactive geolocation if refused
				$(that)[0].checked = false;
				$(that).removeAttr("disabled");

				if (!req.city) initWeather();
			});

		} else {

			localStorage.removeItem("weather_geol_lat");
			localStorage.removeItem("weather_geol_long");
			req.geol_lat, req.geol_long = false;
			$(".change_weather .city").css("display", "block");

			weatherRequest(req);
		}
	}

	//TOUT LES EVENTS

	$(".submitw_city").click(function() {
		if (!stillActive) {
			updateCity();
			slow(this);
		}
		
	});

	$('.change_weather input[name="city"]').on('keypress', function(e) {
		if (!stillActive && e.which === 13) {
			updateCity();
			slow(this);
		}
	});

	$(".units input").change(function() {
		if (!stillActive) {
			updateUnit(this);
			slow(this);
		}
	});


	$(".w_auto input").change(function() {
		if (!stillActive) {
			updateLocation(this);
		}
	});

	$(".lang").change(function() {
		if (!stillActive) {
			req.lang = this.value;
			weatherRequest(req);
			searchbar();
			slow(this);
		}
	});


	//popup checkboxes enables settings checkboxes
	$(".popup .units input").change(function() {
		$(".settings .units input")[0].checked = $(this)[0].checked;
	});

	$(".popup .w_auto input").change(function() {
		$(".settings .w_auto input")[0].checked = $(this)[0].checked;
	});


	apply();
}

function imgCredits(src, type) {

	if (type === "custom") {
		$("div.credit a").css("opacity", 0);
	}

	for (var i = 0; i < CREDITS.length; i++) {

		if (src.includes(CREDITS[i].id)) {
			$("div.credit a").attr("href", CREDITS[i].url);
			$("div.credit a").text(CREDITS[i].title + ", " + CREDITS[i].artist);
			$("div.credit a").css("opacity", 1);

			return true;
		}
	}
}

function imgBackground(val) {
	if (val) {
		$(".background").css("background-image", "url(" + val + ")");
	} else {
		return $(".background").css("background-image");
	}
}

function optimizedBgURL(source, blur) {

	//remplace le répertoire de l'image
	//en fonction du blur et du ratio pixel
	//from le repertoire actuel à celui voulu
	var dirFrom, dirTo;
	var res = window.devicePixelRatio * screen.height;

	if (parseInt(blur) > 5) {

		if (source.includes("/default/")) {
			dirFrom = "default";
		}
		else if (source.includes("/large/")) {
			dirFrom = "large";
		}
		
		dirTo = "blur";

	} else if (parseInt(blur) < 5 || blur === "none") {

		dirFrom = "blur";

		if (res > 950) {	
			dirTo = "large";
		} else {
			dirTo = "default";
		}
	}

	if (res > 950 && source.includes("/default/")) {
		
		dirFrom = "default";
		dirTo = "large";
	}

	source = source.replace(dirFrom, dirTo);
	return source;
}

function applyBackground(src, type, blur) {

	//enleve les inputs selectionnés suivent le type
	if (type === "default") {
		src = optimizedBgURL(src, blur);

		$("div.dynamic_bg input").prop("checked", false);
		$("input[name='background_file']")[0].value = "";
	}
	else if (type === "custom") {
		$("div.dynamic_bg input").prop("checked", false);
		$(".imgpreview").removeClass("selected");
	}
	else if (type === "dynamic") {
		$("input[name='background_file']")[0].value = "";
		$(".imgpreview").removeClass("selected");
	}

	imgCredits(src, type);
	imgBackground(src);
	if (blur) blurThis(blur);
}

function initBackground() {

	var data = localStorage;

	//si storage existe, utiliser storage, sinon default
	var image = (data.background_image ? data.background_image : "src/images/backgrounds/blur/avi-richards-beach.jpg");
	var type = (data.background_type ? data.background_type : "default");
	var blur = (data.background_blur ? data.background_blur : 25);

	//si custom, faire le blob
	if (data.background_type === "custom") {
		
		var blob = (data.background_blob ? JSON.parse(data.background_blob) : console.log("pas de blob"));
		applyBackground(blob(), type, blur);

	} else {

		applyBackground(image, type, blur);
	}
	

	//remet les transitions du blur
	setTimeout(function() {
		$(".background").css("transition", "filter .2s");
	}, 200);	
}

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
		localStorage.background_blob = JSON.stringify(base);
		localStorage.background_image = blobUrl;
		localStorage.background_type = "custom";
	}

	return blobUrl;
}

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

function defaultBg() {

	var bgTimeout, oldbg;

	//pour preview le default background
	$(".choosable_backgrounds").mouseenter(function() {
		oldbg = imgBackground().slice(4, imgBackground().length - 1);
	});

	//pour arreter de preview le default background
	$(".choosable_backgrounds").mouseleave(function() {
		clearTimeout(bgTimeout);
		imgBackground(oldbg);
	});

	//pour preview le default background
	$(".imgpreview img").mouseenter(function() {

		if (bgTimeout) clearTimeout(bgTimeout);

		var blur = $(".background").css("filter").replace("blur(", "").replace("px)", "");
		var source = optimizedBgURL(this.attributes.src.value, blur);

		bgTimeout = setTimeout(function() {

			//timeout de 300 pour pas que ça se fasse accidentellement
			//prend le src de la preview et l'applique au background
			imgBackground(source);
			imgCredits(source);

		}, 300);
	});

	$(".imgpreview img").mouseleave(function() {
		clearTimeout(bgTimeout);
	});


	//pour choisir un default background
	$(".imgpreview img").click(function() {

		//prend le src de la preview et l'applique au background
		var blur = $(".background").css("filter").replace("blur(", "").replace("px)", "");
		var source = optimizedBgURL(this.attributes.src.value, blur);

	    applyBackground(source, "default");

		clearTimeout(bgTimeout);
		oldbg = source;

		//enleve selected a tout le monde et l'ajoute au bon
		$(".imgpreview").removeClass("selected");
		//ici prend les attr actuels et rajoute selected après (pour ioswallpaper)
		var tempAttr = $(this)[0].parentElement.getAttribute("class");
		$(this)[0].parentElement.setAttribute("class", tempAttr + " selected");

		localStorage.background_image = source;
		localStorage.background_type = "default";
	});
}

function dynamicBackground() {

	$("div.dynamic_bg input").change(function() {

	var data = localStorage;

		if (this.checked) {

			//set un previous background si le user choisi de désactiver ce parametre
			localStorage.previous_image = data.background_image;
			localStorage.previous_type = data.background_type;

			applyBackground(UNSPLASH, "dynamic");

			localStorage.background_image = UNSPLASH;
			localStorage.background_type = "dynamic";

			//enleve la selection default bg si jamais
			$(".imgpreview").removeClass("selected");

		} else {

			if (data.previous_image) {
				//previous background devient actuel
				applyBackground(data.previous_image, data.previous_type);

				localStorage.background_image = data.previous_image;
				localStorage.background_type = data.previous_type;

				//supprime pour faire de la place en cas de custom bg
				localStorage.removeItem("previous_image");
				localStorage.removeItem("previous_type");

			} else {
				//default bg
				applyBackground("src/images/avi-richards-beach.jpg", "default", 25);

				localStorage.background_image = optimizedBgURL("src/images/avi-richards-beach.jpg");
				localStorage.background_type = "default";
			}
		}
	});
}

function blurThis(val, choosing) {

	var isDark = $("body").attr("class");
	var url = imgBackground().slice(4, imgBackground().length - 1);
	val = parseInt(val);

	if (val > 0) {

		$('.background').css("filter", 'blur(' + val + 'px)');
		if (choosing) imgBackground(optimizedBgURL(url, val));

	} else {

		$('.background').css("filter", '');
		if (choosing) imgBackground(optimizedBgURL(url, val));
	}

	localStorage.background_blur = val;
}

defaultBg();
dynamicBackground();


// handle input changes
$(".change_background input[name='background_file']").change(function() {
	renderImage(this.files[0]);
});

// handle input changes
$(".change_background input[name='background_blur']").change(function() {
	blurThis(this.value, true);
});


function darkmode(choix) {

	function isIOSwallpaper(dark) {

		//défini les parametres a changer en fonction du theme
		var modeurl, actual, urltouse;

		if (dark) {

			modeurl = "ios13_dark";
			actual = "ios13_light";
			urltouse = 'src/images/backgrounds/default/ios13_dark.jpg';

		} else {
			
			modeurl = "ios13_light";
			actual = "ios13_dark";
			urltouse = 'src/images/backgrounds/default/ios13_light.jpg';
		}

		//et les applique ici
		$(".ios_wallpaper img").attr("src", "src/images/backgrounds/blur/" + modeurl + ".jpg");

		if (imgBackground().includes(actual)) {
			applyBackground(optimizedBgURL(urltouse), "default");
			localStorage.background_image = optimizedBgURL(urltouse);
		}
	}

	function applyDark(add, system) {

		if (add) {

			if (system) {

				$("body").addClass("autodark");
				$("body").removeClass("dark");

			} else {

				$("body").addClass("dark");
				$("body").removeClass("autodark");
				$(".bonjourr_logo").attr("src", 'src/images/popup/bonjourrpopup_d.png');
				isIOSwallpaper(true);
			}

		} else {

			$("body").removeClass("dark");
			$("body").removeClass("autodark");
			$(".bonjourr_logo").attr("src", 'src/images/popup/bonjourrpopup.png');
			isIOSwallpaper(false);
		}
	}

	function auto(blur) {

		var wAPI = JSON.parse(localStorage.wLastState);
		var sunrise = new Date(wAPI.sys.sunrise * 1000);
		var sunset = new Date(wAPI.sys.sunset * 1000);
		var hr = new Date();

		sunrise = sunrise.getHours() + 1;
		sunset = sunset.getHours();
		hr = hr.getHours();

		if (hr < sunrise || hr > sunset) {
			applyDark(true);
		} else {
			applyDark(false);
		}
	}

	function initDarkMode() {

		var data = localStorage;
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
	}

	function changeDarkMode() {

		if (choix === "enable") {
			applyDark(true);
			localStorage.dark = "enable";
		}

		if (choix === "disable") {
			applyDark(false);
			localStorage.dark = "disable";
		}

		if (choix === "auto") {

			//prend l'heure et ajoute la classe si nuit
			auto();
			localStorage.dark = "auto";
		}

		if (choix === "system") {
			localStorage.dark = "system";
			applyDark(true, true);
		}
	}

	if (choix) {
		changeDarkMode();
	} else {
		initDarkMode();
	}
}

$(".darkmode select.theme").change(function() {
	darkmode(this.value);
});

$(".popup .darkmode select.theme").change(function() {
	$(".settings .darkmode select.theme")[0].value = this.value;
});

function searchbarFlexControl(activated, linkslength) {

	var dom = $(".searchbar_container");

	if (linkslength > 0) {

		if (activated) {

			dom.addClass("shown");
			dom.removeClass("removed");

		} else {

			dom.addClass("removed");
			dom.removeClass("shown");
		}
		
	} else {

		if (activated) {

			dom.addClass("shown");
			dom.removeClass("removed");

		} else {

			dom.addClass("removed");
			dom.removeClass("shown");
		}
	}
}

function searchbar() {

	function activate(activated, links) {

		//visibility hidden seulement si linkblocks est vide

		if (activated) {

			localStorage.searchbar = true;

			//pour animer un peu
			$("#searchbar_option .param hr, .popup5 hr").css("display", "block");
			$("#choose_searchengine").css("display", 'flex');
			
			searchbarFlexControl(activated, (links ? links.length : 0));
			
		} else {

			localStorage.searchbar = false;

			//pour animer un peu
			$("#choose_searchengine, #searchbar_option hr, .popup5 hr").css("display", "none");
			
			searchbarFlexControl(activated, (links ? links.length : 0));
		}
	}

	function chooseSearchEngine(choice) {

		var engines = {
			"s_startpage" : ["https://www.startpage.com/do/dsearch?query=", tradThis("Search Startpage")],
			"s_ddg" : ["https://duckduckgo.com/?q=", tradThis("Search DuckDuckGo")],
			"s_ecosia" : ["https://www.ecosia.org/search?q=", tradThis("Search Ecosia")],
			"s_google" : ["https://www.google.com/search", tradThis("Search Google")],
			"s_yahoo" : ["https://search.yahoo.com/search?p=", tradThis("Search Yahoo")],
			"s_bing" : ["https://www.bing.com/search?q=", tradThis("Search Bing")]
		}

		$(".searchbar_container form").attr("action", engines[choice][0]);
		$(".searchbar").attr("placeholder", engines[choice][1]);

		localStorage.searchbar_engine = choice;
	}

	//init
	var data = localStorage;
	var storagelinks = (data.links ? JSON.parse(data.links) : null);

	if (data.searchbar) {

		//display
		activate(true, storagelinks);

		if (data.searchbar_engine) {
			chooseSearchEngine(data.searchbar_engine);
		} else {
			chooseSearchEngine("s_startpage");
		}

	} else {
		activate(false, storagelinks);
	}


	// Active ou désactive la search bar
	$(".activate_searchbar input").change(function() {

		if (!stillActive) {
			activate($(this).is(":checked"));
		}
		slow(this);
	});

	$(".popup .activate_searchbar input").change(function() {

		var check = $(this)[0].checked;

		if (check) {
			$("#searchbar_option input")[0].checked = true;
			$(".settings #choose_searchengine").css("display", 'flex');
		}
	});


	// Change le moteur de recherche de la search bar selon le select .choose_search
	$(".choose_search").change(function() {
		chooseSearchEngine(this.value);
	});
}

// Signature aléatoire
function signature() {
	var v = "<a href='https://victor-azevedo.me/'>Victor Azevedo</a>";
	var t = "<a href='https://tahoe.be'>Tahoe Beetschen</a>";

    if (Math.random() > 0.5) {
    	$('.signature .rand').append(v + " & " + t);
	} else {
		$('.signature .rand').append(t + " & " + v);
	}
}

function actualizeStartupOptions() {

	var data = localStorage;

	//default background 
	$(".choosable_backgrounds .imgpreview img").each(function() {

		//compare l'url des preview avec celle du background
		var previewURL = $(this).attr("src");
		var bgURL = $(".background").css("background-image");

		//si l'url du bg inclu l'url de la preview, selectionne le
		if (bgURL.includes(previewURL)) {
			$(this).parent().addClass("selected");
		}
	});


	//dynamic background
	if (data.background_type === "dynamic") {
		$(".dynamic_bg input")[0].checked = true;
	}


	//dark mode input
	if (data.dark) {
		$(".darkmode select.theme").val(data.dark);
	} else {
		$(".darkmode select.theme").val("disable");
	}
	

	
	//weather city input
	if (data.weather_city) {
		$(".change_weather input[name='city']").attr("placeholder", data.weather_city);
	} else {
		$(".change_weather input[name='city']").attr("placeholder", "Paris");
	}
	

	//check geolocalisation
	//enleve city
	if (data.weather_geol_lat && data.weather_geol_long) {
		$(".w_auto input")[0].checked = true;
		$(".change_weather .city").css("display", "none");
	} else {
		$(".w_auto input")[0].checked = false;
		$(".change_weather .city").css("display", "block");
	}

	//check imperial
	if (data.weather_unit && data.weather_unit === "imperial") {
		$(".units input")[0].checked = true;
	} else {
		$(".units input")[0].checked = false;
	}

	
	//searchbar switch et select
	$(".activate_searchbar input")[0].checked = data.searchbar;

	setTimeout(() => {
      if (data.searchbar) $(".interface input.searchbar").focus();
    }, 100);
	

	if (data.searchbar_engine) {
		$(".choose_search")[0].value = data.searchbar_engine;
	} else {
		$(".choose_search")[0].value = "s_startpage";
	}


	//clock
	if (data.clockformat === 12) {
		$(".12hour input")[0].checked = true;
		localStorage.clockformat = 12;
	} else {
		$(".12hour input")[0].checked = false;
	}
		

	//langue
	if (data.lang) {
		$(".lang")[0].value = data.lang;
	} else {
		$(".lang")[0].value = "en";
	}			
}

function mobilecheck() {
	var check = false;
	(function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
	return check;
}

//affiche les settings
$(".showSettings button").click(function() {

	$(this).toggleClass("shown");
	
	$(".settings").css("display", "block");
	$(".settings").toggleClass("shown");
	$(".interface").toggleClass("pushed");


});

//si settings ouvert, le ferme
$(".interface").click(function() {

	if ($("div.settings").hasClass("shown")) {

		$(".showSettings button").toggleClass("shown");
		$(".settings").removeClass("shown");
		$(".interface").removeClass("pushed");
	}
});


$(document).ready(function() {

	initTrad();
	initBackground();
	darkmode();
	clock();
	date();
	greetings();
	weather();
	searchbar();
	quickLinks();
	signature();
	introduction();
	actualizeStartupOptions();
});