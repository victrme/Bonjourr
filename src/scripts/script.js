
//c'est juste pour debug le storage
function deleteBrowserStorage() {
	browser.storage.local.clear().then(() => {
		console.log("bien supprimé");
	});
}

//c'est juste pour debug le storage
function getBrowserStorage() {
	browser.storage.local.get().then((data) => {
		console.log(data);
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
//utilise simplement une boucle de appendBlock
function initblocks() {

	$(".linkblocks").empty();

	browser.storage.local.get().then((data) => {

		var lnk = data.links;

		if (lnk) {

			for (var i = 0; i < lnk.length; i++) {
				appendblock(lnk[i].title, lnk[i].url);
			}

		} else {

			//faire le truc de présentation des blocks
		}
	});
}

//rajoute l'html d'un bloc avec toute ses valeurs et events
function appendblock(title, url) {

	function getdomainroot(str) {
		var a = document.createElement('a');
		a.href = str;
		return a.hostname;
	}

	var bestIconUrl = "https://besticon-demo.herokuapp.com/icon?url=" + getdomainroot(url) + "&size=80..120..200";

	//le DOM du block
	var b = "<div class='block_parent'><div class='block' source='" + url + "'><div class='l_icon_wrap'><button class='remove'><img src='src/images/x.png' /></button><img class='l_icon' src='" + bestIconUrl + "'></div><p>" + title + "</p></div></div>";

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

		var time = (mobile ? 0 : 1000)

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

		browser.storage.local.get().then((data) => {

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
			browser.storage.local.set({"links": ejectIntruder(links)});
		});
	}


	//event de suppression de block
	//prend l'index du parent du .remove clické
	$(".linkblocks").on("click", ".remove", function() {
		
		var index = $(this).parent().parent().parent().index();
		(canRemove ? removeblock(index) : "");
	});
}

function filterUrl(str) {
	if (str.startsWith("http") || str.startsWith("https")) {
		return str;
	} else {
		return 	"http://" + str;
	}
}



function linkSubmission() {

	browser.storage.local.get().then((data) => {

		//append avec le titre, l'url ET l'index du bloc
		var title = $(".addlink input[name='title'").val();
		var url = filterUrl($(".addlink input[name='url'").val());

		if (url.length > 0) {

			appendblock(title, url);

			//creer un array de link
			var links = [{
				title: title,
				url: url
			}];

			//ajoute au debut de l'array les anciens links
			if (data.links) {
				for (var i = 0; i < data.links.length; i++) {
					links.unshift(data.links[i])
				}
			}
			
			browser.storage.local.set({links});

			//remet a zero les inputs
			$(".addlink input[name='title'").val("");
			$(".addlink input[name='url'").val("");
		}

	});

	
	
}

$('.addlink input[name="url"]').on('keypress', function(e) {

		if(e.which === 13){
			//disable
			$(this).attr("disabled", "disabled");

			linkSubmission();
			
			//reenable
			$(this).removeAttr("disabled");
		}
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

	//init la meteo avant que l'api charge
	//choisi la lang dans le storage si elle est changé
	var lang;
	browser.storage.local.get().then((data) => {
		lang = (changelang ? changelang : data.lang);
	});
	
	var l = localStorage.wLastState;
	(l ? dataHandling(JSON.parse(l)) : "");


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


	function dataHandling(data) {

		//pour la description et temperature
		//Rajoute une majuscule à la description
		var meteoStr = data.weather[0].description;
		meteoStr = meteoStr[0].toUpperCase() + meteoStr.slice(1);
		$(".w_desc_meteo").text(meteoStr + ".");



		//si c'est l'après midi (apres 13h), on enleve la partie temp max
		var dtemp, wtemp;
		var date = new Date();
		if (date.getHours() < 13) {

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


		//sauvegarde la derniere meteo
		localStorage.wLastState = JSON.stringify(data);
	}


	//Je préfère isoler la request et utiliser une autre fonction plus haute pour modifier les données
	function weatherRequest(city, unit) {

		//a changer
		api = '7c541caef5fc7467fc7267e2f75649a9';

		var request_w = new XMLHttpRequest();
		request_w.open('GET', 'https://api.openweathermap.org/data/2.5/weather?q='
			+ city
			+ '&units='
			+ unit
			+ '&appid='
			+ api
			+ '&lang='
			+ lang, true);

		request_w.onload = function() {
			
			var data = JSON.parse(this.response);

			if (request_w.status >= 200 && request_w.status < 400) {

				//la réponse est utilisé dans la fonction plus haute
				dataHandling(data);					

			} else {
				console.log(request_w.status);
			}
		}

		request_w.send();
	}
	

	//quand on accepte la nouvelle ville
	//req la meteo avec la ville et l'enregistre
	function updateWeatherCity() {
		var city = $(".change_weather input[name='city']");
		var val = city.val();

		browser.storage.local.get().then((data) => {

			weatherRequest(val, data.weather_unit);
			
			browser.storage.local.set({"weather_city": val});

			city.attr("placeholder", val);
			city.val("");
			city.blur();
		});
	}

	
	$(".submitw_city").click(function() {
		updateWeatherCity();
	});

	$('.change_weather input[name="city"]').on('keypress', function(e) {

		if(e.which === 13){
			//disable
			$(this).attr("disabled", "disabled");

			updateWeatherCity();
			
			//reenable
			$(this).removeAttr("disabled");
		}
	});


	//req la meteo avec metric et l'enregistre
	$(".units input").change(function() {

		if ($(".units input").is(":checked")) {
			var unit = "imperial";
		} else {
			var unit = "metric";
		}

		browser.storage.local.get().then((data) => {

			weatherRequest(data.weather_city, unit);
			browser.storage.local.set({"weather_unit": unit});
		});
		
	});



	//initialise a Paris + Metric
	//si le storage existe, lance avec le storage

	browser.storage.local.get().then((data) => {

		var city = data.weather_city;
		var unit = data.weather_unit;

		if (!city) {
			weatherRequest("Paris", "metric");

			browser.storage.local.set({"weather_city": "paris"});
			browser.storage.local.set({"weather_unit": "metric"});
		}
		else {
			weatherRequest(city, unit);
		}

		//affiche la ville dans l'input de ville
		$(".change_weather input[name='city']").attr("placeholder", city);

		//check imperial
		if (unit && unit === "imperial") {
			$(".switch input").checked = true;
		}
	});

	
}



/* 
BACKGROUND
*/


function initBackground() {

	browser.storage.local.get().then((data) => {

		var image = data.background_image;
		var type = data.background_type;
		var blur = data.background_blur;

		
		//default = les images pré définies
		if (type === "default") {

			$('.background').css("background-image", 'url(' + image + ')');
		}
		//custom c'est avec le RenderFile
		else if (type === "custom") {

			$('.change_background .bg_preview').css("visibility", "visible");
			$('.change_background .custom_bg_preview').attr("src", image);
			$('.background').css("background-image", "url('" + image + "')");
		}
		//dynamic ajoute simplement l'url unsplash
		else if (type === "dynamic") {

			$(".background").css("background-image", "url('" + image + "')");
			$("div.dynamic_bg input").prop("checked", true);
		}
		//sans rien l'image de base est utilisé
		else {
			$('.background').css("background-image", 'url("src/images/background.jpg")');
		}

		//ensuite on blur
		$("input[name='background_blur']").val(data.background_blur);
		blurThis(data.background_blur);
	});
	
}


// render the image in our view
function renderImage(file) {

	// generate a new FileReader object
	var reader = new FileReader();

	// inject an image with the src url
	reader.onload = function(event) {
		url = event.target.result;

		/*var background_image = url;
		var background_type = "custom";*/

		browser.storage.local.set({"background_image": url});
		browser.storage.local.set({"background_type": "custom"});

		$('.change_background .custom_bg_preview').attr("src", url);
		$('.background').css("background-image", 'url(' + url + ')');

		//enleve le dynamic si jamais
		$("div.dynamic_bg input").prop("checked", false);
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

		browser.storage.local.set({"background_blur": val});
}


// handle input changes
$(".change_background input[name='background_file']").change(function() {
	renderImage(this.files[0]);
});



// handle input changes
$(".change_background input[name='background_blur']").change(function() {
	blurThis(this.value);
});

//pour preview le default background
$(".imgpreview img").mouseenter(function() {

	var source = this.attributes.src.value;
	$(".background").css("background-image", "url('" + source + "')");
});


//pour arreter de preview le default background
$(".imgpreview img").mouseleave(function() {

	initBackground();
});



//pour choisir un default background
var th;
$(".imgpreview img").click(function() {

	//enleve le dynamic si jamais
	$("div.dynamic_bg input").prop("checked", false);

	//enleve selected a tout le monde et l'ajoute au bon
	$(".imgpreview").removeClass("selected");
	th = $(this)[0].parentElement.setAttribute("class", "imgpreview selected");

	//prend le src de la preview et l'applique au background
	var source = this.attributes.src.value;
	$(".background").css("background-image", "url('" + source + "')");

	//sauve la source

	browser.storage.local.set({"background_image": source});
	browser.storage.local.set({"background_type": "default"});
});


//quand on active le bg dynamique
$("div.dynamic_bg input").change(function() {

	if (this.checked) {

		var unsplash = "https://source.unsplash.com/collection/4933370/1920x1200/daily";

		$(".background").css("background-image", "url('" + unsplash + "')");

		browser.storage.local.set({"background_image": unsplash});
		browser.storage.local.set({"background_type": "dynamic"});

	} else {

		$(".background").css("background-image", 'url("src/images/background.jpg")');
		
		browser.storage.local.set({"background_type": "default"});
	}
});






function darkmode(choix) {

	

	function applyDark(add) {

		//prend le filter du background
		//pour appliquer les 80% brightness en sérénité
		var bgfilter = $(".background").css("filter");
		var bgblur = $("input[name='background_blur']").val();

		if (add) {
			$("body").addClass("dark");
			$("#ios_wallpaper img").attr("src", 'src/images/ios13wallpaper_d.jpg');
			$(".background").css("filter", bgfilter + " brightness(75%)");
		} else {
			$("body").removeClass("dark");
			$("#ios_wallpaper img").attr("src", 'src/images/ios13wallpaper_l.jpg');
			$(".background").css("filter", "blur(" + bgblur + "px)");
		}
	}

	//darkmode automatique
	function auto() {

		var wAPI = JSON.parse(localStorage.wLastState);
		var sunrise = new Date(wAPI.sys.sunrise * 1000);
		var sunset = new Date(wAPI.sys.sunset * 1000);
		var hr = new Date();

		sunrise = sunrise.getHours() + 1;
		sunset = sunset.getHours() + 1;
		hr = hr.getHours();

		if (hr < sunrise || hr > sunset) {
			applyDark(true);
		} else {
			applyDark(false);
		}
	}

	function initDarkMode() {

		browser.storage.local.get().then((data) => {

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

			$(".dark_mode_option select.theme").val(dd);
		});
		
	}


	function changeDarkMode() {
		if (choix === "enable") {
			applyDark(true);
			browser.storage.local.set({"dark": "enable"});
		}

		if (choix === "disable") {
			applyDark(false);
			browser.storage.local.set({"dark": "disable"});
		}

		if (choix === "auto") {

			//prend l'heure et ajoute la classe si nuit
			auto();
			browser.storage.local.set({"dark": "auto"});
		}
	}

	if (choix) {
		changeDarkMode();
	} else {
		initDarkMode();
	}
}

$(".dark_mode_option select.theme").change(function() {
	darkmode(this.value);
});








// Active ou désactive la search bar
$(".activate_searchbar input").change(function() {
		if ($(".activate_searchbar input").is(":checked")) {
			$("#searchbar_container, #searchbar_option hr, #choose_searchengine").css("display", "block");
			$("#choose_searchengine").css("display", "flex");
		}

		else {
			$("#searchbar_container, #searchbar_option hr, #choose_searchengine").css("display", "none");
		}
});

// Change le moteur de recherche de la search bar selon le select .choose_search
$(".choose_search").change(function() {
	if (this.value === "s_startpage") {
		$("#searchbar_container form").attr("action", 'https://www.startpage.com/do/dsearch?query=');
		$(".searchbar").attr("placeholder", 'Search Startpage');
	}
	else if (this.value === "s_ddg") {
		$("#searchbar_container form").attr("action", 'https://duckduckgo.com/?q=');
		$(".searchbar").attr("placeholder", 'Search DuckDuckGo');
	}
	else if (this.value === "s_ecosia") {
		$("#searchbar_container form").attr("action", 'https://www.ecosia.org/search?q=');
		$(".searchbar").attr("placeholder", 'Search Ecosia');
	}
	else if (this.value === "s_google") {
		$("#searchbar_container form").attr("action", 'https://www.google.com/search');
		$(".searchbar").attr("placeholder", 'Search Google');
	}
	else if (this.value === "s_yahoo") {
		$("#searchbar_container form").attr("action", 'https://search.yahoo.com/search?p=');
		$(".searchbar").attr("placeholder", 'Search Yahoo');
	}
	else if (this.value === "s_bing") {
		$("#searchbar_container form").attr("action", 'https://www.bing.com/search?q=');
		$(".searchbar").attr("placeholder", 'Search Bing');
	}
});








//affiche les settings
$(".showSettings button").click(function() {
	$(this).toggleClass("shown");
	$(".settings").toggleClass("shown");
	$(".interface").toggleClass("pushed");
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
	
	browser.storage.local.get().then((data) => {

		//init
		translator.lang(data.lang);
		$(".lang").value = data.lang;


		//selection de langue
		//localStorage + weather update + body trad
		$(".lang").change(function() {
			
			browser.storage.local.set({"lang": this.value});
			translator.lang(this.value);
			weather(this.value);
		});
	});
}





function mobilecheck() {
  var check = false;
  (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
  return check;
};




$(document).ready(function() {
	initBackground();
	showRemoveLink();
	initblocks();
	weather();
	date();
	clock();
	greetings();
	signature();
	traduction();
	darkmode();
});
