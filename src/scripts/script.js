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










//localStorage handling basique
//get retourne le LS parsed
//save push le l'objet a sauvegarder dans la liste
//remove est dans une autre fonction (pk je sais pas)
function storage(state, title, url) {
	if (state === "get") {

		if (localStorage.links) {
			return JSON.parse(localStorage.links);
		}
		else {
			//retourne des sites de base pour faire beau
			return [["Youtube", "https://youtube.com"], ["Wikipedia", "https://Wikipedia.org"], ["Startpage", "https://www.startpage.com/"], ["Reddit", "https://reddit.com"], ["victor-azevedo.me", "https://victor-azevedo.me"]];
		}
		
	}

	if (state === "save") {

		if (localStorage.links) {
			var arr = JSON.parse(localStorage.links);

			var topush = [title, url];
			arr.push(topush);

			localStorage.links = JSON.stringify(arr);
		}
		else {
			localStorage.links = JSON.stringify([[title, url]]);
		}
	}
}


//rajoute l'html d'un bloc avec toute ses valeurs et events
function appendblock(title, url, index) {

	function getdomainroot(str) {
		var a = document.createElement('a');
		a.href = str;
		return a.hostname;
	}

	var bestIconUrl = "https://besticon-demo.herokuapp.com/icon?url=" + getdomainroot(url) + "&size=80..120..200";

	//le DOM du block
	var b = "<div class='block_parent'><div class='block'><div class='l_icon_wrap'><button class='remove'><img src='src/images/x.png' /></button><a href='" + url + "'><img class='l_icon' src='" + bestIconUrl + "'></a></div><p>" + title + "</p></div></div>";

	$(".linkblocks").append(b);
}

//initialise les blocs en fonction du storage
//utilise simplement une boucle de appendBlock
function initblocks() {

	$(".linkblocks").empty();

	var links = storage("get");

	if (links) {

		for (var i = 0; i < links.length; i++) {
		
			appendblock(links[i][0], links[i][1], i);
		}
	}
}






//affiche le bouton pour suppr le link
function showRemoveLink() {

	//envoie l'url du a dans un href temporaire
	//ou inversement
	function hrefHandling(state) {
		$(".block a").each(function() {
			
			if (state === "disable") {
				var h = $(this).attr("href");
				$(this).attr("hreftemp", h);
				$(this).removeAttr("href");
			}
			if (state === "enable") {
				var h = $(this).attr("hreftemp");
				$(this).attr("href", h);
				$(this).removeAttr("hreftemp");
			}
		});
	}

	var remTimeout;
	var canRemove = false;


	//utilise on pour le dom rajouté après le document.load
	//si la souris appuie sur un block
	$(".linkblocks").on("mousedown", ".block", function(e) {

		//enleve le href, rejoute les classes
		//focus linkblocks et active le remove
		remTimeout = setTimeout(function() {

			hrefHandling("disable");

			$(".block").find(".remove").addClass("visible");
			$(".block").addClass("wiggly");
			$(".linkblocks").focus();

			canRemove = true;

		}, 1000);
	});

	//si linkblocks perd le focus
	$(".linkblocks").on("focusout", ".block", function(e) {

		//enleve le timeout si <1000ms
		//rajoute le href, enleve les classes
		//désactive le remove
		clearTimeout(remTimeout);

		hrefHandling("enable");

		$(".block").find(".remove").removeClass("visible");
		$(".block").removeClass("wiggly");

		canRemove = false;
	});




	function removeblock(i) {

		//enleve le html du block
		var block = $(".linkblocks")[0].children[i];
		$(block).addClass("removed");
		
		setTimeout(function() {
			$(block).remove();
		}, 200);
		
		
		//coupe en 2 et concat sans le link a remove
		function ejectIntruder(arr) {
			var temp0 = arr.slice(i + 1);
			var temp1 = links.slice(0, i);

			return temp1.concat(temp0);
		}
		
		var links = storage("get");
		localStorage.links = JSON.stringify(ejectIntruder(links));
	}


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


//append avec le titre, l'url ET l'index du bloc
//rajoute ces données au storage
//remet a zero les inputs
function linkSubmission() {

	var title = $(".addlink input[name='title'").val();
	var url = filterUrl($(".addlink input[name='url'").val());
	var index = storage("get").length;

	appendblock(title, url, index);

	storage("save", title, url);

	$(".addlink input[name='title'").val("");
	$(".addlink input[name='url'").val("");
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














function weather(changelang) {

	//init la meteo avant que l'api charge
	var l = localStorage.wLastState;
	var lang = (changelang ? changelang : localStorage.lang);
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
		else {
			console.log(id);
		}
	}


	function dataHandling(data) {


		//pour la description et temperature
		$(".w_desc_meteo").text(data.weather[0].description + ". ");
		$(".w_desc_temp").text(Math.floor(data.main.temp) + '° ');
	

		//pour l'icone
		var d_n = dayOrNight(data.sys.sunset, data.sys.sunrise);
		var weather_id = imgId(data.weather[0].id);
 		var icon_src = "src/icons/weather/" + d_n + "/" + weather_id + ".png";

		$(".w_icon").attr("src", icon_src);


		//sauvegarde la derniere meteo
		localStorage.wLastState = JSON.stringify(data);
	}


	//Je préfère isoler la request et utiliser une autre fonction plus haute pour modifier les données
	function weatherRequest(city, unit, api) {

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

		weatherRequest(val, localStorage.wUnit);
		localStorage.wCity = val;
		city.attr("placeholder", val);
		city.val("");
		city.blur();
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

		weatherRequest(localStorage.wCity, unit);
		localStorage.wUnit = unit;
	});



	//initialise a Paris + Metric
	//si le storage existe, lance avec le storage

	var c = localStorage.wCity;
	var u = localStorage.wUnit;

	if (!c) {
		weatherRequest("Paris", "metric");

		localStorage.wCity = "paris";
		localStorage.wUnit = "metric";
	}
	else {
		weatherRequest(c, u);
	}

	//affiche la ville dans l'input de ville
	$(".change_weather input[name='city']").attr("placeholder", localStorage.wCity);

	//check imperial
	if (u && u === "imperial") {
		$(".switch input").checked = true;
	}
}






// render the image in our view
function renderImage(file) {

	// generate a new FileReader object
	var reader = new FileReader();

	// inject an image with the src url
	reader.onload = function(event) {
		url = event.target.result
		localStorage.background = url;
		$('.change_background .bg_preview').attr("src", url);
		$('.background').css("background-image", 'url(' + localStorage.background + ')');
	}

	// when the file is read it triggers the onload event above.
	reader.readAsDataURL(file);
}

// handle input changes
$(".change_background input[name='background_file']").change(function() {

	renderImage(this.files[0]);
	console.log(this.files);
});





function initBackground() {

	var ls = localStorage.background;

	//si le background est custom
	//change le bg_preview et le background meme
	//sinon utilise celui de base
	if (ls) {

		//si c'est en base64 (donc custom)
		if (ls.startsWith("data")) {
			$('.change_background .bg_preview').attr("src", ls);
			$('.change_background .bg_preview').css("visibility", "visible");
		}


		$('.background').css("background-image", 'url(' + ls + ')');

		bg_blur(localStorage.background_blur);
		
	} else {
		$('.change_background .bg_preview').css("visibility", "visible");
		$('.change_background .bg_preview').attr("src", "src/images/background.jpg");
		$('.background').css("background-image", 'url("src/images/background.jpg")');
	}
}


function bg_blur(val) {
	$('.background').css("filter", 'blur(' + val + 'px)');
	localStorage.background_blur = val;
}

// handle input changes
$(".change_background input[name='background_blur']").change(function() {

	bg_blur(this.value);
});


//affiche les settings (temporaire)
$(".showSettings button").click(function() {
	$(this).toggleClass("shown");
	$(".settings").toggleClass("shown");
	$(".interface").toggleClass("pushed");
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

var th;
//pour choisir un default background
$(".imgpreview img").click(function() {


	$(".imgpreview").removeClass("selected");
	th = $(this)[0].parentElement.setAttribute("class", "imgpreview selected");

	var source = this.attributes.src.value;
	$(".background").css("background-image", "url('" + source + "')");
	localStorage.background = source;
});






// Signature aléatoire
function signature() {
	var v = "<a href='https://victor-azevedo.me/'>Victor Azevedo</a>";
	var t = "<a href='https://tahoe.be'>Tahoe Beetschen</a>";

    var r = Math.floor(Math.random() * 2);

    if (r % 2 === 0) {
    	$('.signature .rand').append(v + " & " + t);
	} else {
		$('.signature .rand').append(t + " & " + v);
	}
}
	


function traduction() {
	var translator = $('html').translate({lang: "en", t: dict});
	
	//init
	translator.lang(localStorage.lang);
	$(".lang").value = localStorage.lang;


	//selection de langue
	//localStorage + weather update + body trad
	$(".lang").change(function() {
		
		localStorage.lang = this.value;
		translator.lang(this.value);
		weather(this.value);
	});
}




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
});
