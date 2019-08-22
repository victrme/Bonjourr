var translator = $('html').translate({lang: "en", t: dict});
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

var ccode = [{"Code": "AF", "Name": "Afghanistan"},{"Code": "AX", "Name": "\u00c5land Islands"},{"Code": "AL", "Name": "Albania"},{"Code": "DZ", "Name": "Algeria"},{"Code": "AS", "Name": "American Samoa"},{"Code": "AD", "Name": "Andorra"},{"Code": "AO", "Name": "Angola"},{"Code": "AI", "Name": "Anguilla"},{"Code": "AQ", "Name": "Antarctica"},{"Code": "AG", "Name": "Antigua and Barbuda"},{"Code": "AR", "Name": "Argentina"},{"Code": "AM", "Name": "Armenia"},{"Code": "AW", "Name": "Aruba"},{"Code": "AU", "Name": "Australia"},{"Code": "AT", "Name": "Austria"},{"Code": "AZ", "Name": "Azerbaijan"},{"Code": "BS", "Name": "Bahamas"},{"Code": "BH", "Name": "Bahrain"},{"Code": "BD", "Name": "Bangladesh"},{"Code": "BB", "Name": "Barbados"},{"Code": "BY", "Name": "Belarus"},{"Code": "BE", "Name": "Belgium"},{"Code": "BZ", "Name": "Belize"},{"Code": "BJ", "Name": "Benin"},{"Code": "BM", "Name": "Bermuda"},{"Code": "BT", "Name": "Bhutan"},{"Code": "BO", "Name": "Bolivia, Plurinational State of"},{"Code": "BQ", "Name": "Bonaire, Sint Eustatius and Saba"},{"Code": "BA", "Name": "Bosnia and Herzegovina"},{"Code": "BW", "Name": "Botswana"},{"Code": "BV", "Name": "Bouvet Island"},{"Code": "BR", "Name": "Brazil"},{"Code": "IO", "Name": "British Indian Ocean Territory"},{"Code": "BN", "Name": "Brunei Darussalam"},{"Code": "BG", "Name": "Bulgaria"},{"Code": "BF", "Name": "Burkina Faso"},{"Code": "BI", "Name": "Burundi"},{"Code": "KH", "Name": "Cambodia"},{"Code": "CM", "Name": "Cameroon"},{"Code": "CA", "Name": "Canada"},{"Code": "CV", "Name": "Cape Verde"},{"Code": "KY", "Name": "Cayman Islands"},{"Code": "CF", "Name": "Central African Republic"},{"Code": "TD", "Name": "Chad"},{"Code": "CL", "Name": "Chile"},{"Code": "CN", "Name": "China"},{"Code": "CX", "Name": "Christmas Island"},{"Code": "CC", "Name": "Cocos (Keeling) Islands"},{"Code": "CO", "Name": "Colombia"},{"Code": "KM", "Name": "Comoros"},{"Code": "CG", "Name": "Congo"},{"Code": "CD", "Name": "Congo, the Democratic Republic of the"},{"Code": "CK", "Name": "Cook Islands"},{"Code": "CR", "Name": "Costa Rica"},{"Code": "CI", "Name": "C\u00f4te d'Ivoire"},{"Code": "HR", "Name": "Croatia"},{"Code": "CU", "Name": "Cuba"},{"Code": "CW", "Name": "Cura\u00e7ao"},{"Code": "CY", "Name": "Cyprus"},{"Code": "CZ", "Name": "Czech Republic"},{"Code": "DK", "Name": "Denmark"},{"Code": "DJ", "Name": "Djibouti"},{"Code": "DM", "Name": "Dominica"},{"Code": "DO", "Name": "Dominican Republic"},{"Code": "EC", "Name": "Ecuador"},{"Code": "EG", "Name": "Egypt"},{"Code": "SV", "Name": "El Salvador"},{"Code": "GQ", "Name": "Equatorial Guinea"},{"Code": "ER", "Name": "Eritrea"},{"Code": "EE", "Name": "Estonia"},{"Code": "ET", "Name": "Ethiopia"},{"Code": "FK", "Name": "Falkland Islands (Malvinas)"},{"Code": "FO", "Name": "Faroe Islands"},{"Code": "FJ", "Name": "Fiji"},{"Code": "FI", "Name": "Finland"},{"Code": "FR", "Name": "France"},{"Code": "GF", "Name": "French Guiana"},{"Code": "PF", "Name": "French Polynesia"},{"Code": "TF", "Name": "French Southern Territories"},{"Code": "GA", "Name": "Gabon"},{"Code": "GM", "Name": "Gambia"},{"Code": "GE", "Name": "Georgia"},{"Code": "DE", "Name": "Germany"},{"Code": "GH", "Name": "Ghana"},{"Code": "GI", "Name": "Gibraltar"},{"Code": "GR", "Name": "Greece"},{"Code": "GL", "Name": "Greenland"},{"Code": "GD", "Name": "Grenada"},{"Code": "GP", "Name": "Guadeloupe"},{"Code": "GU", "Name": "Guam"},{"Code": "GT", "Name": "Guatemala"},{"Code": "GG", "Name": "Guernsey"},{"Code": "GN", "Name": "Guinea"},{"Code": "GW", "Name": "Guinea-Bissau"},{"Code": "GY", "Name": "Guyana"},{"Code": "HT", "Name": "Haiti"},{"Code": "HM", "Name": "Heard Island and McDonald Islands"},{"Code": "VA", "Name": "Holy See (Vatican City State)"},{"Code": "HN", "Name": "Honduras"},{"Code": "HK", "Name": "Hong Kong"},{"Code": "HU", "Name": "Hungary"},{"Code": "IS", "Name": "Iceland"},{"Code": "IN", "Name": "India"},{"Code": "ID", "Name": "Indonesia"},{"Code": "IR", "Name": "Iran, Islamic Republic of"},{"Code": "IQ", "Name": "Iraq"},{"Code": "IE", "Name": "Ireland"},{"Code": "IM", "Name": "Isle of Man"},{"Code": "IL", "Name": "Israel"},{"Code": "IT", "Name": "Italy"},{"Code": "JM", "Name": "Jamaica"},{"Code": "JP", "Name": "Japan"},{"Code": "JE", "Name": "Jersey"},{"Code": "JO", "Name": "Jordan"},{"Code": "KZ", "Name": "Kazakhstan"},{"Code": "KE", "Name": "Kenya"},{"Code": "KI", "Name": "Kiribati"},{"Code": "KP", "Name": "Korea, Democratic People's Republic of"},{"Code": "KR", "Name": "Korea, Republic of"},{"Code": "KW", "Name": "Kuwait"},{"Code": "KG", "Name": "Kyrgyzstan"},{"Code": "LA", "Name": "Lao People's Democratic Republic"},{"Code": "LV", "Name": "Latvia"},{"Code": "LB", "Name": "Lebanon"},{"Code": "LS", "Name": "Lesotho"},{"Code": "LR", "Name": "Liberia"},{"Code": "LY", "Name": "Libya"},{"Code": "LI", "Name": "Liechtenstein"},{"Code": "LT", "Name": "Lithuania"},{"Code": "LU", "Name": "Luxembourg"},{"Code": "MO", "Name": "Macao"},{"Code": "MK", "Name": "Macedonia, the Former Yugoslav Republic of"},{"Code": "MG", "Name": "Madagascar"},{"Code": "MW", "Name": "Malawi"},{"Code": "MY", "Name": "Malaysia"},{"Code": "MV", "Name": "Maldives"},{"Code": "ML", "Name": "Mali"},{"Code": "MT", "Name": "Malta"},{"Code": "MH", "Name": "Marshall Islands"},{"Code": "MQ", "Name": "Martinique"},{"Code": "MR", "Name": "Mauritania"},{"Code": "MU", "Name": "Mauritius"},{"Code": "YT", "Name": "Mayotte"},{"Code": "MX", "Name": "Mexico"},{"Code": "FM", "Name": "Micronesia, Federated States of"},{"Code": "MD", "Name": "Moldova, Republic of"},{"Code": "MC", "Name": "Monaco"},{"Code": "MN", "Name": "Mongolia"},{"Code": "ME", "Name": "Montenegro"},{"Code": "MS", "Name": "Montserrat"},{"Code": "MA", "Name": "Morocco"},{"Code": "MZ", "Name": "Mozambique"},{"Code": "MM", "Name": "Myanmar"},{"Code": "NA", "Name": "Namibia"},{"Code": "NR", "Name": "Nauru"},{"Code": "NP", "Name": "Nepal"},{"Code": "NL", "Name": "Netherlands"},{"Code": "NC", "Name": "New Caledonia"},{"Code": "NZ", "Name": "New Zealand"},{"Code": "NI", "Name": "Nicaragua"},{"Code": "NE", "Name": "Niger"},{"Code": "NG", "Name": "Nigeria"},{"Code": "NU", "Name": "Niue"},{"Code": "NF", "Name": "Norfolk Island"},{"Code": "MP", "Name": "Northern Mariana Islands"},{"Code": "NO", "Name": "Norway"},{"Code": "OM", "Name": "Oman"},{"Code": "PK", "Name": "Pakistan"},{"Code": "PW", "Name": "Palau"},{"Code": "PS", "Name": "Palestine, State of"},{"Code": "PA", "Name": "Panama"},{"Code": "PG", "Name": "Papua New Guinea"},{"Code": "PY", "Name": "Paraguay"},{"Code": "PE", "Name": "Peru"},{"Code": "PH", "Name": "Philippines"},{"Code": "PN", "Name": "Pitcairn"},{"Code": "PL", "Name": "Poland"},{"Code": "PT", "Name": "Portugal"},{"Code": "PR", "Name": "Puerto Rico"},{"Code": "QA", "Name": "Qatar"},{"Code": "RE", "Name": "R\u00e9union"},{"Code": "RO", "Name": "Romania"},{"Code": "RU", "Name": "Russian Federation"},{"Code": "RW", "Name": "Rwanda"},{"Code": "BL", "Name": "Saint Barth\u00e9lemy"},{"Code": "SH", "Name": "Saint Helena, Ascension and Tristan da Cunha"},{"Code": "KN", "Name": "Saint Kitts and Nevis"},{"Code": "LC", "Name": "Saint Lucia"},{"Code": "MF", "Name": "Saint Martin (French part)"},{"Code": "PM", "Name": "Saint Pierre and Miquelon"},{"Code": "VC", "Name": "Saint Vincent and the Grenadines"},{"Code": "WS", "Name": "Samoa"},{"Code": "SM", "Name": "San Marino"},{"Code": "ST", "Name": "Sao Tome and Principe"},{"Code": "SA", "Name": "Saudi Arabia"},{"Code": "SN", "Name": "Senegal"},{"Code": "RS", "Name": "Serbia"},{"Code": "SC", "Name": "Seychelles"},{"Code": "SL", "Name": "Sierra Leone"},{"Code": "SG", "Name": "Singapore"},{"Code": "SX", "Name": "Sint Maarten (Dutch part)"},{"Code": "SK", "Name": "Slovakia"},{"Code": "SI", "Name": "Slovenia"},{"Code": "SB", "Name": "Solomon Islands"},{"Code": "SO", "Name": "Somalia"},{"Code": "ZA", "Name": "South Africa"},{"Code": "GS", "Name": "South Georgia and the South Sandwich Islands"},{"Code": "SS", "Name": "South Sudan"},{"Code": "ES", "Name": "Spain"},{"Code": "LK", "Name": "Sri Lanka"},{"Code": "SD", "Name": "Sudan"},{"Code": "SR", "Name": "Suriname"},{"Code": "SJ", "Name": "Svalbard and Jan Mayen"},{"Code": "SZ", "Name": "Swaziland"},{"Code": "SE", "Name": "Sweden"},{"Code": "CH", "Name": "Switzerland"},{"Code": "SY", "Name": "Syrian Arab Republic"},{"Code": "TW", "Name": "Taiwan, Province of China"},{"Code": "TJ", "Name": "Tajikistan"},{"Code": "TZ", "Name": "Tanzania, United Republic of"},{"Code": "TH", "Name": "Thailand"},{"Code": "TL", "Name": "Timor-Leste"},{"Code": "TG", "Name": "Togo"},{"Code": "TK", "Name": "Tokelau"},{"Code": "TO", "Name": "Tonga"},{"Code": "TT", "Name": "Trinidad and Tobago"},{"Code": "TN", "Name": "Tunisia"},{"Code": "TR", "Name": "Turkey"},{"Code": "TM", "Name": "Turkmenistan"},{"Code": "TC", "Name": "Turks and Caicos Islands"},{"Code": "TV", "Name": "Tuvalu"},{"Code": "UG", "Name": "Uganda"},{"Code": "UA", "Name": "Ukraine"},{"Code": "AE", "Name": "United Arab Emirates"},{"Code": "GB", "Name": "United Kingdom"},{"Code": "US", "Name": "United States"},{"Code": "UM", "Name": "United States Minor Outlying Islands"},{"Code": "UY", "Name": "Uruguay"},{"Code": "UZ", "Name": "Uzbekistan"},{"Code": "VU", "Name": "Vanuatu"},{"Code": "VE", "Name": "Venezuela, Bolivarian Republic of"},{"Code": "VN", "Name": "Viet Nam"},{"Code": "VG", "Name": "Virgin Islands, British"},{"Code": "VI", "Name": "Virgin Islands, U.S."},{"Code": "WF", "Name": "Wallis and Futuna"},{"Code": "EH", "Name": "Western Sahara"},{"Code": "YE", "Name": "Yemen"},{"Code": "ZM", "Name": "Zambia"},{"Code": "ZW", "Name": "Zimbabwe"}];

for (var i = 0; i < ccode.length; i++) {
	$("select.countrycode").append('<option value="' + ccode[i].Code + '" class="trn">' + ccode[i].Name + '</option>');
}

//c'est juste pour debug le storage
function deleteBrowserStorage() {
	chrome.storage.local.clear(() => {
		localStorage.clear();
	});
}

//c'est juste pour debug le storage
function getBrowserStorage() {
	chrome.storage.local.get(null, (data) => {
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

	translator.lang(localStorage.lang);
	return translator.get(str);
}

function initTrad() {

	chrome.storage.local.get("lang", (lang) => {

		//init
		translator.lang(lang);

		//selection de langue
		//localStorage + weather update + body trad
		$(".lang").change(function() {
			chrome.storage.local.set({"lang": this.value});
			localStorage.lang = this.value;
			translator.lang(this.value);

			date();
			greetings();
		});

		$(".popup .lang").change(function() {
			$(".settings .lang")[0].value = $(this)[0].value;
		});
	});
}

function introduction() {

	function welcomeback(iswelcomed) {

		//regarde si le storage déclare un welcome back
		//si oui on affiche welcome back et le supprime

		if (iswelcomed) {
			$(".welcomeback_wrapper").css("display", "flex");
			chrome.storage.local.remove("welcomeback");
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

	chrome.storage.local.get(["isIntroduced", "welcomeback", "links"], (data) => {
		
		if (!data.isIntroduced) {

			$("#start_popup").css("display", "flex");
			chrome.storage.local.set({"links": START_LINKS});

		} else {
			
			$("#start_popup").css("display", "none");

			if (data.links && data.links.length > 0) $(".interface .linkblocks").css("visibility", "visible");
			
			welcomeback(data.welcomeback);
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
		if ($(".popup .linkblocks").css("visibility") === "visible") {
			$(".interface .linkblocks").css("visibility", 'visible');
			quickLinks();
		}
		
		setTimeout(function() {
			$("#start_popup").css("display", "none");
			$(".interface .linkblocks").css("opacity", 1)
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

				$(".popup .linkblocks").css("visibility", "visible");
				quickLinks();

				$(".previous_popup").text(tradThis("Back"));
				$(".next_popup").text(tradThis("Next"));
			}

			if (margin === 200) {
				quickLinks();
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
		chrome.storage.local.set({"clockformat": format});
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
	let h = DATE.getHours();
	let message;

	if (h < 0 || h > 23)
		return;

	if (h >= 0 && h < 6) {
		message = tradThis('Good Night');
	} else if (h >= 6 && h < 12) {
		message = tradThis('Good Morning');
	} else if (h >= 12 && h < 17) {
		message = tradThis('Good Afternoon');
	} else if (h >= 17 && h < 23) {
		message = tradThis('Good Evening');
	}

	$('.greetings').text(message);
}

function quickLinks() {

	var stillActive = false, oldURL = false;

	//initialise les blocs en fonction du storage
	//utilise simplement une boucle de appendblock
	function initblocks() {

		$(".linkblocks").empty();

		chrome.storage.local.get("links", (data) => {

			if (data.links) {

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

			chrome.storage.local.get(["links", "searchbar"], (data) => {

				//si on supprime un block quand la limite est atteinte
				//réactive les inputs
				if (data.links.length === BLOCK_LIMIT) {

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
					if (data.links.length === 1) {
						$(".interface .linkblocks").css("visibility", "hidden");
						searchbarFlexControl(data.searchbar, 0);
					}
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

			var reg = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,4}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g;

			//config ne marche pas
			if (str.startsWith("about:") || str.startsWith("chrome://")) {
				return false;
			}

			//premier regex pour savoir si c'est http
			if (!str.match(reg)) {
				str = "http://" + str;
			}

			//deuxieme pour savoir si il est valide (avec http)
			if (str.match(reg)) {
				return str.match(reg)[0];
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

			chrome.storage.local.get(["links", "searchbar"], (data) => {

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
					chrome.storage.local.set({"links": arr});
					appendblock(links);
				} else {

					//desactive tout les input url (fonctionne pour popup du coup)
					var input = $("input[name='url']");
					$(input).each(function() {
						$(this).attr("placeholder", "Quick Links full");
						$(this).attr("disabled", "disabled");
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

	function cacheControl() {

		chrome.storage.local.get(["weather", "lang"], (data) => {

			var now = Math.floor(DATE.getTime() / 1000);
			var param = (data.weather ? data.weather : "");
			var lastCall = parseInt(localStorage.lastCall);

			if (lastCall) {

				
				//si weather est vieux d'une demi heure (1800s)
				//faire une requete et update le lastcall
				if (now > lastCall + 1800) {

					request(param, "current");
					localStorage.lastCall = now;

				} else {

					dataHandling(param.lastState);
				}

				//high ici
				if (data.weather.fcDay && data.weather.fcDay === (new Date).getDay()) {
					$(".w_desc_temp_max").text(data.weather.fcHigh + "°");
				} else {
					request(data.weather, "forecast");
				}

			} else {

				//initialise a Paris + Metric
				//c'est le premier call, requete + lastCall = now
				initWeather();
				localStorage.lastCall = now;
			}


		});
	}

	function initWeather() {

		navigator.geolocation.getCurrentPosition((pos) => {

			var param = {
				unit: "metric",
				location: []
			};

			//update le parametre de location
			param.location.push(pos.coords.latitude, pos.coords.longitude);
			chrome.storage.local.set({"weather": param});

			//update le setting
			$(".w_auto input")[0].checked = true;
			$(".change_weather .city").css("display", "none");
			$(".w_auto input").removeAttr("disabled");

			chrome.storage.local.set({"weather": param});

			request(param, "current");
			request(param, "forecast");
			
		}, (refused) => {

			var param = {
				city: "Paris",
				ccode: "FR",
				location: false,
				unit: "metric"
			};

			//désactive geolocation if refused
			$(".w_auto input")[0].checked = false;
			$(".w_auto input").removeAttr("disabled");

			chrome.storage.local.set({"weather": param});

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
				url += "&lat=" + arg.location[0] + "&lon=" + arg.location[1];
			} else {
				url += "&q=" + encodeURI(arg.city) + "," + arg.ccode;
			}

			url += '&units=' + arg.unit + '&lang=' + localStorage.lang;

			return url;
		}

		function weatherResponse(parameters, response) {

			//sauvegarder la derniere meteo
			var param = parameters;
			param.lastState = response;
			chrome.storage.local.set({"weather": param});

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
			chrome.storage.local.set({"weather": param});

			$(".w_desc_temp_max").text(param.fcHigh + "°");
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
	 		//data.icon = icon_src;
	 		//localStorage.wLastState = JSON.stringify(data);
		}

		$(".w_icon").css("opacity", 1);
	}

	function submissionError(error) {

		var input = $(".change_weather input[name='city']");

		//affiche le texte d'erreur
		$("p.wrongCity").text(error);
		$("p.wrongCity").css("display", "block");
		$("p.wrongCity").css("opacity", 1);

		//l'enleve si le user modifie l'input
		$(input).keydown(function() {

			$("p.wrongCity").css("opacity", 0);
			setTimeout(function() {
				$("p.wrongCity").css("display", "none");
			}, 200);
		});
	}

	function updateCity() {

		chrome.storage.local.get(["weather"], (data) => {

			var param = data.weather;

			var city = $(".change_weather input[name='city']");
			param.ccode = $(".countrycode")[0].value;
			param.city = city[0].value;

			if (param.city.length < 2) return false;

			request(param, "current");
			request(param, "forecast");

			city.attr("placeholder", param.city);
			city.val("");
			city.blur();

			chrome.storage.local.set({"weather": param});
		});	
	}

	function updateUnit(that) {

		chrome.storage.local.get(["weather"], (data) => {

			var param = data.weather;

			if ($(that).is(":checked")) {
				param.unit = "imperial";
			} else {
				param.unit = "metric";
			}

			request(param, "current");
			request(param, "forecast");
			
			chrome.storage.local.set({"weather": param});
		});
	}

	function updateLocation(that) {

		chrome.storage.local.get(["weather"], (data) => {

			var param = data.weather;
			param.location = [];

			if ($(that).is(":checked")) {

				$(that).attr("disabled", "");

				navigator.geolocation.getCurrentPosition((pos) => {

					//update le parametre de location
					param.location.push(pos.coords.latitude, pos.coords.longitude);
					chrome.storage.local.set({"weather": param});

					//request la meteo
					request(param, "current");
					request(param, "forecast");

					//update le setting
					$(".change_weather .city").css("display", "none");
					$(that).removeAttr("disabled");
					
				}, (refused) => {

					//désactive geolocation if refused
					$(that)[0].checked = false;
					$(that).removeAttr("disabled");

					if (!param.city) initWeather();
				});

			} else {

				param.location = false;
				chrome.storage.local.set({"weather": param});

				$(".change_weather .city").css("display", "block");
				weatherRequest(param);
			}
		});
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

			chrome.storage.local.get("weather", (data) => {

				request(data.weather, "current");
				request(data.weather, "forecast");
				searchbar();
				slow(this);
			});		
		}
	});


	//popup checkboxes enables settings checkboxes
	$(".popup .units input").change(function() {
		$(".settings .units input")[0].checked = $(this)[0].checked;
	});

	$(".popup .w_auto input").change(function() {
		$(".settings .w_auto input")[0].checked = $(this)[0].checked;
	});


	cacheControl();
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

	chrome.storage.local.get(["background_image", "background_type", "background_blur", "background_blob"], (data) => {

		//si storage existe, utiliser storage, sinon default
		var image = (data.background_image ? data.background_image : "src/images/backgrounds/blur/avi-richards-beach.jpg");
		var type = (data.background_type ? data.background_type : "default");
		var blur = (data.background_blur ? data.background_blur : 25);

		//si custom, faire le blob
		if (data.background_type === "custom") {
			//reste local !!!!
			chrome.storage.local.get("background_blob", (data) => {
				applyBackground(blob(data.background_blob), type, blur);
			});	
		} else {
			applyBackground(image, type, blur);
		}
		

		//remet les transitions du blur
		setTimeout(function() {
			$(".background").css("transition", "filter .2s");
		}, 200);
	});	
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
		chrome.storage.local.set({"background_blob": base}); //reste local !!!!
		chrome.storage.local.set({"background_image": blobUrl});
		chrome.storage.local.set({"background_type": "custom"});

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

		chrome.storage.local.set({"background_image": source});
		chrome.storage.local.set({"background_type": "default"});
	});
}

function dynamicBackground() {

	$("div.dynamic_bg input").change(function() {

		chrome.storage.local.get(["background_image", "background_type", "background_blur"], (data) => {

			if (this.checked) {

				//set un previous background si le user choisi de désactiver ce parametre
				chrome.storage.local.set({"previous_image": data.background_image});
				chrome.storage.local.set({"previous_type": data.background_type});

				applyBackground(UNSPLASH, "dynamic");

				chrome.storage.local.set({"background_image": UNSPLASH});
				chrome.storage.local.set({"background_type": "dynamic"});

				//enleve la selection default bg si jamais
				$(".imgpreview").removeClass("selected");

			} else {

				if (data.previous_image) {
					//previous background devient actuel
					applyBackground(data.previous_image, data.previous_type);

					chrome.storage.local.set({"background_image": data.previous_image});
					chrome.storage.local.set({"background_type": data.previous_type});

					//supprime pour faire de la place en cas de custom bg
					chrome.storage.local.remove("previous_image");
					chrome.storage.local.remove("previous_type");

				} else {
					//default bg
					applyBackground("src/images/avi-richards-beach.jpg", "default", 25);

					chrome.storage.local.set({"background_image": optimizedBgURL("src/images/avi-richards-beach.jpg")});
					chrome.storage.local.set({"background_type": "default"});
				}
			}
		});
	});
}

function blurThis(val, choosing) {

	var isDark = $("body").attr("class");
	var url = imgBackground().slice(4, imgBackground().length - 1);
	
	if (val > 0) {

		$('.background').css("filter", 'blur(' + val + 'px)');
		if (choosing) imgBackground(optimizedBgURL(url, val));

	} else {

		$('.background').css("filter", '');
		if (choosing) imgBackground(optimizedBgURL(url, val));
	}

	chrome.storage.local.set({"background_blur": val});
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
			chrome.storage.local.set({"background_image": optimizedBgURL(urltouse)});
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

		chrome.storage.local.get("dark", (data) => {

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

		if (choix === "system") {
			chrome.storage.local.set({"dark": "system"});
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

			chrome.storage.local.set({"searchbar": true});

			//pour animer un peu
			$("#searchbar_option .param hr, .popup5 hr").css("display", "block");
			$(".settings #choose_searchengine").css("display", 'flex');
			$(".popup #choose_searchengine").css("display", 'flex');
			
			searchbarFlexControl(activated, (links ? links.length : 0));
			
		} else {

			chrome.storage.local.set({"searchbar": false});

			//pour animer un peu
			$("#choose_searchengine, #searchbar_option hr, .popup5 hr").css("display", "none");
			
			searchbarFlexControl(activated, (links ? links.length : 0));
		}
	}

	function chooseSearchEngine(choice) {

		var engines = {
			"s_startpage" : ["https://www.startpage.com/do/dsearch?query=", tradThis("Search Startpage")],
			"s_ddg" : ["https://duckduckgo.com/?q=", tradThis("Search DuckDuckGo")],
			"s_qwant" : ["https://www.qwant.com/?q=", tradThis("Search Qwant")],
			"s_ecosia" : ["https://www.ecosia.org/search?q=", tradThis("Search Ecosia")],
			"s_google" : ["https://www.google.com/search", tradThis("Search Google")],
			"s_yahoo" : ["https://search.yahoo.com/search?p=", tradThis("Search Yahoo")],
			"s_bing" : ["https://www.bing.com/search?q=", tradThis("Search Bing")]
		}

		$(".searchbar_container form").attr("action", engines[choice][0]);
		$(".searchbar").attr("placeholder", engines[choice][1]);

		chrome.storage.local.set({"searchbar_engine": choice});
	}

	//init
	chrome.storage.local.get(["searchbar", "searchbar_engine", "links"], (data) => {

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

	let store = ["background_type", "dark", "weather", "searchbar", "searchbar_engine", "clockformat", "lang"];

	chrome.storage.local.get(store, (data) => {



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
			$(".dynamic_bg input").prop("checked", true);
		}

		//dark mode input
		if (data.dark) {
			$(".darkmode select.theme").prop("value", data.dark);
		} else {
			$(".darkmode select.theme").prop("value", "disable");
		}
		
		
		//weather city input
		if (data.weather.city) {
			$(".change_weather input[name='city']").attr("placeholder", data.weather.city);
		} else {
			$(".change_weather input[name='city']").attr("placeholder", "City");
		}


		if (data.weather.ccode) {
			$(".change_weather select.countrycode").attr("placeholder", data.weather.ccode);
		} else {
			$(".change_weather select.countrycode").prop("value", "US");
		}

		//check geolocalisation
		//enleve city
		if (data.weather.location) {

			$(".w_auto input").prop("checked", true);
			$("div.city").css("display", "none");

		} else {

			$(".w_auto input").prop("checked", false);
		}

		//check imperial
		if (data.weather.unit && data.weather.unit === "imperial") {
			$(".units input").prop("checked", true);
		} else {
			$(".units input").prop("checked", false);
		}

		
		//searchbar switch et select
		$(".activate_searchbar input").prop("checked", data.searchbar);

		setTimeout(() => {
	      if (data.searchbar) $(".interface input.searchbar").focus();
	    }, 100);
		

		if (data.searchbar_engine) {
			$(".choose_search").prop("value", data.searchbar_engine);
		} else {
			$(".choose_search").prop("value", "s_startpage");
		}


		//clock
		if (data.clockformat === 12) {
			$(".12hour input").prop("checked", true);
			localStorage.clockformat = 12;
		} else {
			$(".12hour input").prop("checked", false);
		}
			

		//langue
		if (data.lang) {
			$(".lang").prop("value", data.lang);
		} else {
			$(".lang").prop("value", "en");
		}

		
		
	});			
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

//autofocus
$(document).keydown(function(e) {

	if ($(".searchbar_container").hasClass("shown")
		&& !$(".settings").hasClass("shown")
		&& $("#start_popup").css("display") === "none") {
		
		$(".interface input.searchbar").focus();
	}
})



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