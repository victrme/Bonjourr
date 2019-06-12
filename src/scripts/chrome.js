
//c'est juste pour debug le storage
function deleteBrowserStorage() {
	chrome.storage.local.clear().then(() => {
		localStorage.clear();
	});
}

//c'est juste pour debug le storage
function getBrowserStorage() {
	chrome.storage.local.get(null, (data) => {
		console.log(data);
	});
}


//obligé :((
var popupButtonLang = 1;

function introduction() {

	chrome.storage.local.get(null, (data) => {
		
		if (!data.isIntroduced) {
			$("#start_popup").css("display", "flex");
			$(".interface .linkblocks").css("opacity", 0);
		} else {
			$("#start_popup").remove();
			$(".interface .linkblocks").css("opacity", 1);
		}
	});

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
		initblocks();
		
		setTimeout(function() {
			$("#start_popup").remove();
			$(".interface .linkblocks").css("opacity", 1);
		}, 400);

		//mettre ça en false dans la console pour debug la popup
		chrome.storage.local.set({"isIntroduced": true});
	}

	function countPopup(c) {
		//prend le span qui correspond au margin / 100
		var elem = $("div.counter")[0].children[c / 100];

		//change le style de tous par defaut
		//puis l'element choisi
		$("div.counter span").removeClass("actif");
		$(elem).addClass("actif");
	}

	var dict = [
		["Ignorer", "Commencer", "Retour", "Suivant", "Prêt !"],
		["Dismiss", "Begin", "Back", "Next", "All set!"]
	];

	function previous(lang) {

		//event different pour chaque slide
		//le numero du slide = margin / 100
		//ici quand on recule
		margin -= 100;

		if (margin === 0) {
			$(".previous_popup").text(dict[lang][0]);
			$(".next_popup").text(dict[lang][1]);
		}

		if (margin === 300) {
			$(".next_popup").text(dict[lang][3]);
		}

		if (margin === -100) {
			dismiss();
		} else {
			countPopup(margin);
			$(".popup_line").css("margin-left", "-" + margin + "%");
		}
	}

	function next(lang) {

		margin += 100;

		if (margin === 100) {
			$(".previous_popup").text(dict[lang][2]);
			$(".next_popup").text(dict[lang][3]);
		}

		if (margin === 400) {
			$(".next_popup").text(dict[lang][4]);
		}

		if (margin === 500) {
			dismiss();
		}
		else {
			countPopup(margin);
			$(".popup_line").css("margin-left", "-" + margin + "%");
		}
	}

	$(".previous_popup").click(function() {
		previous(popupButtonLang);
	});

	$(".next_popup").click(function(){
		next(popupButtonLang);
	});
}





function clock() {
	
	function checkTime(i) {
		if (i < 10) {i = "0" + i};
		return i;
	}

	var today = new Date();
	var h = today.getHours();
	var m = today.getMinutes();
	m = checkTime(m);

	$('#clock').text(h + ":" + m);

	var t = setTimeout(clock, 1000);
}


function greetings() {
	var h = new Date().getHours();
	var m;

	if (h >= 6 && h < 12) {
		m = 'Good Morning'; 

	} else if (h >= 12 && h < 17) {
		m = 'Good Afternoon';

	} else if (h >= 17 && h < 23) {
		m = 'Good Evening';

	} else if (h >= 23 && h < 6) {
		m = 'Good Night';
	}

	$('.greetings').append(m);
}





/*
LIENS FAVORIS
*/


//initialise les blocs en fonction du storage
//utilise simplement une boucle de appendbglock
function initblocks() {

	$(".linkblocks").empty();

	chrome.storage.local.get(null, (data) => {

		if (data.links) {

			for (var i = 0; i < data.links.length; i++) {
				appendbglock(data.links[i]);
			}
		}
	});
}

//rajoute l'html d'un bloc avec toute ses valeurs et events
function appendbglock(arr) {

	//le DOM du block
	var b = "<div class='block_parent'><div class='block' source='" + arr.url + "'><div class='l_icon_wrap'><button class='remove'><img src='src/images/x.png' /></button><img class='l_icon' src='" + arr.icon + "'></div><p>" + arr.title + "</p></div></div>";

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
	var eventLeave = (mobile ? "mouseleave" : "mouseleave");

	

	//j'appuie sur le block pour afficher le remove
	$(".linkblocks").on(eventEnter, ".block", function() {

		var time = (mobile ? 0 : 1000);

		remTimeout = setTimeout(function() {

			$(".block").find(".remove").addClass("visible");
			$(".block").addClass("wiggly");
			$(this).focus();

			canRemove = true;

		}, time);
	});

	//je sors de la zone de linkblocks pour enlever le remove
	$(".linkblocks").on(eventLeave, function() {

		clearTimeout(remTimeout);

		$(".block").find(".remove").removeClass("visible");
		$(".block").removeClass("wiggly");

		canRemove = false;
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

		chrome.storage.local.get(null, (data) => {

			//enleve le html du block
			var block = $(".linkblocks")[0].children[i];
			$(block).addClass("removed");
			
			setTimeout(function() {
				$(block).remove();
			}, 200);
			
			
			//coupe en 2 et concat sans le link a remove
			function ejectIntruder(arr) {
				
				return arr.slice(0, i).concat(arr.slice(i + 1));
			}
			
			var links = data.links;
			chrome.storage.local.set({"links": ejectIntruder(links)});
		});
	}


	//event de suppression de block
	//prend l'index du parent du .remove clické
	$(".linkblocks").on("click", ".remove", function() {
		
		var index = $(this).parent().parent().parent().index();
		(canRemove ? removeblock(index) : "");
	});
}

function linkSubmission() {

	function filterUrl(str) {
		if (str.startsWith("http") || str.startsWith("https")) {
			return str;
		}
		else if (str.startsWith("file")) {
			return str;
		}
		else {
			return 	"http://" + str;
		}
	}

	function fetchIcon(str) {

		var a = document.createElement('a');
		a.href = str;
		var hostname = a.hostname;

		return "https://besticon-demo.herokuapp.com/icon?url=" + hostname + "&size=80";
	}

	function saveLink(lll) {

		chrome.storage.local.get(null, (data) => {

			var arr = [];

			//array est tout les links + le nouveau
			if (data.links) {

				arr = data.links;
				arr.push(lll);

			//array est seulement le link
			} else {
				arr.push(lll);
			}
			
			chrome.storage.local.set({"links": arr});
		});
	}

	

	//append avec le titre, l'url ET l'index du bloc
	var title = $(".addlink input[name='title'").val();
	var url = filterUrl($(".addlink input[name='url'").val());
	var array = [];
	var links = {
		title: title,
		url: url,
		icon: fetchIcon(url)
	};

	if (url.length > 0) {

		appendbglock(links);
		saveLink(links);

		//remet a zero les inputs
		$(".addlink input[name='title'").val("");
		$(".addlink input[name='url'").val("");
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



/*
DATE
*/

function date() {
	var d = new Date();
	d.getDay();

	var days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
	var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];

	//la date defini l'index dans la liste des jours et mois pour l'afficher en toute lettres
	$(".date .jour").text(days[d.getDay()]);
	$(".date .chiffre").text(d.getDate());
	$(".date .mois").text(months[d.getMonth()]);
}



/*
METEO
*/

function weather(changelang) {

	//init la requete;
	var req, recursive;
	
	function dataHandling(data) {

		//si le soleil est levé, renvoi jour
		//le renvoie correspond au nom du répertoire des icones jour / nuit
		function dayOrNight(sunset, sunrise) {
			var ss = new Date(sunset * 1000);
			var sr = new Date(sunrise * 1000);
			var n = new Date();

			if (n.getHours() > sr.getHours() && n.getHours() < ss.getHours()) {
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
		var date = new Date();

		if (date.getHours() < 12) {

			//temp de desc et temp de widget sont pareil
			dtemp = wtemp = Math.floor(data.main.temp) + "°";
			$(".w_desc_temp_max").text(Math.floor(data.main.temp_max) + "°");

			
		} else {

			//temp de desc devient temp de widget + un point
			//on vide la catégorie temp max
			wtemp = Math.floor(data.main.temp) + "°";
			dtemp = wtemp + ".";
			$("div.hightemp").empty();

		}

		$(".w_desc_temp").text(dtemp);
		$(".w_widget_temp").text(wtemp);

	

		//pour l'icone
		var d_n = dayOrNight(data.sys.sunset, data.sys.sunrise);
		var weather_id = imgId(data.weather[0].id);
 		var icon_src = "src/icons/weather/" + d_n + "/" + weather_id + ".png";

		$(".w_icon").attr("src", icon_src);
	}

	function weatherRequest(arg) {

		//a changer
		var url = 'https://api.openweathermap.org/data/2.5/weather?appid=7c541caef5fc7467fc7267e2f75649a9';

		//auto, utilise l'array location [lat, lon]
		if (arg.geol) {
			url += "&lat=" + arg.geol[0] + "&lon=" + arg.geol[1];
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
				localStorage.wLastState = btoa(JSON.stringify(data));
				recursive = false;

			} else {

				//si la météo bug, initialise à paris + metric
				//utilise un "switch recursif" pour que la fonction s'appelle pas à l'infini
				if (recursive !== true) {

					initWeather();
					recursive = true;
				}
			}
		}

		request_w.send();
	}

	function initWeather() {
		req.city = "Paris";
		req.unit = "metric";

		weatherRequest(req);

		chrome.storage.local.set({"weather_city": "Paris"});
		chrome.storage.local.set({"weather_unit": "metric"});
	}
 
	function apply() {

		chrome.storage.local.get(null, (data) => {

			req = {
				city: data.weather_city,
				unit: data.weather_unit,
				geol: data.weather_geol,
				lang: data.lang
			};

			var lastCall = localStorage.wlastCall;
			var lastState = (localStorage.wLastState ? atob(localStorage.wLastState) : undefined);
			var now = new Date().getTime();

			if (lastCall) {

				//si weather est vieux d'une heure (3600000)
				//faire une requete
				if (now > lastCall + 3600000) {
					
					weatherRequest(req);

				//sinon on saute la requete et on prend le lastState
				} else {

					dataHandling(JSON.parse(lastState));

				}

			} else {

				//initialise a Paris + Metric
				//c'est le premier call, requete + lastCall = now
				initWeather();
				localStorage.wlastCall = now;
			}
		});
	}

	function updateCity() {

		var city = $(".change_weather input[name='city']");
		req.city = city[0].value;

		if (req.city.length < 2) req.city = "Paris";
 		
		chrome.storage.local.get(null, (data) => {

			weatherRequest(req);
			
			chrome.storage.local.set({"weather_city": req.city});

			city.attr("placeholder", req.city);
			city.val("");
			city.blur();
		});
	}

	function updateUnit(that) {

		if ($(that).is(":checked")) {
			req.unit = "imperial";
		} else {
			req.unit = "metric";
		}

		weatherRequest(req);
		
		chrome.storage.local.set({"weather_unit": req.unit});
	}

	//automatise la meteo
	//demande la geoloc et enleve l'option city
	function updateLocation(that) {

		if ($(that).is(":checked")) {

			navigator.geolocation.getCurrentPosition((pos) => {

				req.geol = [pos.coords.latitude, pos.coords.longitude];
				chrome.storage.local.set({"weather_geol": req.geol});

				weatherRequest(req);

				$(".change_weather .city").css("display", "none");
			});

		} else {

			chrome.storage.local.remove("weather_geol");
			req.geol = false;
			$(".change_weather .city").css("display", "block");
		}
	}
	


	//TOUT LES EVENTS

	$(".submitw_city").click(function() {
		updateCity();
	});

	$('.change_weather input[name="city"]').on('keypress', function(e) {
		if (e.which === 13) updateCity();
	});

	$(".units input").change(function() {
		updateUnit(this);
	});


	$(".w_auto input").change(function() {
		updateLocation(this);
	});

	$(".lang").change(function() {
		req.lang = this.value;
		weatherRequest(req);
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


/* 
BACKGROUND
*/


function initBackground() {

	chrome.storage.local.get(null, (data) => {

		var image = data.background_image;
		var type = data.background_type;
		var blur = data.background_blur;
		
		//type un peu useless, mais c'est un ancetre alors je le garde ok
		if (type) {
			$('.background').css("background-image", 'url(' + image + ')');
		} else {
			//sans rien l'image de base est utilisé
			$('.background').css("background-image", 'url("src/images/avi-richards-beach.jpg")');
		}

		//ensuite on blur
		$("input[name='background_blur']").val(data.background_blur);
		blurThis(data.background_blur);
	});	
}


// render the image in our view
// ces commentaire anglais ne veulent pas dire que j'ai copié collé ok
function renderImage(file) {

	// generate a new FileReader object
	var reader = new FileReader();

	// inject an image with the src url
	reader.onload = function(event) {
		url = event.target.result;

		chrome.storage.local.set({"background_image": url});
		chrome.storage.local.set({"background_type": "custom"});

		$('.background').css("background-image", 'url(' + url + ')');

		//enleve le dynamic si jamais
		$("div.dynamic_bg input").prop("checked", false);

		//enleve la selection default bg si jamais
		$(".imgpreview").removeClass("selected");
	}

	// when the file is read it triggers the onload event above.
	reader.readAsDataURL(file);
}


function blurThis(val) {


		var isDark = $("body").attr("class");
		
		if (isDark === "dark") {
			$('.background').css("filter", 'blur(' + val + 'px) brightness(75%)');
		} else {
			$('.background').css("filter", 'blur(' + val + 'px)');
		}

		chrome.storage.local.set({"background_blur": val});
}


// handle input changes
$(".change_background input[name='background_file']").change(function() {
	renderImage(this.files[0]);
});

// handle input changes
$(".change_background input[name='background_blur']").change(function() {
	blurThis(this.value);
});


function defaultBg() {

	var bgTimeout, clone;

	$(".choosable_backgrounds").mouseenter(function() {

		//clone le background quand on entre dans choosable background
		clone = $(".background").clone();
		$(clone).attr("class", "background tempbackground");
		$("body").prepend($(clone));
	});

	//pour preview le default background
	$(".imgpreview img").mouseenter(function() {


		var source = this.attributes.src.value;

		bgTimeout = setTimeout(function() {

			//met le preview au clone
			//timeout de 300 pour pas que ça se fasse accidentellement
			//rend le 1er bg à 0 opacité pour avoir une transition
			$(".tempbackground").css("background-image", "url('" + source + "')");
			$(".background").not(".tempbackground").css("opacity", 0);

		}, 300);
	});


	//pour arreter de preview le default background
	$(".imgpreview img").mouseleave(function() {
		clearTimeout(bgTimeout);
	});

	
	$(".choosable_backgrounds").mouseleave(function() {
		clearTimeout(bgTimeout);
		
		//reaffiche le premier bg
		//suppr le 2e bg quand on sort
		$(".background").css("opacity", 1);
		setTimeout(function() {
			$(".tempbackground").remove();
		}, 200);
	});


	//pour choisir un default background
	$(".imgpreview img").click(function() {

		//enleve le dynamic si jamais
		$("div.dynamic_bg input").prop("checked", false);

		//enleve selected a tout le monde et l'ajoute au bon
		$(".imgpreview").removeClass("selected");
		$(this)[0].parentElement.setAttribute("class", "imgpreview selected");

		//prend le src de la preview et l'applique au background
		var source = this.attributes.src.value;
		$(".background").css("background-image", "url('" + source + "')");

		//sauve la source

		chrome.storage.local.set({"background_image": source});
		chrome.storage.local.set({"background_type": "default"});
	});
}

defaultBg();


//quand on active le bg dynamique
$("div.dynamic_bg input").change(function() {

	if (this.checked) {

		var unsplash = "https://source.unsplash.com/collection/4933370/1920x1200/daily";

		$(".background").css("background-image", "url('" + unsplash + "')");

		chrome.storage.local.set({"background_image": unsplash});
		chrome.storage.local.set({"background_type": "dynamic"});

		//enleve la selection default bg si jamais
		$(".imgpreview").removeClass("selected");

	} else {

		$(".background").css("background-image", 'url("src/images/background.jpg")');
		chrome.storage.local.set({"background_type": "default"});
	}
});






function darkmode(choix) {


	function isIOSwallpaper(dark) {

		var bgsrc = $(".background").css("background-image");
		var lbg =  'src/images/ios13wallpaper_l.jpg';
		var dbg = 'src/images/ios13wallpaper_d.jpg';

		if (dark) {

			$("#ios_wallpaper img").attr("src", dbg);

			if (bgsrc.includes(lbg)) {
				$(".background").css("background-image", "url(" + dbg + ")");
				chrome.storage.local.set({"background_image": dbg});
			}

		} else {

			$("#ios_wallpaper img").attr("src", lbg);

			if (bgsrc.includes(dbg)) {
				$(".background").css("background-image", "url(" + lbg + ")");
				chrome.storage.local.set({"background_image": lbg});
			}
		}
	}

	function addBlur(dark) {

		chrome.storage.local.get(null, (data) => {

			if (dark) {
				$(".background").css("filter", "blur(" + data.background_blur + "px) brightness(75%)");
			} else {
				$(".background").css("filter", "blur(" + data.background_blur + "px)");
			}
			
		});
	}

	function applyDark(add) {

		if (add) {

			$("body").addClass("dark");
			$(".bonjourr_logo").attr("src", 'src/images/bonjourrpopup_d.png');

			isIOSwallpaper(true);
			addBlur(true);

		} else {

			$("body").removeClass("dark");
			$(".bonjourr_logo").attr("src", 'src/images/bonjourrpopup.png');
		
			isIOSwallpaper(false);
			addBlur(false);
		}
	}

	function auto(blur) {

		var wAPI = JSON.parse(atob(localStorage.wLastState));
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

		chrome.storage.local.get(null, (data) => {

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
		});		
	}

	function changeDarkMode() {

		chrome.storage.local.get(null, (data) => {

			if (choix === "enable") {
				applyDark(true);
				chrome.storage.local.set({"dark": "enable"});
			}

			if (choix === "disable") {
				applyDark(false);
				chrome.storage.local.set({"dark": "disable"});
			}

			if (choix === "auto") {

				//prend l'heure et ajoute la classe si nuit
				auto();
				chrome.storage.local.set({"dark": "auto"});
			}
		});
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





function searchbar() {

	function activate(activated) {

		if (activated) {

			chrome.storage.local.set({"searchbar": true});

			//pour animer un peu
			$("#searchbar_option .param hr, .popup5 hr, .searchbar_container").css("display", "block");
			$("#choose_searchengine").css("display", 'flex');
			$(".searchbar_container").css("opacity", 1);
			
		} else {

			chrome.storage.local.set({"searchbar": false});

			//pour animer un peu
			$("#choose_searchengine, #searchbar_option hr, .popup5 hr").css("display", "none");
			$(".searchbar_container").css("opacity", 0);
			setTimeout(function() {
				$(".searchbar_container").css("display", "none");
			}, 200);
		}
	}

	function chooseSearchEngine(engine) {
		if (engine === "s_startpage") {
			$(".searchbar_container form").attr("action", 'https://www.startpage.com/do/dsearch?query=');
			$(".searchbar").attr("placeholder", 'Search Startpage');
		}
		else if (engine === "s_ddg") {
			$(".searchbar_container form").attr("action", 'https://duckduckgo.com/?q=');
			$(".searchbar").attr("placeholder", 'Search DuckDuckGo');
		}
		else if (engine === "s_ecosia") {
			$(".searchbar_container form").attr("action", 'https://www.ecosia.org/search?q=');
			$(".searchbar").attr("placeholder", 'Search Ecosia');
		}
		else if (engine === "s_google") {
			$(".searchbar_container form").attr("action", 'https://www.google.com/search');
			$(".searchbar").attr("placeholder", 'Search Google');
		}
		else if (engine === "s_yahoo") {
			$(".searchbar_container form").attr("action", 'https://search.yahoo.com/search?p=');
			$(".searchbar").attr("placeholder", 'Search Yahoo');
		}
		else if (engine === "s_bing") {
			$(".searchbar_container form").attr("action", 'https://www.bing.com/search?q=');
			$(".searchbar").attr("placeholder", 'Search Bing');
		}

		chrome.storage.local.set({"searchbar_engine": engine});

	}

	//init
	chrome.storage.local.get(null, (data) => {

		if (data.searchbar) {

			//display
			activate(true);

			if (data.searchbar_engine) {
				chooseSearchEngine(data.searchbar_engine);
			} else {
				chooseSearchEngine("s_startpage");
			}
		} else {
			activate(false);
		}
	});

	// Active ou désactive la search bar
	$(".activate_searchbar input").change(function() {
		activate($(this).is(":checked"));
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










//affiche les settings
$(".showSettings button").click(function() {

	$(this).toggleClass("shown");
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
	


function traduction() {
	var translator = $('html').translate({lang: "en", t: dict});
	
	chrome.storage.local.get(null, (data) => {

		//init
		translator.lang(data.lang);

		//selection de langue
		//localStorage + weather update + body trad
		$(".lang").change(function() {
			chrome.storage.local.set({"lang": this.value});
			translator.lang(this.value);
		});

		$(".popup .lang").change(function() {
			$(".settings .lang")[0].value = $(this)[0].value;

			//oua chui fatigué la
			popupButtonLang = ($(this)[0].value === "en" ? 1 : 0);
		});
	});
}




function actualizeStartupOptions() {

	chrome.storage.local.get(null, (data) => {


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
		if (data.weather_geol) {
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
		$(".activate_searchbar input")[0].value = data.searchbar;

		if (data.searchbar_engine) {
			$(".choose_search")[0].value = data.searchbar_engine;
		} else {
			$(".choose_search")[0].value = "s_startpage";
		}
		

		//langue
		if (data.lang) {
			$(".lang")[0].value = data.lang;
		} else {
			$(".lang")[0].value = "en";
		}
		
	});
			
}





function mobilecheck() {
  var check = false;
  (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
  return check;
};




$(document).ready(function() {

	//very first
	initBackground();
	darkmode();

	//sur la page principale
	clock();
	date();
	greetings();
	weather();
	searchbar();
	initblocks();
	showRemoveLink();

	//moins important, load après
	signature();
	introduction();
	actualizeStartupOptions();

	//toujours en dernier que tout le DOM soit chargé
	traduction();
});
