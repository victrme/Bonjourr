id = (name) => document.getElementById(name)
cl = (name) => document.getElementsByClassName(name)
clas = (that, val) => that.setAttribute('class', val)
has = (that, val) => (id(that) && id(that).getAttribute('class', val) ? true : false)

let disposableData = {},
	isPro = false,
	langue = 'en',
	stillActive = false,
	rangeActive = false,
	lazyClockInterval = 0
const randomseed = Math.floor(Math.random() * 30) + 1,
	domshowsettings = id('showSettings'),
	domlinkblocks = id('linkblocks'),
	dominterface = id('interface'),
	dict = askfordict(),
	mobilecheck = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? true : false

//cache rapidement temp max pour eviter que ça saccade
if (new Date().getHours() >= 12) id('temp_max_wrap').style.display = 'none'

//c'est juste pour debug le storage
function deleteBrowserStorage() {
	chrome.storage.sync.clear(() => {
		localStorage.clear()
	})
}
function getBrowserStorage() {
	chrome.storage.sync.get(null, (data) => {
		console.log(data)
	})
}
function getLocalStorage() {
	chrome.storage.local.get(null, (data) => {
		console.log(data)
	})
}

//pour bonjourr pro
function setPremiumCode(str) {
	chrome.storage.sync.set({ login: btoa(str) })
}

//cache un peu mieux les données dans le storage
function localEnc(input = 'no', enc = true) {
	let a = input.split(''),
		n = ''
	for (let i in a) n += String.fromCharCode(a[i].charCodeAt() + (enc ? randomseed : -randomseed))
	return n
}

function slowRange(tosave) {
	//timeout avant de save pour éviter la surcharge d'instructions de storage
	clearTimeout(rangeActive)
	rangeActive = setTimeout(function () {
		chrome.storage.sync.set(tosave)
	}, 150)
}

function slow(that) {
	that.setAttribute('disabled', '')
	stillActive = setTimeout(() => {
		that.removeAttribute('disabled')
		clearTimeout(stillActive)
		stillActive = false
	}, 700)
}

function traduction(ofSettings, initStorage) {
	let trns = (ofSettings ? id('settings') : document).querySelectorAll('.trn')
	langue = ofSettings ? JSON.parse(localEnc(disposableData, false)).lang || 'en' : initStorage || 'en'

	if (langue !== 'en') trns.forEach((t) => (dict[t.innerText] ? (t.innerText = dict[t.innerText][langue]) : ''))
}

const tradThis = (str) => (langue === 'en' ? str : dict[str][langue])

function newClock(eventObj, init) {
	function displayControl() {
		const numeric = id('clock'),
			analog = id('analogClock'),
			analSec = id('analogSeconds')

		//cache celle qui n'est pas choisi
		clas(clock.analog ? numeric : analog, 'hidden')
		clas(clock.analog ? analog : numeric, '')

		//cache l'aiguille des secondes
		if (!clock.seconds && clock.analog) clas(analSec, 'hidden')
		else clas(analSec, '')
	}

	function main() {
		//retourne une liste [heure, minutes, secondes]
		function time() {
			const date = new Date()
			return [date.getHours(), date.getMinutes(), date.getSeconds()]
		}

		//besoin pour numerique et analogue
		function timezone(timezone, hour) {
			if (timezone === 'auto' || timezone === NaN) return hour
			else {
				let d = new Date()
				let offset = d.getTimezoneOffset()
				let utc = hour + offset / 60
				let setTime = (utc + parseInt(timezone)) % 24

				if (setTime < 0) setTime = 24 + setTime

				return setTime
			}
		}

		function numerical(timearray) {
			//seul numerique a besoin du ampm
			function toAmpm(val) {
				if (val > 12) val -= 12
				else if (val === 0) val = 12
				else val

				return val
			}

			function fixunits(val) {
				val = val < 10 ? '0' + val : val
				return val
			}

			let h = clock.ampm ? toAmpm(timearray[0]) : timearray[0],
				m = fixunits(timearray[1]),
				s = fixunits(timearray[2])

			id('clock').innerText = clock.seconds ? `${h}:${m}:${s}` : `${h}:${m}`
		}

		function analog(timearray) {
			function rotation(that, val) {
				const spancss = that.style

				if (lazyClockInterval === 0 || val === 0) {
					spancss.transition = 'none'
				} else {
					if (spancss.transition === 'none 0s ease 0s') spancss.transition = 'transform .1s'
				}

				spancss.transform = `rotate(${parseInt(val)}deg)`
			}

			// Initial clock: https://codepen.io/josephshambrook/pen/xmtco
			let s = timearray[2] * 6,
				m = timearray[1] * 6, // + (s / 60),
				h = timearray[0] * 30 //% 12 / 12 * 360 + (m / 12);

			//bouge les aiguilles minute et heure quand seconde ou minute arrive à 0
			if (true || timearray[2] === 0) rotation(id('minutes'), m)
			if (true || timearray[1] === 0) rotation(id('hours'), h)

			//tourne pas les secondes si pas de seconds
			if (clock.seconds) rotation(id('analogSeconds'), s)

			//fix 0deg transition
		}

		//timezone control
		//analog control
		const array = time()

		array[0] = timezone(clock.timezone, array[0])
		clock.analog ? analog(array) : numerical(array)
	}

	function startClock() {
		//stops multiple intervals
		clearInterval(lazyClockInterval)

		displayControl()
		main()
		lazyClockInterval = setInterval(main, 1000)
	}

	//controle très stricte de clock comme vous pouvez le voir
	//(je sais que je peux faire mieux)
	let clock

	if (eventObj) {
		chrome.storage.sync.get('clock', (data) => {
			clock = {
				analog: data.clock ? data.clock.analog : false,
				seconds: data.clock ? data.clock.seconds : false,
				ampm: data.clock ? data.clock.ampm : false,
				timezone: data.clock ? data.clock.timezone : 'auto',
			}

			//event change of clock parameters
			clock[eventObj.param] = eventObj.value
			chrome.storage.sync.set({ clock: clock })

			startClock()
		})
	} else {
		clock = {
			analog: init ? init.analog : false,
			seconds: init ? init.seconds : false,
			ampm: init ? init.ampm : false,
			timezone: init ? init.timezone : 'auto',
		}

		startClock()
	}
}

function date(event, usdate) {
	const date = new Date()
	const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
	const months = [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December',
	]

	if (usdate) {
		id('jour').innerText = tradThis(days[date.getDay()]) + ','
		id('chiffre').innerText = tradThis(months[date.getMonth()])
		id('mois').innerText = date.getDate()
	} else {
		id('jour').innerText = tradThis(days[date.getDay()])
		id('chiffre').innerText = date.getDate()
		id('mois').innerText = tradThis(months[date.getMonth()])
	}

	if (event) chrome.storage.sync.set({ usdate: usdate })
}

function greetings() {
	const h = new Date().getHours()
	let message

	if (h > 6 && h < 12) message = 'Good Morning'
	else if (h >= 12 && h < 18) message = 'Good Afternoon'
	else if (h >= 18 && h <= 23) message = 'Good Evening'
	else message = 'Good Night'

	id('greetings').innerText = tradThis(message)
}

function quickLinks(event, that, initStorage) {
	//only on init
	if (!event && !that) {
		let dragged, hovered, current
		let stillActive = false
	}

	//enleve les selections d'edit
	const removeLinkSelection = (x) =>
		domlinkblocks.querySelectorAll('.l_icon_wrap').forEach(function (e) {
			clas(e, 'l_icon_wrap')
		})

	//initialise les blocs en fonction du storage
	//utilise simplement une boucle de appendblock
	function initblocks(storage) {
		let array = storage.links || false

		if (array) array.map((a, i) => appendblock(a, i, array))
	}

	function appendblock(arr, index, links) {
		let { icon, title, url } = arr

		icon = icon.length > 0 ? icon : 'src/images/loading.gif'

		//le DOM du block
		let b = `<div class='block' draggable="false" source='${url}'>
			<div class='l_icon_wrap' draggable="false">
				<img class='l_icon' src='${icon}' draggable="false">
			</div>
			<span>${title}</span>
		</div>`

		//ajoute un wrap
		let block_parent = document.createElement('div')
		block_parent.setAttribute('class', 'block_parent')
		block_parent.setAttribute('draggable', 'true')
		block_parent.innerHTML = b

		//l'ajoute au dom
		domlinkblocks.appendChild(block_parent)

		//met les events au dernier elem rajouté
		addEvents(domlinkblocks.lastElementChild)

		//si online et l'icon charge, en rechercher une
		if (window.navigator.onLine && icon === 'src/images/loading.gif')
			addIcon(domlinkblocks.lastElementChild, arr, index, links)
	}

	function addEvents(elem) {
		function handleDrag(is, that) {
			chrome.storage.sync.get('links', (data) => {
				const i = findindex(that)

				if (is === 'start') dragged = [elem, data.links[i], i]
				else if (is === 'enter') hovered = [elem, data.links[i], i]
				else if (is === 'end') {
					//changes html blocks
					current = hovered[0].innerHTML
					hovered[0].innerHTML = dragged[0].innerHTML
					dragged[0].innerHTML = current

					//changes link storage
					let allLinks = data.links

					allLinks[dragged[2]] = hovered[1]
					allLinks[hovered[2]] = dragged[1]

					chrome.storage.sync.set({ links: allLinks })
				}
			})
		}

		elem.ondragstart = function (e) {
			//e.preventDefault();
			e.dataTransfer.setData('text/plain', e.target.id)
			e.currentTarget.style.cursor = 'pointer'
			handleDrag('start', this)
		}

		elem.ondragenter = function (e) {
			e.preventDefault()
			handleDrag('enter', this)
		}

		elem.ondragend = function (e) {
			e.preventDefault()
			handleDrag('end', this)
		}

		elem.oncontextmenu = function (e) {
			e.preventDefault()
			if (mobilecheck) editlink(this)
		}

		elem.onmouseup = function (e) {
			removeLinkSelection()
			e.which === 3 ? editlink(this) : !has('settings', 'shown') ? openlink(this, e) : ''
		}
	}

	function editEvents() {
		id('e_delete').onclick = function () {
			removeLinkSelection()
			removeblock(parseInt(id('edit_link').getAttribute('index')))
			clas(id('edit_linkContainer'), '')
		}

		id('e_submit').onclick = function () {
			removeLinkSelection()
			editlink(null, parseInt(id('edit_link').getAttribute('index')))
			clas(id('edit_linkContainer'), '')
		}

		id('e_close').onmouseup = function () {
			removeLinkSelection()
			clas(id('edit_linkContainer'), '')
		}

		id('re_title').onmouseup = function () {
			id('e_title').value = ''
		}

		id('re_url').onmouseup = function () {
			id('e_url').value = ''
		}

		id('re_iconurl').onmouseup = function () {
			id('e_iconurl').value = ''
		}
	}

	function editlink(that, i, customIcon) {
		const e_title = id('e_title')
		const e_url = id('e_url')
		const e_iconurl = id('e_iconurl')

		const controlIcon = (old) => (e_iconurl.value !== '' ? e_iconurl.value : old)

		const updateLinkHTML = ({ title, url, icon }) => {
			let block = domlinkblocks.children[i + 1]

			block.children[0].setAttribute('source', url)
			block.children[0].lastChild.innerText = title
			block.querySelector('img').src = icon
		}

		//edit est visible
		if (i || i === 0) {
			chrome.storage.sync.get('links', (data) => {
				let allLinks = data.links
				let element = {
					title: e_title.value,
					url: e_url.value,
					icon: controlIcon(data.links[i].icon),
				}

				allLinks[i] = element
				updateLinkHTML(element)
				chrome.storage.sync.set({ links: allLinks })
			})

			//affiche edit avec le bon index
		} else {
			const index = findindex(that)
			const liconwrap = that.querySelector('.l_icon_wrap')

			clas(liconwrap, 'l_icon_wrap selected')

			if (has('settings', 'shown')) clas(id('edit_linkContainer'), 'shown pushed')
			else clas(id('edit_linkContainer'), 'shown')

			id('edit_link').setAttribute('index', index)

			chrome.storage.sync.get('links', (data) => {
				const { title, url, icon } = data.links[index]

				e_title.setAttribute('placeholder', tradThis('Title'))
				e_iconurl.setAttribute('placeholder', tradThis('Icon'))

				e_title.value = title
				e_url.value = url
				e_iconurl.value = icon
			})
		}
	}

	function findindex(that) {
		//passe la liste des blocks, s'arrete si that correspond
		//renvoie le nombre de loop pour l'atteindre

		const list = domlinkblocks.children

		for (let i = 0; i < list.length; i++) if (that === list[i]) return i - 1
	}

	function removeblock(index) {
		let count = index

		chrome.storage.sync.get(['links', 'searchbar'], (data) => {
			function ejectIntruder(arr) {
				if (arr.length === 1) return []

				if (count === 0) arr.shift()
				else if (count === arr.length) arr.pop()
				else arr.splice(count, 1)

				return arr
			}

			var linkRemd = ejectIntruder(data.links)

			//si on supprime un block quand la limite est atteinte
			//réactive les inputs
			if (linkRemd.length === 16 - 1) id('i_url').removeAttribute('disabled')

			//enleve le html du block
			var block_parent = domlinkblocks.children[count + 1]
			block_parent.setAttribute('class', 'block_parent removed')

			setTimeout(function () {
				domlinkblocks.removeChild(block_parent)

				//enleve linkblocks si il n'y a plus de links
				if (linkRemd.length === 0) domlinkblocks.style.visibility = 'hidden'
			}, 200)

			chrome.storage.sync.set({ links: linkRemd })
		})
	}

	function addIcon(elem, arr, index, links) {
		function faviconXHR(url) {
			return new Promise(function (resolve, reject) {
				var xhr = new XMLHttpRequest()
				xhr.open('GET', url, true)

				xhr.onload = function () {
					if (xhr.status >= 200 && xhr.status < 400) resolve(JSON.parse(this.response))
					else resolve(null)
				}

				xhr.onerror = reject
				xhr.send()
			})
		}

		function filterIcon(json) {
			//prend le json de favicongrabber et garde la meilleure

			//si le xhr est cassé, prend l'icone bonjourr
			if (json === null) return 'src/images/icons/favicon.png'

			var s = 0
			var a,
				b = 0

			//garde la favicon la plus grande
			for (var i = 0; i < json.icons.length; i++) {
				if (json.icons[i].sizes) {
					a = parseInt(json.icons[i].sizes)

					if (a > b) {
						s = i
						b = a
					}

					//si il y a une icone android ou apple, la prendre direct
				} else if (json.icons[i].src.includes('android-chrome') || json.icons[i].src.includes('apple-touch')) {
					return json.icons[i].src
				}
			}

			//si l'url n'a pas d'icones, utiliser besticon
			if (json.icons.length === 0) {
				return 'https://besticon.herokuapp.com/icon?url=' + json.domain + '&size=80'
			} else {
				return json.icons[s].src
			}
		}

		//prend le domaine de n'importe quelle url
		var a = document.createElement('a')
		a.href = arr.url
		var hostname = a.hostname

		faviconXHR('http://favicongrabber.com/api/grab/' + hostname).then((icon) => {
			var img = elem.querySelector('img')
			var icn = filterIcon(icon)
			img.src = icn

			links[index].icon = icn
			chrome.storage.sync.set({ links: links })
		})
	}

	function linkSubmission() {
		function filterUrl(str) {
			let reg = new RegExp('^(http|https)://', 'i')

			//config ne marche pas
			if (str.startsWith('about:') || str.startsWith('chrome://')) return false

			if (str.startsWith('file://')) return str

			//premier regex pour savoir si c'est http
			if (!str.match(reg)) str = 'http://' + str

			//deuxieme pour savoir si il est valide (avec http)
			if (str.match(reg)) return str.match(reg).input
			else return false
		}

		function saveLink(lll) {
			slow(id('i_url'))

			//remet a zero les inputs
			id('i_title').value = ''
			id('i_url').value = ''

			let full = false

			chrome.storage.sync.get(['links', 'searchbar'], (data) => {
				let arr = []

				//array est tout les links + le nouveau
				if (data.links && data.links.length > 0) {
					if (data.links.length < 16 - 1) {
						arr = data.links
						arr.push(lll)
					} else {
						full = true
					}

					//array est seulement le link
				} else {
					arr.push(lll)
					domlinkblocks.style.visibility = 'visible'
				}

				//si les blocks sont moins que 16
				if (!full) {
					chrome.storage.sync.set({ links: arr })
					appendblock(lll, arr.length - 1, arr)
				} else {
					//desactive tout les input url
					id('i_url').setAttribute('disabled', 'disabled')
				}
			})
		}

		titleControl = (t) => (t.length > 42 ? t.slice(0, 42) + '...' : t)

		//append avec le titre, l'url ET l'index du bloc

		let links = {
			title: titleControl(id('i_title').value),
			url: filterUrl(id('i_url').value),
			icon: '',
		}

		//si l'url filtré est juste
		if (links.url && id('i_url').value.length > 2) {
			//et l'input n'a pas été activé ya -1s
			if (!stillActive) saveLink(links)
		}
	}

	function openlink(that, e) {
		const source = that.children[0].getAttribute('source')
		const a_hiddenlink = id('hiddenlink')

		chrome.storage.sync.get('linknewtab', (data) => {
			if (data.linknewtab) {
				chrome.tabs.create({
					url: source,
				})
			} else {
				if (e.which === 2) {
					chrome.tabs.create({
						url: source,
					})
				} else {
					a_hiddenlink.setAttribute('href', source)
					a_hiddenlink.setAttribute('target', '_self')
					a_hiddenlink.click()
				}
			}
		})
	}

	//TOUT LES EVENTS, else init

	if (event === 'input' && that.which === 13) linkSubmission()
	else if (event === 'button') linkSubmission()
	else if (event === 'linknewtab') {
		chrome.storage.sync.set({ linknewtab: that.checked ? true : false })
		id('hiddenlink').setAttribute('target', '_blank')
	} else {
		initblocks(initStorage)
		editEvents()
	}
}

function weather(event, that, initStorage) {
	const dom_temp_max = id('temp_max'),
		dom_temp_max_wrap = id('temp_max_wrap'),
		dom_first_desc = id('weather_desc').children[0]

	function cacheControl(storage) {
		let now = Math.floor(new Date().getTime() / 1000)
		let param = storage.weather ? storage.weather : ''

		if (storage.weather && storage.weather.lastCall) {
			//si weather est vieux d'une demi heure (1800s)
			//ou si on change de lang
			//faire une requete et update le lastcall
			if (sessionStorage.lang || now > storage.weather.lastCall + 1800) {
				dataHandling(param.lastState)
				request(param, 'current')

				//si la langue a été changé, suppr
				if (sessionStorage.lang) sessionStorage.removeItem('lang')
			} else dataHandling(param.lastState)

			//high ici
			if (storage.weather && storage.weather.fcDay === new Date().getDay()) {
				dom_temp_max.innerText = storage.weather.fcHigh + '°'
				dom_temp_max_wrap.style.opacity = 1
			} else request(storage.weather, 'forecast')
		} else {
			//initialise a Paris + Metric
			//c'est le premier call, requete + lastCall = now
			initWeather()
		}
	}

	function initWeather() {
		let param = {
			city: 'Paris',
			ccode: 'FR',
			location: false,
			unit: 'metric',
		}

		navigator.geolocation.getCurrentPosition(
			(pos) => {
				param.location = []

				//update le parametre de location
				param.location.push(pos.coords.latitude, pos.coords.longitude)
				chrome.storage.sync.set({ weather: param })

				request(param, 'current')
				request(param, 'forecast')
			},
			(refused) => {
				param.location = false

				chrome.storage.sync.set({ weather: param })

				request(param, 'current')
				request(param, 'forecast')
			}
		)
	}

	function request(arg, wCat) {
		function urlControl(arg, forecast) {
			let url = 'https://api.openweathermap.org/data/2.5/'

			if (forecast) url += 'forecast?appid=' + atob(WEATHER_API_KEY[0])
			else url += 'weather?appid=' + atob(WEATHER_API_KEY[1])

			//auto, utilise l'array location [lat, lon]
			if (arg.location) {
				url += `&lat=${arg.location[0]}&lon=${arg.location[1]}`
			} else {
				url += `&q=${encodeURI(arg.city)},${arg.ccode}`
			}

			url += `&units=${arg.unit}&lang=${langue}`

			return url
		}

		function weatherResponse(parameters, response) {
			//sauvegarder la derniere meteo
			let now = Math.floor(new Date().getTime() / 1000)
			let param = parameters
			param.lastState = response
			param.lastCall = now
			chrome.storage.sync.set({ weather: param })

			//la réponse est utilisé dans la fonction plus haute
			dataHandling(response)
		}

		function forecastResponse(parameters, response) {
			function findHighTemps(d) {
				let i = 0
				let newDay = new Date(d.list[0].dt_txt).getDay()
				let currentDay = newDay
				let arr = []

				//compare la date toute les 3h (list[i])
				//si meme journée, rajouter temp max a la liste

				while (currentDay == newDay && i < 10) {
					newDay = new Date(d.list[i].dt_txt).getDay()
					arr.push(d.list[i].main.temp_max)

					i += 1
				}

				let high = Math.floor(Math.max(...arr))

				//renvoie high
				return [high, currentDay]
			}

			let fc = findHighTemps(response)

			//sauvegarder la derniere meteo
			let param = parameters
			param.fcHigh = fc[0]
			param.fcDay = fc[1]
			chrome.storage.sync.set({ weather: param })

			dom_temp_max.innerText = param.fcHigh + '°'
			dom_temp_max_wrap.style.opacity = 1
		}

		let url = wCat === 'current' ? urlControl(arg, false) : urlControl(arg, true)

		let request_w = new XMLHttpRequest()
		request_w.open('GET', url, true)

		request_w.onload = function () {
			let resp = JSON.parse(this.response)

			if (request_w.status >= 200 && request_w.status < 400) {
				if (wCat === 'current') {
					weatherResponse(arg, resp)
				} else if (wCat === 'forecast') {
					forecastResponse(arg, resp)
				}
			} else {
				submissionError(resp.message)
			}
		}

		request_w.send()
	}

	function dataHandling(data) {
		let hour = new Date().getHours()

		function getIcon() {
			//si le soleil est levé, renvoi jour
			//le renvoie correspond au nom du répertoire des icones jour / nuit
			function dayOrNight(sunset, sunrise) {
				let ss = new Date(sunset * 1000)
				let sr = new Date(sunrise * 1000)

				return hour > sr.getHours() && hour < ss.getHours() ? 'day' : 'night'
			}

			//prend l'id de la météo et renvoie une description
			//correspond au nom de l'icone (+ .png)
			function imgId(c) {
				let temp,
					codes = {
						thunderstorm: 200,
						lightdrizzle: 300,
						showerdrizzle: 302,
						lightrain: 500,
						showerrain: 502,
						snow: 602,
						mist: 701,
						clearsky: 800,
						fewclouds: 801,
						brokenclouds: 803,
					}

				for (let key in codes) {
					if (c >= codes[key]) temp = key
				}

				return temp || 'clearsky'
			}

			let d_n = dayOrNight(data.sys.sunset, data.sys.sunrise)
			let weather_id = imgId(data.weather[0].id)
			let icon_src = `src/images/weather/${d_n}/${weather_id}.png`
			id('widget').setAttribute('src', icon_src)
			id('widget').setAttribute('class', 'shown')
		}

		function getDescription() {
			//pour la description et temperature
			//Rajoute une majuscule à la description
			let meteoStr = data.weather[0].description
			meteoStr = meteoStr[0].toUpperCase() + meteoStr.slice(1)
			id('desc').innerText = meteoStr + '.'

			//si c'est l'après midi (apres 12h), on enleve la partie temp max
			let dtemp, wtemp

			if (hour < 12) {
				//temp de desc et temp de widget sont pareil
				dtemp = wtemp = Math.floor(data.main.temp) + '°'
			} else {
				//temp de desc devient temp de widget + un point
				//on vide la catégorie temp max
				wtemp = Math.floor(data.main.temp) + '°'
				dtemp = wtemp + '.'
			}

			id('temp').innerText = dtemp
			id('widget_temp').innerText = wtemp
			dom_first_desc.style.opacity = 1
		}

		getDescription()
		getIcon()
	}

	function submissionError(error) {
		const city = id('i_city')

		city.value = ''
		city.setAttribute('placeholder', tradThis('City not found'))
	}

	function updateCity() {
		slow(that)

		chrome.storage.sync.get(['weather'], (data) => {
			const param = data.weather

			param.ccode = i_ccode.value
			param.city = i_city.value

			if (param.city.length < 2) return false

			request(param, 'current')
			request(param, 'forecast')

			i_city.setAttribute('placeholder', param.city)
			i_city.value = ''
			i_city.blur()

			chrome.storage.sync.set({ weather: param })
		})
	}

	function updateUnit(that) {
		slow(that)

		chrome.storage.sync.get(['weather'], (data) => {
			const param = data.weather

			if (that.checked) {
				param.unit = 'imperial'
			} else {
				param.unit = 'metric'
			}

			request(param, 'current')
			request(param, 'forecast')

			chrome.storage.sync.set({ weather: param })
		})
	}

	function updateLocation(that) {
		slow(that)

		chrome.storage.sync.get(['weather'], (data) => {
			const param = data.weather
			param.location = []

			if (that.checked) {
				that.setAttribute('disabled', '')

				navigator.geolocation.getCurrentPosition(
					(pos) => {
						//update le parametre de location
						param.location.push(pos.coords.latitude, pos.coords.longitude)
						chrome.storage.sync.set({ weather: param })

						//request la meteo
						request(param, 'current')
						request(param, 'forecast')

						//update le setting
						clas(sett_city, 'city hidden')
						that.removeAttribute('disabled')
					},
					(refused) => {
						//désactive geolocation if refused
						that.checked = false
						that.removeAttribute('disabled')

						if (!param.city) initWeather()
					}
				)
			} else {
				clas(sett_city, 'city')

				i_city.setAttribute('placeholder', param.city)
				i_ccode.value = param.ccode

				param.location = false
				chrome.storage.sync.set({ weather: param })

				request(param, 'current')
				request(param, 'forecast')
			}
		})
	}

	const WEATHER_API_KEY = [
		'YTU0ZjkxOThkODY4YTJhNjk4ZDQ1MGRlN2NiODBiNDU=',
		'Y2U1M2Y3MDdhZWMyZDk1NjEwZjIwYjk4Y2VjYzA1NzE=',
		'N2M1NDFjYWVmNWZjNzQ2N2ZjNzI2N2UyZjc1NjQ5YTk=',
	]
	const i_city = id('i_city')
	const i_ccode = id('i_ccode')
	const sett_city = id('sett_city')

	//TOUT LES EVENTS, default c'est init
	switch (event) {
		case 'city':
			updateCity()
			break

		case 'units':
			updateUnit(that)
			break

		case 'geol':
			updateLocation(that)
			break

		default:
			cacheControl(initStorage)
	}
}

function imgCredits(src, type) {
	const location = id('location'),
		artist = id('artist'),
		credit = id('credit'),
		onUnsplash = id('onUnsplash')

	if (type === 'dynamic') {
		clas(onUnsplash, 'shown')
		location.innerText = src.location.text
		location.setAttribute('href', src.location.url)
		artist.innerText = src.artist.text
		artist.setAttribute('href', src.artist.url)
	}

	if (type === 'custom') clas(credit, 'hidden')
	else clas(credit, 'shown')
}

function imgBackground(val) {
	if (val) {
		let img = new Image()

		img.onload = () => {
			id('background').style.backgroundImage = `url(${val})`
			id('background_overlay').style.animation = 'fade .1s ease-in forwards'
		}

		img.src = val
		img.remove()
	} else return id('background').style.backgroundImage
}

function initBackground(storage) {
	function loadCustom({ custom, customIndex }) {
		const index = customIndex >= 0 ? customIndex : 0
		const chosen = custom[index]
		const cleanData = chosen.slice(chosen.indexOf(',') + 1, chosen.length)

		imgBackground(b64toBlobUrl(cleanData))
		changeImgIndex(customIndex)
	}

	let type = storage.background_type || 'dynamic'

	if (type === 'custom') {
		//reste local !!!!
		chrome.storage.local.get(null, (data) => {
			//1.8.3 -> 1.9 data transfer
			if (data.background_blob) {
				const blob = data.background_blob
				const old = [blob[0] + ',' + blob[1]]

				loadCustom({
					custom: old,
					customIndex: 0,
				})

				chrome.storage.local.set({ custom: old })
				chrome.storage.local.set({ customIndex: 0 })
				chrome.storage.local.set({ customThumbnails: old })

				chrome.storage.local.remove('background_blob')
			}

			//if no custom background available
			//choose dynamic
			else if (!data.custom || data.custom.length === 0) {
				unsplash(storage.dynamic)
				chrome.storage.sync.set({ background_type: 'dynamic' })

				//apply chosen custom background
			} else {
				loadCustom(data)
			}
		})

		imgCredits(null, type)
	} else if (type === 'dynamic' || type === 'default') unsplash(storage.dynamic)
	else unsplash(null, null, true) //on startup

	let blur = Number.isInteger(storage.background_blur) ? storage.background_blur : 15
	let bright = !isNaN(storage.background_bright) ? storage.background_bright : 0.7

	filter('init', [blur, bright])
}

function setblob(donnee, reader) {
	const b64toBlob = (b64Data, contentType = '', sliceSize = 512) => {
		const byteCharacters = atob(b64Data)
		const byteArrays = []

		for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
			const slice = byteCharacters.slice(offset, offset + sliceSize)

			const byteNumbers = new Array(slice.length)
			for (let i = 0; i < slice.length; i++) {
				byteNumbers[i] = slice.charCodeAt(i)
			}

			const byteArray = new Uint8Array(byteNumbers)
			byteArrays.push(byteArray)
		}

		const blob = new Blob(byteArrays, { type: contentType })
		return blob
	}

	//découpe les données du file en [contentType, base64data]
	let base = reader ? donnee.split(',') : donnee
	let contentType = base[0].replace('data:', '').replace(';base64', '')
	let b64Data = base[1]

	//creer le blob et trouve l'url
	let blob = b64toBlob(b64Data, contentType)
	let blobUrl = URL.createObjectURL(blob)

	return reader ? [base, blobUrl] : blobUrl
}

let fullImage = []
let fullThumbnails = []
const domimg = id('background')
const domthumbnail = document.getElementsByClassName('thumbnail')

function b64toBlobUrl(a, b = '', c = 512) {
	const d = atob(a),
		e = []
	for (let f = 0; f < d.length; f += c) {
		const a = d.slice(f, f + c),
			b = Array(a.length)
		for (let c = 0; c < a.length; c++) b[c] = a.charCodeAt(c)
		const g = new Uint8Array(b)
		e.push(g)
	}
	const f = new Blob(e, {
			type: b,
		}),
		g = URL.createObjectURL(f)
	return g
}

function changeImgIndex(i) {
	domimg.setAttribute('index', i)
}

function renderImage(file, is) {
	let reader = new FileReader()
	reader.onload = function (event) {
		let result = event.target.result

		if (is === 'change') {
			fullImage.push(result)
			chrome.storage.local.set({ custom: fullImage })

			compress(result, 'thumbnail')
			compress(result, 'new')
		}
	}

	reader.readAsDataURL(file)
}

function compress(e, state) {
	//prend l'image complete en arg

	const img = new Image()

	img.onload = () => {
		//const size = document.getElementById('range').value;
		const elem = document.createElement('canvas')
		const ctx = elem.getContext('2d')

		//canvas proportionné à l'image

		//rétréci suivant le taux de compression
		//si thumbnail, toujours 100px
		const height = state === 'thumbnail' ? 100 : img.height * 1 //parseFloat(size));
		const scaleFactor = height / img.height
		elem.width = img.width * scaleFactor
		elem.height = height

		//dessine l'image proportionné
		ctx.drawImage(img, 0, 0, img.width * scaleFactor, height)

		//renvoie le base64
		const data = ctx.canvas.toDataURL(img)
		const cleanData = data.slice(data.indexOf(',') + 1, data.length) //used for blob

		console.log(cleanData)

		if (state === 'thumbnail') {
			//controle les thumbnails
			addThumbnails(cleanData, fullImage.length - 1)

			fullThumbnails.push(cleanData)
			chrome.storage.local.set({ customThumbnails: fullThumbnails })
		} else {
			//new image loaded from filereader sets image index
			if (state === 'new') {
				changeImgIndex(fullImage.length - 1)
				//save l'index
				chrome.storage.local.set({ customIndex: fullImage.length - 1 })
			}

			//affiche l'image
			imgBackground(b64toBlobUrl(cleanData))
		}
	}

	img.src = e
}

function addThumbnails(data, index) {
	//créer une tag html en plus + remove button

	const div = document.createElement('div')
	const i = document.createElement('img')
	const rem = document.createElement('button')
	const wrap = document.getElementById('bg_tn_wrap')
	const upload = document.getElementById('i_bgfile')

	div.setAttribute('index', index)
	div.setAttribute('class', 'thumbnail')
	rem.setAttribute('class', 'hidden')
	rem.innerText = '✕'
	i.src = b64toBlobUrl(data)

	div.appendChild(i)
	div.appendChild(rem)
	wrap.append(div) //, wrap.children[0]);

	//events
	const getParentIndex = (that) => parseInt(that.parentElement.getAttribute('index'))
	const getIndex = (that) => parseInt(that.getAttribute('index'))
	const removeControl = (show, i) => domthumbnail[i].children[1].setAttribute('class', show ? 'shown' : 'hidden')

	//displays / hides remove button
	div.onmouseenter = function () {
		removeControl(true, getIndex(this))
	}
	div.onmouseleave = function () {
		removeControl(false, getIndex(this))
	}

	//6
	i.onmouseup = function () {
		//affiche l'image voulu
		//lui injecte le bon index

		const index = getParentIndex(this)

		compress(fullImage[index])
		changeImgIndex(index)
		chrome.storage.local.set({ customIndex: index })
	}

	//7
	rem.onmouseup = function () {
		const index = getParentIndex(this)
		let currentIndex = id('background').getAttribute('index')

		//removes thumbnail
		domthumbnail[index].remove()

		//rewrite all thumbs indexes
		for (let i = 0; i < domthumbnail.length; i++) {
			domthumbnail[i].setAttribute('index', i)
		}

		//deletes thumbnail from storage
		//concat  [0, index] à [index + 1, fin]
		const deleteArrItem = (arr) => arr.slice(null, index).concat(arr.slice(index + 1))

		fullImage = deleteArrItem(fullImage)
		chrome.storage.local.set({ custom: fullImage })

		fullThumbnails = deleteArrItem(fullThumbnails)
		chrome.storage.local.set({ customThumbnails: fullThumbnails })

		//celui a suppr plus petit que l'actuel, baisse son index
		if (index <= currentIndex) chrome.storage.local.set({ customIndex: currentIndex - 1 })
	}
}

function unsplash(data, event, startup) {
	//on startup nothing is displayed
	const loadbackground = (url) => (startup ? noDisplayImgLoad(url) : imgBackground(url))

	function noDisplayImgLoad(val, callback) {
		let img = new Image()

		img.onload = callback
		img.src = val
		img.remove()
	}

	function freqControl(state, every, last) {
		const d = new Date()
		if (state === 'set') return every === 'tabs' ? 0 : d.getTime()

		if (state === 'get') {
			let calcLast = 0
			let today = d.getTime()

			if (every === 'hour') calcLast = last + 3600 * 1000
			else if (every === 'day') calcLast = last + 86400 * 1000
			else if (every === 'pause') calcLast = 10 ** 13 - 1 //le jour de la fin du monde lmao

			//retourne le today superieur au calculated last
			return today > calcLast
		}
	}

	function cacheControl(d) {
		//as t on besoin d'une nouvelle image ?
		let needNewImage = freqControl('get', d.every, d.time)
		if (needNewImage) {
			//sauvegarde le nouveau temps
			d.time = freqControl('set', d.every)

			//si next n'existe pas, init
			if (d.next.url === '') {
				req('current', d, true)

				//sinon prendre l'image preloaded (next)
			} else {
				loadbackground(d.next.url)
				credit(d.next)
				req('current', d, false)
			}

			//pas besoin d'image, simplement current
		} else {
			loadbackground(d.current.url)
			credit(d.current)
		}
	}

	function req(which, d, init) {
		function dayCollections() {
			const collections = require('./collections')
			const h = new Date().getHours()
			const h_day = h > 10 && h < 18
			const h_noon = h > 7 && h < 21

			return h_day ? collections.day : h_noon ? collections.noon : collections.night
		}

		obf = (n) =>
			n === 0
				? atob('aHR0cHM6Ly9hcGkudW5zcGxhc2guY29tL3Bob3Rvcy9yYW5kb20/Y29sbGVjdGlvbnM9')
				: atob('MzY4NmMxMjIyMWQyOWNhOGY3OTQ3Yzk0NTQyMDI1ZDc2MGE4ZTBkNDkwMDdlYzcwZmEyYzRiOWY5ZDM3N2IxZA==')
		let xhr = new XMLHttpRequest()
		xhr.open('GET', obf(0) + dayCollections(), true)
		xhr.setRequestHeader('Authorization', `Client-ID ${obf(1)}`)

		xhr.onload = function () {
			let resp = JSON.parse(this.response)

			if (xhr.status >= 200 && xhr.status < 400) {
				let screenWidth = window.devicePixelRatio * screen.width

				resp = {
					url: resp.urls.raw + `&w=${screenWidth}&fm=jpg&q=70`,
					link: resp.links.html,
					username: resp.user.username,
					name: resp.user.name,
					city: resp.location.city,
					country: resp.location.country,
				}

				if (init) {
					//si init, fait 2 req (current, next) et save sur la 2e
					if (which === 'current') {
						d.current = resp
						loadbackground(d.current.url)
						credit(d.current)
						req('next', d, true)
					} else if (which === 'next') {
						d.next = resp
						chrome.storage.sync.set({ dynamic: d })
					}

					//si next existe, current devient next et next devient la requete
					//preload la prochaine image (sans l'afficher)
				} else {
					noDisplayImgLoad(resp.url, () => {
						d.current = d.next
						d.next = resp
						chrome.storage.sync.set({ dynamic: d })
						//console.log("loaded")
					})
				}
			}
		}
		xhr.send()
	}

	function credit(d) {
		let loc = ''

		if (d.city !== null && d.country !== null) loc = `${d.city}, ${d.country} - `
		else if (d.country !== null) loc = `${d.country} - `
		else loc = 'Photo - '

		let infos = {
			location: {
				text: loc,
				url: `${d.link}?utm_source=Bonjourr&utm_medium=referral`,
			},
			artist: {
				text: d.name,
				url: `https://unsplash.com/@${d.username}?utm_source=Bonjourr&utm_medium=referral`,
			},
		}

		if (!startup) imgCredits(infos, 'dynamic')
	}

	if (data && data !== true) cacheControl(data)
	else {
		chrome.storage.sync.get('dynamic', (storage) => {
			//si on change la frequence, juste changer la freq
			if (event) {
				storage.dynamic.every = event
				chrome.storage.sync.set({ dynamic: storage.dynamic })
				return true
			}

			if (storage.dynamic && storage.dynamic !== true) {
				cacheControl(storage.dynamic)
			} else {
				let initDyn = {
					current: {
						url: '',
						link: '',
						username: '',
						name: '',
						city: '',
						country: '',
					},
					next: {
						url: '',
						link: '',
						username: '',
						name: '',
						city: '',
						country: '',
					},
					every: 'hour',
					time: 0,
				}

				cacheControl(initDyn)
			}
		})
	}
}

function filter(cat, val) {
	let result = ''

	switch (cat) {
		case 'init':
			result = `blur(${val[0]}px) brightness(${val[1]})`
			break

		case 'blur':
			result = `blur(${val}px) brightness(${id('i_bright').value})`
			break

		case 'bright':
			result = `blur(${id('i_blur').value}px) brightness(${val})`
			break
	}

	id('background').style.filter = result
}

function darkmode(choice, initStorage) {
	function apply(state) {
		function auto(wdata) {
			//compare current hour with weather sunset / sunrise

			const ls = wdata.lastState
			const sunrise = new Date(ls.sys.sunrise * 1000).getHours()
			const sunset = new Date(ls.sys.sunset * 1000).getHours()
			const hr = new Date().getHours()

			return hr < sunrise || hr > sunset ? 'dark' : ''
		}

		//uses chromesync data on startup, sessionsStorage on change

		const weather = initStorage ? initStorage.weather : localEnc(sessionStorage.data, false).weather
		let bodyClass

		//dark mode is defines by the body class

		switch (state) {
			case 'system':
				bodyClass = 'autodark'
				break

			case 'auto':
				bodyClass = auto(weather)
				break

			case 'enable':
				bodyClass = 'dark'
				break

			default:
				bodyClass = ''
		}

		document.body.setAttribute('class', bodyClass)
	}

	//apply class, save if event
	if (choice) {
		apply(choice, true)
		chrome.storage.sync.set({ dark: choice })
	} else {
		apply(initStorage.dark)
	}
}

function searchbar(event, that, storage) {
	function display(value, init) {
		id('sb_container').setAttribute('class', value ? 'shown' : 'hidden')

		id('searchbar').onkeyup = function (e) {
			if (e.which === 13) window.location = localisation(this.value)
		}

		if (!init) {
			chrome.storage.sync.set({ searchbar: value })
			id('choose_searchengine').setAttribute('class', value ? 'shown' : 'hidden')
		}
	}

	function localisation(q) {
		let response = '',
			lang = storage.lang || 'en',
			engine = storage.searchbar_engine || 's_google'

		//les const l_[engine] sont dans lang.js

		switch (engine) {
			case 's_ddg':
				response = 'https://duckduckgo.com/?q=' + q + l_ddg[lang]
				break
			case 's_google':
				response = 'https://www.google' + l_google[lang] + q
				break
			case 's_startpage':
				response = 'https://www.startpage.com/do/dsearch?query=' + q + l_startpage[lang]
				break
			case 's_qwant':
				response = 'https://www.qwant.com/?q=' + q + l_qwant[lang]
				break
			case 's_yahoo':
				response = 'https://' + l_yahoo[lang] + q
				break
			case 's_bing':
				response = 'https://www.bing.com/search?q=' + q
				break
			case 's_ecosia':
				response = 'https://www.ecosia.org/search?q=' + q
				break
		}

		return response
	}

	function engine(value, init) {
		const names = {
			s_startpage: 'Startpage',
			s_ddg: 'DuckDuckGo',
			s_qwant: 'Qwant',
			s_ecosia: 'Ecosia',
			s_google: 'Google',
			s_yahoo: 'Yahoo',
			s_bing: 'Bing',
		}

		id('searchbar').setAttribute('placeholder', tradThis('Search on ' + names[value]))
		if (!init) chrome.storage.sync.set({ searchbar_engine: value })
	}

	if (event) event === 'searchbar' ? display(that.checked) : engine(that.value)
	//init
	else {
		let searchbar = storage.searchbar || false
		let searchengine = storage.searchbar_engine || 's_google'

		//display
		display(searchbar, true)
		engine(searchengine, true)
	}
}

function signature() {
	let v = "<a href='https://victr.me/'>Victor Azevedo</a>"
	let t = "<a href='https://tahoe.be'>Tahoe Beetschen</a>"
	let e = document.createElement('span')

	e.innerHTML = Math.random() > 0.5 ? ` ${v} & ${t}` : ` ${t} & ${v}`
	id('rand').appendChild(e)
}

function showPopup(data) {
	id('go').setAttribute(
		'href',
		navigator.userAgent.includes('Chrome')
			? 'https://chrome.google.com/webstore/detail/bonjourr-%C2%B7-minimalist-lig/dlnejlppicbjfcfcedcflplfjajinajd/reviews'
			: 'https://addons.mozilla.org/en-US/firefox/addon/bonjourr-startpage/'
	)

	//s'affiche après 10 tabs
	if (data > 10) {
		const popup = id('popup')
		const closePopup = id('closePopup')
		const go = id('go')
		const close = function () {
			popup.classList.add('removed')
			chrome.storage.sync.set({ reviewPopup: 'removed' })
		}

		//attendre avant d'afficher
		setTimeout(function () {
			popup.classList.add('shown')
		}, 2000)

		closePopup.onclick = close
		go.onclick = close
	} else if (typeof data === 'number') chrome.storage.sync.set({ reviewPopup: data + 1 })
	else if (data !== 'removed') chrome.storage.sync.set({ reviewPopup: 0 })
	else if (data === 'removed') document.body.removeChild(popup)
}

function proFunctions(obj) {
	function customFont(data, event) {
		function setFont(f, is) {
			function saveFont(text) {
				const font = {
					family: id('i_customfont').value,
					weight: id('i_weight').value,
					size: id('i_size').value,
					str: text ? text : id('fontstyle').innerText,
				}

				chrome.storage.sync.set({ font: font })
			}

			function applyFont(text) {
				if (f.str || text) id('fontstyle').innerText = text ? text : f.str

				if (f.family) {
					document.body.style.fontFamily = f.family
					id('clock').style.fontFamily = f.family
				}

				if (f.weight) document.body.style.fontWeight = f.weight

				if (f.size) dominterface.style.fontSize = f.size + 'px'
			}

			//si on change la famille
			if (is === 'event' && (f.family !== null || f.weight !== null)) {
				let family = id('i_customfont').value,
					weight = ':' + f.weight || '',
					url = `https://fonts.googleapis.com/css?family=${family}${weight}`

				fetch(url)
					.then((response) => response.text())
					.then((text) => {
						text = text.replace(/(\r\n|\n|\r|  )/gm, '')
						applyFont(text)
						saveFont(text)
					})

				//si on change autre chose que la famille
			} else if (is === 'event') {
				saveFont()
				applyFont()

				//si ça n'est pas un event
			} else applyFont()
		}

		//init
		if (data) setFont(data)
		if (event) setFont(event, 'event')
	}

	function customCss(data, event) {
		const styleHead = id('styles')

		// Active l'indentation
		function syntaxControl(e, that) {
			if (e.key === '{') {
				that.value = that.value + `{\r  \r}`

				that.selectionStart = that.selectionStart - 2
				that.selectionEnd = that.selectionEnd - 2

				e.preventDefault()

				/*let selectionStartPos = this.selectionStart;
				let selectionEndPos   = this.selectionEnd;
				let oldContent        = this.value;

				//console.log(that.selectionStart);

				this.value = oldContent.substring( 0, selectionStartPos ) + "\t" + oldContent.substring( selectionEndPos );

				this.selectionStart = this.selectionEnd = selectionStartPos + 1;*/
			}
		}

		if (data) {
			styleHead.innerText = data
		}

		if (event) {
			const e = event.e
			const that = event.that
			syntaxControl(e, that)

			setTimeout(() => {
				const val = id('cssEditor').value
				styleHead.innerText = val
				chrome.storage.sync.set({ css: val })
			}, 200)
		}
	}

	function linksrow(data, event) {
		function setRows(val) {
			domlinkblocks.style.width = `${val * 7}em`
		}

		if (data !== undefined) setRows(data)

		if (event) {
			//id("e_row").innerText = event;
			setRows(event)
			slowRange({ linksrow: parseInt(event) })
		}
	}

	function greeting(data, event) {
		let text = id('greetings').innerText
		let pause

		function apply(val) {
			//greeting is classic text + , + custom greet
			id('greetings').innerText = `${text}, ${val}`

			//input empty removes ,
			if (val === '') id('greetings').innerText = text
		}

		function setEvent(val) {
			const virgule = text.indexOf(',')

			//remove last input from greetings
			text = text.slice(0, virgule === -1 ? text.length : virgule)
			apply(val)

			//reset save timeout
			//wait long enough to save to storage
			if (pause) clearTimeout(pause)

			pause = setTimeout(function () {
				chrome.storage.sync.set({ greeting: val })
			}, 1200)
		}

		//init
		if (data !== undefined) apply(data)
		if (event !== undefined) setEvent(event)
	}

	function hideElem(data, e, settingsinit) {
		let object = {}

		if (e === undefined) {
			//quit on first startup
			if (!data) return false

			for (let d of data) {
				//le nouveau
				object = {
					dom: id(d),
					src: d,
					not: true,
				}

				principale(object)
			}
		} else {
			//object qu'on connait
			object = {
				parent: e.parentElement,
				dom: id(e.getAttribute('data')),
				src: e.getAttribute('data'),
				not: e.getAttribute('class') !== 'clicked', //le toggle
			}

			principale(object)
			eventStorage()
		}

		function principale(objet) {
			let toggleWrap = true
			let toggleWrapFunc = function (elem) {
				id(elem).style.display = objet.not ? 'none' : 'flex'
				if (e !== undefined) clas(objet.parent, objet.not ? 'allhidden' : '')
			}

			//toggle l'opacité du dom concerné

			if (e !== undefined) clas(e, objet.not ? 'clicked' : '')
			objet.dom.style.opacity = objet.not ? '0' : '1'

			//si event
			//si un bouton n'est pas cliqué dans une catégorie
			//ne pas toggle le wrap
			if (objet.not && !data) {
				let all = objet.parent.querySelectorAll('button')

				for (let r of all) if (r.getAttribute('class') !== 'clicked') toggleWrap = false
			}

			//si init
			//si tout n'est pas caché dans une catégorie
			//ne pas toggle le wrap
			else if (data) {
				//wtf is this

				if (objet.src === 'time-container' || objet.src === 'date')
					if (!data.includes('time-container') || !data.includes('date')) toggleWrap = false

				if (objet.src === 'greetings' || objet.src === 'weather_desc' || objet.src === 'w_icon')
					if (!data.includes('greetings') || !data.includes('weather_desc') || !data.includes('w_icon'))
						toggleWrap = false
			}

			//toogle les wrap en fonctions du bouton cliqué

			if (toggleWrap) {
				switch (objet.src) {
					case 'time-container':
					case 'date':
						toggleWrapFunc('time')
						break

					case 'greetings':
					case 'weather_desc':
					case 'w_icon':
						toggleWrapFunc('main')
						break

					/*case "linkblocks":
						toggleWrapFunc("linkblocks")
						break*/
				}
			}
		}

		function eventStorage() {
			//c'est un event, on store
			if (e !== undefined && !settingsinit) {
				//parse through les dom a masquer, les sauvegarde
				//liste de {id du dom a masquer, button a init}

				let all = id('hideelem').querySelectorAll('button')
				let toStore = []

				for (let r of all) if (r.getAttribute('class') === 'clicked') toStore.push(r.getAttribute('data'))

				chrome.storage.sync.set({ hide: toStore })
			}
		}
	}

	switch (obj.which) {
		case 'font':
			customFont(obj.data, obj.event)
			break

		case 'css':
			customCss(obj.data, obj.event)
			break

		case 'row':
			linksrow(obj.data, obj.event)
			break

		case 'greet':
			greeting(obj.data, obj.event)
			break

		case 'hide':
			hideElem(obj.data, obj.event, obj.sett)
			break
	}
}

//comme un onload, sans le onload
chrome.storage.sync.get(null, (data) => {
	//1.8.3 -> 1.9 data transfer
	if (localStorage.lang) {
		data.lang = localStorage.lang
		chrome.storage.sync.set({ lang: localStorage.lang })
		localStorage.removeItem('lang')
	}

	//pour que les settings y accede plus facilement
	disposableData = localEnc(JSON.stringify(data))

	traduction(null, data.lang)
	greetings()
	date(null, data.usdate)
	newClock(null, data.clock)
	darkmode(null, data)
	initBackground(data)
	weather(null, null, data)
	quickLinks(null, null, data)
	searchbar(null, null, data)
	showPopup(data.reviewPopup)

	//init profunctions
	proFunctions({ which: 'hide', data: data.hide })
	proFunctions({ which: 'font', data: data.font })
	proFunctions({ which: 'css', data: data.css })
	proFunctions({ which: 'row', data: data.linksrow })
	proFunctions({ which: 'greet', data: data.greeting })

	clas(dominterface, '')
	clas(domshowsettings, '')

	//safe font for different alphabet
	/*if (data.lang === "ru" || data.lang === "sk")
		id("styles").innerText = `
			body, #settings, #settings h5 {font-family: Helvetica, Calibri}`*/

	if (mobilecheck) {
		dominterface.style.minHeight = '90vh'
		dominterface.style.padding = '0 0 10vh 0'
	}
})
