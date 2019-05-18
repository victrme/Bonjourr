

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
	var t = setTimeout(clock, 999);
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
			return false;
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

	function getdomainroot(url) {
		var a = document.createElement('a');
		a.href = url;
		return a.hostname;
	}

	var googleIconUrl = "https://www.google.com/s2/favicons?domain=" + getdomainroot(url);

	var b = "<div class='block'><a href='" + url + "'><img class='l_icon' src='" + googleIconUrl + "'><p>" + title + "</p><button class='remove' onclick='removeblock(" + index + ")'>&times;</button></a><div>";

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

//d'abord enleve le bloc selon son index (nth-child si ya plus d'1 bloc)
//ensuite pop le storage à l'index du bloc
//et réinitialise les blocs
function removeblock(index) {

	var links = storage("get");
	var selec;

	(links.length <= 1 ? selec = ".linkblocks:nth-child(" + index + ")" : ".linkblocks:first-child")
	$(selec).remove();

	

	links.pop(index);
	localStorage.links = JSON.stringify(links);



	initblocks();
}

//quand on rajoute un link
//append avec le titre, l'url ET l'index du bloc
//rajoute ces données au storage
//remet a zero les inputs
$(".submitlink").click(function() {
	var title = $(".addlink input[name='title'").val();
	var url = $(".addlink input[name='url'").val();

	appendblock(title, url, storage("get").length);

	storage("save", title, url);

	$(".addlink input[name='title'").val("");
	$(".addlink input[name='url'").val("");
});


function date() {
	var d = new Date();
	d.getDay();

	var days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
	var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];

	//la date defini l'index dans la liste des jours et mois pour l'afficher en toute lettres
	$(".date span").text(days[d.getDay()] + " " + d.getDate() + " " + months[d.getMonth()]);
}




function weather() {


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

		var desc = '<span>' + data.weather[0].description + '</span>. It is <span class="w_temp"></span> currently.'
		$(".w_description").html(desc);
		$(".w_temp").text(Math.floor(data.main.temp) + '°');
		

		//pour l'icone
		var dOrN = dayOrNight(data.sys.sunset, data.sys.sunrise);
		var wId = imgId(data.weather[0].id);

		$(".w_icon").attr("src", "src/icons/weather/" + dOrN + "/" + wId + ".png");
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
			+ navigator.language, true);

		request_w.onload = function() {
			
			var data = JSON.parse(this.response);

			if (request_w.status >= 200 && request_w.status < 400) {

				//la réponse est utilisé dans la fonction plus haute
				dataHandling(data);					

			} else {
				console.log('error');
			}
		}

		request_w.send();
	}
	



	//quand on accepte la nouvelle ville
	//req la meteo avec la ville et l'enregistre
	$(".submitw_city").click(function() {
		var city = $(".change_weather input[name='city']").val();

		weatherRequest(city, localStorage.wUnit);
		localStorage.wCity = city;
	});

	//on choisi metric
	//req la meteo avec metric et l'enregistre
	$(".submitw_metric").click(function() {

		weatherRequest(localStorage.wCity, "metric");
		localStorage.wUnit = "metric";
	});

	//on choisi imperial
	//req la meteo avec imperial et l'enregistre
	$(".submitw_imperial").click(function() {

		weatherRequest(localStorage.wCity, "imperial");
		localStorage.wUnit = "imperial";
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
	$(".change_weather input[name='city']").val(localStorage.wCity);
}


//affiche le bouton pour suppr le link
function showRemoveLink() {

	var remTimeout;

	//utilise on pour le dom rajouté après le document.load
	$(".linkblocks").on("mouseenter", ".block a", function(e) {

		remTimeout = setTimeout(function() {
			//console.log(e.currentTarget.children[2]);
			e.currentTarget.children[2].setAttribute("style", "display: block");
		}, 500);
	});

	$(".linkblocks").on("mouseleave", ".block a", function(e) {

		clearTimeout(remTimeout);
		e.currentTarget.children[2].setAttribute("style", "display: none");
	});
}


//affiche les settings (temporaire)
$(".showSettings button").click(function() {
	$(".settings").toggle();
});





$(document).ready(function() {

	showRemoveLink();
	initblocks();
	weather();
	date();
	clock();
	greetings();
});