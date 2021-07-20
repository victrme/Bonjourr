//

function slowRange(tosave, time = 150) {
	clearTimeout(rangeActive)
	rangeActive = setTimeout(function () {
		chrome.storage.sync.set(tosave)
	}, time)
}

function slow(that) {
	that.setAttribute('disabled', '')
	stillActive = setTimeout(() => {
		that.removeAttribute('disabled')
		clearTimeout(stillActive)
		stillActive = false
	}, 700)
}

function traduction(ofSettings, init) {
	//
	function traduis(lang = 'en') {
		//
		document.documentElement.setAttribute('lang', lang)

		if (lang !== 'en') {
			const trns = (ofSettings ? id('settings') : document).querySelectorAll('.trn')
			const changeText = (dom, str) => (dict[str] ? (dom.textContent = dict[str][lang]) : '')

			trns.forEach((trn) => changeText(trn, trn.textContent))
		}
	}

	if (init && !ofSettings) traduis(init)
	else chrome.storage.sync.get('lang', (data) => traduis(data.lang))
}

function tradThis(str) {
	const lang = document.documentElement.getAttribute('lang') || 'en'
	return lang === 'en' ? str : dict[str][lang]
}

function newClock(eventObj, init) {
	function displayControl() {
		const numeric = id('clock'),
			analog = id('analogClock'),
			analogSec = id('analogSeconds')

		//cache celle qui n'est pas choisi
		clas(numeric, clock.analog, 'hidden')
		clas(analog, !clock.analog, 'hidden')

		//cache l'aiguille des secondes
		clas(analogSec, !clock.seconds && clock.analog, 'hidden')
	}

	function main(change) {
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
				return val.toString()
			}

			let h = clock.ampm ? toAmpm(timearray[0]) : timearray[0],
				m = fixunits(timearray[1]),
				s = fixunits(timearray[2])

			if (clock.seconds) {
				domclock.textContent = `${h}:${m}:${s}`
			} else if (change || domclock.textContent.length === 0 || s === '00') {
				domclock.textContent = `${h}:${m}`
			}
		}

		function analog(timearray) {
			function rotation(that, val) {
				that.style.transform = `rotate(${parseInt(val)}deg)`
			}

			let s = timearray[2] * 6,
				m = timearray[1] * 6, // + (s / 60),
				h = timearray[0] * 30 //% 12 / 12 * 360 + (m / 12);

			//bouge les aiguilles minute et heure quand seconde ou minute arrive à 0
			if (true || timearray[2] === 0) rotation(id('minutes'), m)
			if (true || timearray[1] === 0) rotation(id('hours'), h)

			//tourne pas les secondes si pas de seconds
			if (clock.seconds) rotation(id('analogSeconds'), s)
		}

		//timezone control
		//analog control
		const array = time()

		array[0] = timezone(clock.timezone, array[0])
		clock.analog ? analog(array) : numerical(array)
	}

	function startClock(change) {
		//stops multiple intervals
		clearInterval(lazyClockInterval)

		displayControl()
		main(change)
		lazyClockInterval = setInterval(main, 1000)
	}

	function changeAnalogFace(face = 'none') {
		//
		// Clockwise
		const chars = {
			none: ['', '', '', ''],
			number: ['12', '3', '6', '9'],
			roman: ['XII', 'III', 'VI', 'IX'],
			marks: ['│', '─', '│', '─'],
		}

		document.querySelectorAll('#analogClock .numbers').forEach((mark, i) => (mark.textContent = chars[face][i]))
	}

	//controle très stricte de clock comme vous pouvez le voir
	//(je sais que je peux faire mieux)
	let clock = {
		analog: false,
		seconds: false,
		ampm: false,
		timezone: 'auto',
		face: 'none',
	}

	if (eventObj) {
		chrome.storage.sync.get('clock', (data) => {
			if (data.clock) {
				clock = {
					analog: data.clock.analog,
					seconds: data.clock.seconds,
					ampm: data.clock.ampm,
					timezone: data.clock.timezone,
					face: data.clock.face,
				}
			}

			//event change of clock parameters
			clock[eventObj.param] = eventObj.value
			chrome.storage.sync.set({ clock: clock })

			startClock(true)
			changeAnalogFace(clock.face)
		})
	} else {
		if (init) {
			clock = {
				analog: init.analog,
				seconds: init.seconds,
				ampm: init.ampm,
				timezone: init.timezone,
				face: init.face,
			}
		}

		startClock(true)
		changeAnalogFace(clock.face)
		canDisplayInterface('clock')
	}
}

function date(event, usdate) {
	const date = new Date(),
		jour = tradThis(days[date.getDay()]),
		mois = tradThis(months[date.getMonth()]),
		chiffre = date.getDate()

	id('date').textContent = usdate ? `${jour}, ${mois} ${chiffre}` : `${jour} ${chiffre} ${mois}`
	if (event) chrome.storage.sync.set({ usdate: usdate })
}

function greetings(name, isevent) {
	const greets = [
		['Good Night', 7],
		['Good Morning', 12],
		['Good Afternoon', 18],
		['Good Evening', 24],
	]

	const hour = new Date().getHours()
	const greet = tradThis(greets.filter((greet) => hour < greet[1])[0][0])
	const customName = name ? `, ${name}` : ''

	id('greetings').textContent = greet + customName

	if (isevent) slowRange({ greeting: name }, 500)
}

function quickLinks(event, that, initStorage) {
	// Pour ne faire qu'un seul storage call
	// [{ index: number, url: string }]
	const favsToUpdate = []
	let hovered, dragged, current

	//enleve les selections d'edit
	const removeLinkSelection = () =>
		domlinkblocks.querySelectorAll('.l_icon_wrap').forEach(function (e) {
			clas(e, false, 'selected')
		})

	//initialise les blocs en fonction du storage
	//utilise simplement une boucle de appendblock
	function initblocks(links) {
		if (links.length > 0) links.map((a, i) => appendblock(a, i, links))
		canDisplayInterface('links')
	}

	function addIcon(elem, arr, index, links) {
		//prend le domaine de n'importe quelle url
		const a = document.createElement('a')
		a.href = arr.url
		const hostname = a.hostname

		// fetch l'icône et l'ajoute
		const img = new Image()
		const url = 'https://api.faviconkit.com/' + hostname + '/144'

		img.onload = () => {
			// Change to loaded favicon
			elem.querySelector('img').src = url

			// Save changes memory var
			favsToUpdate.push({ index, url })
			const howManyToSave = links.filter((link) => link.icon === 'src/images/icons/favicon.png')

			// Last to save ? Update storage
			if (favsToUpdate.length === 1 || favsToUpdate.length === howManyToSave.length) {
				favsToUpdate.forEach((link) => (links[link.index].icon = link.url))
				chrome.storage.sync.set({ links: links })
			}
		}
		img.src = url
		img.remove()
	}

	function appendblock(arr, index, links) {
		let icon = arr.icon
		let title = stringMaxSize(arr.title, 32)
		let url = stringMaxSize(arr.url, 256)

		// no icon ? + 1.9.2 dead favicons fix
		if (icon.length === 0 || icon === 'src/images/icons/favicon.png') {
			icon = 'src/assets/images/interface/loading.gif'
		}

		//le DOM du block
		const lIcon = document.createElement('img')
		const lIconWrap = document.createElement('div')
		const blockTitle = document.createElement('span')
		const block = document.createElement('div')
		const block_parent = document.createElement('div')

		function waitForIconToApply(iconurl) {
			lIcon.className = 'l_icon'
			lIcon.src = iconurl

			lIconWrap.className = 'l_icon_wrap'
			lIconWrap.appendChild(lIcon)

			blockTitle.textContent = title

			block.className = 'block'
			block.setAttribute('source', url)
			block.appendChild(lIconWrap)
			title ? block.appendChild(blockTitle) : ''

			block_parent.setAttribute('class', 'block_parent')
			block_parent.setAttribute('draggable', 'true')
			block_parent.appendChild(block)

			//l'ajoute au dom
			domlinkblocks.appendChild(block_parent)

			//met les events au dernier elem rajouté
			addEvents(block_parent)

			//si online et l'icon charge, en rechercher une
			const imageLoading = icon === 'src/assets/images/interface/loading.gif'
			if (window.navigator.onLine && imageLoading) addIcon(block_parent, arr, index, links)
		}

		if (icon.startsWith('alias:')) chrome.storage.local.get([icon], (data) => waitForIconToApply(data[icon]))
		else waitForIconToApply(icon)
	}

	function addEvents(elem) {
		function handleDrag(is, that) {
			chrome.storage.sync.get('links', (data) => {
				const i = findindex(that)

				switch (is) {
					case 'start':
						dragged = [elem, data.links[i], i]
						break

					case 'enter':
						hovered = [elem, data.links[i], i]
						break

					case 'end': {
						//changes html blocks
						current = hovered[0].innerHTML
						hovered[0].innerHTML = dragged[0].innerHTML
						dragged[0].innerHTML = current

						// Switches link storage
						let allLinks = data.links

						allLinks[dragged[2]] = hovered[1]
						allLinks[hovered[2]] = dragged[1]

						chrome.storage.sync.set({ links: allLinks })
						break
					}
				}
			})
		}

		elem.ondragstart = function (e) {
			e.stopPropagation()
			e.dataTransfer.setData('text/plain', e.target.id)
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
			e.which === 3 ? editlink(this) : !has(id('settings'), 'shown') ? openlink(this, e) : ''
		}
	}

	function showDelIcon(input) {
		const img = input.nextElementSibling
		if (input.value === '') img.classList.remove('shown')
		else img.classList.add('shown')
	}

	function editEvents() {
		function closeEditLink() {
			removeLinkSelection()
			id('edit_linkContainer').classList.add('hiding')
			setTimeout(() => id('edit_linkContainer').setAttribute('class', ''), BonjourrAnimTime)
		}

		function emptyAndHideIcon(e) {
			e.target.previousElementSibling.value = ''
			e.target.classList.remove('shown')
		}

		id('e_delete').onclick = function () {
			removeLinkSelection()
			removeblock(parseInt(id('edit_link').getAttribute('index')))
			clas(id('edit_linkContainer'), false, 'shown')
			if (id('settings')) linksInputDisable(false)
		}

		id('e_submit').onclick = function () {
			removeLinkSelection()
			editlink(null, parseInt(id('edit_link').getAttribute('index')))
		}

		// close on button
		id('e_close').onclick = () => closeEditLink()

		// close on outside click
		id('edit_linkContainer').onmousedown = (e) => {
			if (e.target.id === 'edit_linkContainer') closeEditLink()
		}

		id('re_title').onclick = (e) => emptyAndHideIcon(e)
		id('re_url').onclick = (e) => emptyAndHideIcon(e)
		id('re_iconurl').onclick = (e) => emptyAndHideIcon(e)

		id('e_title').onkeyup = (e) => showDelIcon(e.target)
		id('e_url').onkeyup = (e) => showDelIcon(e.target)
		id('e_iconurl').onkeyup = (e) => showDelIcon(e.target)
	}

	function editlink(that, i) {
		//
		const e_title = id('e_title')
		const e_url = id('e_url')
		const e_iconurl = id('e_iconurl')

		const updated = {
			title: stringMaxSize(e_title.value, 32),
			url: stringMaxSize(e_url.value, 256),
			icon: stringMaxSize(e_iconurl.value, 8080),
		}

		if (i || i === 0) {
			chrome.storage.sync.get('links', (data) => {
				let allLinks = [...data.links]
				const block = domlinkblocks.children[i + 1]

				// Update on interface
				Object.entries(allLinks[i]).forEach(([key, val]) => {
					if (val !== updated[key]) {
						//
						switch (key) {
							case 'title': {
								// Adds span title or updates it
								if (!block.querySelector('span')) {
									const span = `<span>${updated[key]}</span>`
									block.querySelector('.l_icon_wrap').insertAdjacentHTML('afterEnd', span)
								} else block.querySelector('span').textContent = updated[key]
								break
							}

							case 'url':
								block.querySelector('.block').setAttribute('source', updated[key])
								break

							case 'icon': {
								block.querySelector('img').src = updated.icon

								// Saves to an alias if icon too big
								if (updated.icon.length > 64) {
									const alias = 'alias:' + Math.random().toString(26).substring(2)
									const tosave = {}

									tosave[alias] = updated.icon
									chrome.storage.local.set(tosave)
									updated.icon = alias
									e_iconurl.value = alias
								}

								// Removes old icon from storage if alias
								if (allLinks[i].icon.startsWith('alias:')) {
									chrome.storage.local.remove(allLinks[i].icon)
								}

								break
							}
						}

						allLinks[i][key] = updated[key]
					}
				})

				// Update in storage
				chrome.storage.sync.set({ links: allLinks })
			})
		}

		//affiche edit avec le bon index
		else {
			const index = findindex(that)
			const liconwrap = that.querySelector('.l_icon_wrap')
			const container = id('edit_linkContainer')
			const openSettings = has(id('settings'), 'shown')

			clas(liconwrap, true, 'selected')
			clas(container, true, 'shown')
			clas(container, openSettings, 'pushed')

			id('edit_link').setAttribute('index', index)

			chrome.storage.sync.get('links', (data) => {
				const { title, url, icon } = data.links[index]

				e_title.setAttribute('placeholder', tradThis('Title'))
				e_iconurl.setAttribute('placeholder', tradThis('Icon'))

				e_title.value = title
				e_url.value = url
				e_iconurl.value = icon

				showDelIcon(e_title)
				showDelIcon(e_url)
				showDelIcon(e_iconurl)
			})
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

	function findindex(that) {
		//passe la liste des blocks, s'arrete si that correspond
		//renvoie le nombre de loop pour l'atteindre

		const list = domlinkblocks.children

		for (let i = 0; i < list.length; i++) if (that === list[i]) return i - 1
	}

	function removeblock(index) {
		chrome.storage.sync.get(['links', 'searchbar'], (data) => {
			function ejectIntruder(arr) {
				if (arr.length === 1) return []

				if (index === 0) arr.shift()
				else if (index === arr.length) arr.pop()
				else arr.splice(index, 1)

				return arr
			}

			if (data.links[index].icon.startsWith('alias:')) {
				chrome.storage.local.remove(data.links[index].icon)
			}

			var linkRemd = ejectIntruder(data.links)

			//enleve le html du block
			var block_parent = domlinkblocks.children[index + 1]
			block_parent.setAttribute('class', 'block_parent removed')

			setTimeout(function () {
				domlinkblocks.removeChild(block_parent)

				//enleve linkblocks si il n'y a plus de links
				if (linkRemd.length === 0) domlinkblocks.style.visibility = 'hidden'
			}, 200)

			chrome.storage.sync.set({ links: linkRemd })
		})
	}

	function linkSubmission() {
		//

		function saveLink(filteredLink) {
			//remet a zero les inputs
			id('i_title').value = ''
			id('i_url').value = ''

			chrome.storage.sync.get('links', (data) => {
				const links = data.links || []

				if (links.length === 19) linksInputDisable(true)

				//array est tout les links + le nouveau
				if (links) {
					links.push(filteredLink)
					domlinkblocks.style.visibility = 'visible'
				}

				chrome.storage.sync.set({ links: links })
				appendblock(filteredLink, links.length - 1, links)
			})
		}

		function filterUrl(str) {
			//
			const to = (scheme) => str.startsWith(scheme)
			const acceptableSchemes = to('file://') || to('http://') || to('https://')
			const unacceptable = to('about:') || to('chrome://')

			return acceptableSchemes ? str : unacceptable ? false : 'https://' + str
		}

		let links = {
			title: stringMaxSize(id('i_title').value, 32),
			url: stringMaxSize(filterUrl(id('i_url').value), 256),
			icon: '',
		}

		//si l'url filtré est juste
		if (links.url && id('i_url').value.length > 2) {
			//et l'input n'a pas été activé ya -1s
			if (!stillActive) saveLink(links)
		}
	}

	function linksInputDisable(max) {
		const doms = ['i_title', 'i_url', 'submitlink']
		const domsubmitlink = id('submitlink')

		if (max) doms.forEach((dom) => id(dom).setAttribute('disabled', ''))
		else doms.forEach((dom) => id(dom).removeAttribute('disabled'))

		clas(domsubmitlink, max, 'max')
	}

	switch (event) {
		case 'input':
		case 'button':
			linkSubmission()
			break

		case 'maxControl':
			linksInputDisable(that)

		case 'linknewtab': {
			chrome.storage.sync.set({ linknewtab: that.checked ? true : false })
			id('hiddenlink').setAttribute('target', '_blank')
			break
		}
	}

	if (initStorage) {
		initblocks(initStorage.links || [])

		// No need to activate edit events asap
		setTimeout(() => {
			id('edit_linkContainer').oncontextmenu = (e) => e.preventDefault()
			editEvents()
		}, 50)
	}
}

function linksrow(data, event) {
	function setRows(val) {
		domlinkblocks.style.width = `${val * 7}em`
	}

	if (data !== undefined) setRows(data)

	if (event) {
		setRows(event)
		slowRange({ linksrow: parseInt(event) })
	}
}

function weather(event, that, init) {
	let weatherToSave = {}
	const date = new Date()
	const i_city = id('i_city')
	const i_ccode = id('i_ccode')
	const sett_city = id('sett_city')
	const current = id('current')
	const forecast = id('forecast')
	const widget = id('widget')
	const WEATHER_API_KEY = [
		'YTU0ZjkxOThkODY4YTJhNjk4ZDQ1MGRlN2NiODBiNDU=',
		'Y2U1M2Y3MDdhZWMyZDk1NjEwZjIwYjk4Y2VjYzA1NzE=',
		'N2M1NDFjYWVmNWZjNzQ2N2ZjNzI2N2UyZjc1NjQ5YTk=',
	]

	function initWeather() {
		let param = {
			unit: 'metric',
			city: 'Paris',
			ccode: 'FR',
			location: [],
		}

		navigator.geolocation.getCurrentPosition(
			(pos) => {
				//update le parametre de location
				param.location.push(pos.coords.latitude, pos.coords.longitude)
				request(param, false)
				request(param, true)
			},
			(refused) => {
				request(param, true)
				request(param, false)
			}
		)
	}

	function request(params, forecast) {
		function saveCurrent(response) {
			//

			weatherToSave = {
				...weatherToSave,
				lastCall: Math.floor(new Date().getTime() / 1000),
				lastState: {
					feels_like: response.main.feels_like,
					temp_max: response.main.temp_max,
					sunrise: response.sys.sunrise,
					sunset: response.sys.sunset,
					description: response.weather[0].description,
					icon_id: response.weather[0].id,
				},
			}

			chrome.storage.sync.set({ weather: weatherToSave })
			displaysCurrent(weatherToSave)
		}

		function saveForecast(response) {
			//

			const thisdate = new Date()
			const todayHour = thisdate.getHours()
			let forecastDay = thisdate.getDate()
			let tempMax = -99

			// Late evening forecast for tomorrow
			if (todayHour > 18) {
				const tomorrow = thisdate.setDate(thisdate.getDate() + 1)
				forecastDay = new Date(tomorrow).getDate()
			}

			// Get the highest temp for the specified day
			response.list.forEach((elem) => {
				if (new Date(elem.dt * 1000).getDate() === forecastDay)
					tempMax < elem.main.temp_max ? (tempMax = Math.round(elem.main.temp_max)) : ''
			})

			weatherToSave.fcHigh = tempMax
			weatherToSave.forecastLastCall = Math.floor(thisdate.getTime() / 1000)

			chrome.storage.sync.set({ weather: weatherToSave })
			displaysForecast(weatherToSave)
		}

		let url = 'https://api.openweathermap.org/data/2.5/'
		const lang = document.documentElement.getAttribute('lang')
		const [lat, lon] = params.location || [0, 0]
		const unit = params.unit || 'metric'

		url += `${forecast ? 'forecast' : 'weather'}?appid=${atob(WEATHER_API_KEY[forecast ? 0 : 1])}`
		url += params.location ? `&lat=${lat}&lon=${lon}` : `&q=${encodeURI(params.city)},${params.ccode}`
		url += `&units=${unit}&lang=${lang}`

		// Inits global object
		if (Object.keys(weatherToSave).length === 0) {
			weatherToSave = params
		}

		// fetches, parses and apply callback
		fetch(url).then((data) => {
			if (data.ok) data.json().then((json) => (forecast ? saveForecast(json) : saveCurrent(json)))
		})
	}

	function cacheControl(storage) {
		const now = Math.floor(date.getTime() / 1000)

		if (storage) {
			//
			// Current: 30 mins
			if (navigator.onLine && (now > storage.lastCall + 1800 || sessionStorage.lang)) {
				sessionStorage.removeItem('lang')
				request(storage, false)
			} else displaysCurrent(storage)

			// Forecast: 3h
			if (navigator.onLine && (!storage.forecastLastCall || now > storage.forecastLastCall + 10800)) {
				request(storage, true)
			} else displaysForecast(storage)
		}

		// First startup
		else initWeather()
	}

	function displaysCurrent(weather) {
		let filename = 'clearsky'

		// Openweathermap is weird, not me ok
		// prettier-ignore
		switch (weather.lastState.icon_id) {
			case 200: case 201: case 202: case 210:
			case 212: case 221: case 230: case 231:
			case 232:
				filename = 'thunderstorm'
				break

			case 300: case 301: case 302: case 310:
				filename = 'lightdrizzle'
				break

			case 312: case 313: case 314: case 321:
				filename = 'showerdrizzle'
				break

			case 500: case 501: case 502: case 503:
				filename = 'lightrain'
				break

			case 504: case 520: case 521: case 522:
			case 531:
				filename = 'showerrain'
				break

			case 511: case 600: case 601: case 602:
			case 611: case 612: case 613: case 615:
			case 616: case 620: case 621: case 622:
				filename = 'snow'
				break

			case 701: case 711: case 721: case 731:
			case 741: case 751: case 761: case 762:
			case 771: case 781:
				filename = 'mist'
				break
			
			case 800:
				filename = 'clearsky'
				break

			case 801:
				filename = 'fewclouds'
				break
		
			case 802:
				filename = 'brokenclouds'
				break
		
				case 803: case 804:
				filename = 'overcastclouds'
				break

			default:
				filename = 'clearsky'
				break
		}

		// Widget icon
		const widgetIcon = widget.querySelector('img')
		const { now, rise, set } = sunTime()
		const timeOfDay = now < rise || now > set ? 'night' : 'day'
		const iconSrc = `src/assets/images/weather/${timeOfDay}/${filename}.png`

		const icon = document.createElement('img')
		icon.src = iconSrc
		icon.setAttribute('draggable', 'false')

		!widgetIcon ? widget.prepend(icon) : widgetIcon.setAttribute('src', iconSrc)

		// Description
		const desc = weather.lastState.description
		const temp = Math.floor(weather.lastState.feels_like)

		current.textContent = `${desc[0].toUpperCase() + desc.slice(1)}. ${tradThis('It is currently')} ${temp}°`
		widget.querySelector('p').textContent = temp + '°'

		clas(current, false, 'wait')
		clas(widget, false, 'wait')
	}

	function displaysForecast(weather) {
		const when = tradThis(date.getHours() > 21 ? 'tomorrow' : 'today')

		forecast.textContent = `${tradThis('with a high of')} ${weather.fcHigh}° ${when}.`
		clas(forecast, false, 'wait')
	}

	function updatesWeather() {
		//

		function fetches(weather) {
			request(weather, false)
			request(weather, true)
		}

		slow(that)

		chrome.storage.sync.get('weather', (data) => {
			switch (event) {
				case 'units': {
					data.weather.unit = that.checked ? 'imperial' : 'metric'
					fetches(data.weather)
					break
				}

				case 'city': {
					if (i_city.value.length < 2) {
						return false
					}

					data.weather.ccode = i_ccode.value
					data.weather.city = i_city.value

					fetches(data.weather)

					i_city.setAttribute('placeholder', data.weather.city)
					i_city.value = ''
					i_city.blur()
					break
				}

				case 'geol': {
					data.weather.location = []
					clas(sett_city, that.checked, 'hidden')

					if (that.checked) {
						that.setAttribute('disabled', '')

						navigator.geolocation.getCurrentPosition(
							(pos) => {
								//update le parametre de location
								data.weather.location.push(pos.coords.latitude, pos.coords.longitude)
								fetches(data.weather)
							},
							(refused) => {
								//désactive geolocation if refused
								that.checked = false
								if (!data.weather.city) initWeather()
							}
						)
					} else {
						i_city.setAttribute('placeholder', data.weather.city)
						i_ccode.value = data.weather.ccode

						data.weather.location = false
						fetches(data.weather)
					}
					break
				}
			}
		})
	}

	// Event & Init
	if (event) updatesWeather()
	else cacheControl(init)

	// Detect forecast display before it fetches
	const isTimeForForecast = date.getHours() < 12 || date.getHours() > 21
	clas(forecast, isTimeForForecast, 'shown')

	// Checks every 5 minutes if weather needs update
	setTimeout(() => {
		navigator.onLine ? chrome.storage.sync.get(['weather'], (data) => cacheControl(data.weather)) : ''
	}, 5 * 60 * 1000)
}

function initBackground(data) {
	const type = data.background_type || 'dynamic'

	if (type === 'custom') {
		chrome.storage.local.get(null, (datalocal) => {
			const customList = datalocal.custom || []

			if (customList.length > 0) {
				localBackgrounds({
					local: datalocal,
					every: data.custom_every,
					time: data.custom_time,
				})
			} else {
				// If no custom, change to dynamic
				unsplash(data)
				chrome.storage.sync.set({ background_type: 'dynamic' })
			}
		})

		// Not Custom, load dynamic
	} else unsplash(data)

	const blur = data.background_blur !== undefined ? data.background_blur : 15
	const bright = data.background_bright !== undefined ? data.background_bright : 0.8

	filter('init', [parseFloat(blur), parseFloat(bright)])
}

function imgBackground(val) {
	let img = new Image()

	img.onload = () => {
		id('background_overlay').style.opacity = `1`
		id('background').style.backgroundImage = `url(${val})`
	}

	img.src = val
	img.remove()
}

function freqControl(state, every, last) {
	const d = new Date()

	switch (state) {
		case 'set':
			return every === 'tabs' ? 0 : d.getTime()

		case 'get': {
			let calcLast = 0
			let today = d.getTime()

			switch (every) {
				case 'hour':
					calcLast = last + 3600 * 1000
					break

				case 'day':
					calcLast = last + 86400 * 1000
					break

				case 'pause':
					calcLast = 9999999999999
					break
			}

			return today > calcLast
		}
	}
}

function localBackgrounds(init, thumbnail, newfile) {
	function applyCustomBackground(backgrounds, index) {
		const background = backgrounds[index]

		if (background) {
			const cleanData = background.slice(background.indexOf(',') + 1, background.length)
			b64toBlobUrl(cleanData, (bloburl) => {
				imgBackground(bloburl)
				changeImgIndex(index)
			})
		}
	}

	function preventFromShowingTwice(index, max) {
		const res = Math.floor(Math.random() * max)
		return res === index ? (res + 1) % max : res
	}

	function b64toBlobUrl(b64Data, callback) {
		fetch(`data:image/jpeg;base64,${b64Data}`).then((res) => {
			res.blob().then((blob) => callback(URL.createObjectURL(blob)))
		})
	}

	function changeImgIndex(i) {
		domimg.setAttribute('index', i)
	}

	function addNewImage() {
		let reader = new FileReader()
		reader.onload = function (event) {
			const result = event.target.result

			compress(result, 'thumbnail')
			compress(result)

			chrome.storage.local.get(['custom'], (data) => {
				const custom = data.custom ? data.custom : []
				const bumpedindex = custom.length

				custom.push(result)

				changeImgIndex(bumpedindex)
				chrome.storage.local.set({ customIndex: bumpedindex })
				chrome.storage.local.set({ custom: custom })

				if (custom.length === 0) {
					chrome.storage.sync.get('background_type', (data) => {
						if (data.background_type === 'dynamic') chrome.storage.sync.set({ background_type: 'custom' })
					})
				}
			})
		}
		id('background_overlay').style.opacity = '0'

		reader.readAsDataURL(newfile)
	}

	function compress(e, state) {
		//prend l'image complete en arg

		const img = new Image()

		img.onload = () => {
			const elem = document.createElement('canvas')
			const ctx = elem.getContext('2d')

			//canvas proportionné à l'image

			//rétréci suivant le taux de compression
			//si thumbnail, toujours 150px
			const height = state === 'thumbnail' ? 150 : img.height * 1
			const scaleFactor = height / img.height
			elem.width = img.width * scaleFactor
			elem.height = height

			//dessine l'image proportionné
			ctx.drawImage(img, 0, 0, img.width * scaleFactor, height)

			//renvoie le base64
			const data = ctx.canvas.toDataURL(img)
			const cleanData = data.slice(data.indexOf(',') + 1, data.length) //used for blob

			if (state === 'thumbnail') {
				chrome.storage.local.get('customThumbnails', (data) => {
					const thumbs = data.customThumbnails || []

					thumbs.push(cleanData)
					chrome.storage.local.set({ customThumbnails: thumbs })
					addThumbnails(cleanData, thumbs.length - 1)
				})
			} else
				b64toBlobUrl(cleanData, (bloburl) => {
					imgBackground(bloburl)
				})
		}

		img.src = e
	}

	function addThumbnails(data, index) {
		//créer une tag html en plus + remove button

		const div = document.createElement('div')
		const i = document.createElement('img')
		const rem = document.createElement('button')
		const wrap = document.getElementById('bg_tn_wrap')
		const file = document.getElementById('fileContainer')

		div.setAttribute('index', index)
		div.setAttribute('class', 'thumbnail')
		rem.setAttribute('class', 'hidden')
		rem.textContent = '✕'
		b64toBlobUrl(data, (bloburl) => (i.src = bloburl))

		div.appendChild(i)
		div.appendChild(rem)
		wrap.insertBefore(div, file)

		//events
		const getParentIndex = (that) => parseInt(that.parentElement.getAttribute('index'))
		const getIndex = (that) => parseInt(that.getAttribute('index'))
		const removeControl = (show, i) => domthumbnail[i].children[1].setAttribute('class', show ? 'shown' : 'hidden')

		//displays / hides remove button
		div.onmouseenter = (e) => removeControl(true, getIndex(e.target))
		div.onmouseleave = (e) => removeControl(false, getIndex(e.target))

		i.onmouseup = (e) => {
			if (e.button === 0) {
				//affiche l'image voulu
				//lui injecte le bon index
				const index = getParentIndex(e.target)
				const appliedIndex = parseInt(id('background').getAttribute('index'))

				if (index !== appliedIndex) {
					id('background_overlay').style.opacity = `0`

					chrome.storage.local.get('custom', (data) => {
						changeImgIndex(index)
						chrome.storage.local.set({ customIndex: index })
						compress(data.custom[index], 'thumbclick', index)
					})
				}
			}
		}

		rem.onmouseup = (e) => {
			if (e.button === 0) {
				const index = getParentIndex(e.target)
				let currentIndex = parseInt(id('background').getAttribute('index'))

				//removes thumbnail
				domthumbnail[index].remove()

				//rewrite all thumbs indexes
				for (let i = 0; i < domthumbnail.length; i++) domthumbnail[i].setAttribute('index', i)

				chrome.storage.local.get(['custom', 'customThumbnails'], (data) => {
					//deletes thumbnail from storage
					//concat  [0, index] à [index + 1, fin]

					const deleteArrItem = (arr) => arr.slice(null, index).concat(arr.slice(index + 1))

					data.custom = deleteArrItem(data.custom)
					data.customThumbnails = deleteArrItem(data.customThumbnails)

					chrome.storage.local.set({ custom: data.custom })
					chrome.storage.local.set({ customThumbnails: data.customThumbnails })

					if (currentIndex === data.custom.length) {
						currentIndex -= 1
						if (currentIndex >= 0) compress(data.custom[currentIndex])
					}

					// Si derniere image des customs
					if (data.custom.length === 0) {
						unsplash(null, { removedCustom: true })
					}
					// Sinon load une autre
					else {
						changeImgIndex(currentIndex)
						compress(data.custom[currentIndex])
						chrome.storage.local.set({ customIndex: data.custom })
					}
				})
			}
		}
	}

	function displayCustomThumbnails() {
		const thumbnails = document.querySelectorAll('#bg_tn_wrap .thumbnail')

		chrome.storage.local.get('customThumbnails', (data) => {
			if (data.customThumbnails) {
				if (thumbnails.length < data.customThumbnails.length) {
					data.customThumbnails.forEach(
						(thumb, i) => addThumbnails(thumb.replace('data:image/jpeg;base64,', ''), i) //used for blob
					)
				}
			}
		})
	}

	if (thumbnail) {
		displayCustomThumbnails()
		return true
	}

	if (newfile) {
		addNewImage()
		return true
	}

	// need all of saved stuff
	const { local, every, time } = init

	// Slideshow or not, need index
	const index = local.customIndex >= 0 ? local.customIndex : 0
	const customList = local.custom || []

	// Slideshow is activated
	if (every) {
		const rand = preventFromShowingTwice(index, customList.length)
		const needNewImage = freqControl('get', every, time || 0)

		if (needNewImage) {
			applyCustomBackground(customList, rand)

			// Updates time & index
			chrome.storage.sync.set({ custom_time: freqControl('set', every) })
			chrome.storage.local.set({ customIndex: rand })
			//
		} else {
			applyCustomBackground(customList, index)
		}

		// No slideshow or no data for it
	} else {
		applyCustomBackground(customList, index)
	}
}

function unsplash(init, event) {
	function noDisplayImgLoad(val, callback) {
		let img = new Image()

		if (callback) img.onload = callback
		img.src = val
		img.remove()
	}

	function imgCredits(image) {
		//
		const country = image.country || 'Photo'
		const city = image.city ? image.city + ', ' : ''

		const credits = [
			{
				text: city + country + ' - ',
				url: `${image.link}?utm_source=Bonjourr&utm_medium=referral`,
			},
			{
				text: image.name + ` `,
				url: `https://unsplash.com/@${image.username}?utm_source=Bonjourr&utm_medium=referral`,
			},
			{
				text: tradThis('on Unsplash'),
				url: 'https://unsplash.com/?utm_source=Bonjourr&utm_medium=referral',
			},
		]

		id('credit').textContent = ''

		credits.forEach(function cityNameRef(elem) {
			const dom = document.createElement('a')
			dom.textContent = elem.text
			dom.href = elem.url
			id('credit').appendChild(dom)
		})

		clas(id('credit'), true, 'shown')
	}

	function loadBackground(props) {
		imgBackground(props.url)
		imgCredits(props)

		// sets meta theme-color to main background's color
		document.querySelector('meta[name="theme-color"]').setAttribute('content', props.color)
	}

	function cacheControl(dynamic, local, collectionChange) {
		//
		function chooseCollection() {
			//
			// Mutates collectionIds to match selected collection
			function filterUserCollection(str) {
				str = str.replaceAll(` `, '')
				collectionsIds.user = str
				return 'user'
			}

			if (event && event.collection) {
				if (event.collection.length > 0) return filterUserCollection(event.collection)
			} else if (dynamic.collection.length > 0) return filterUserCollection(dynamic.collection)

			// Transition day and night with noon & evening collections
			// if clock is + /- 60 min around sunrise/set
			const time = sunTime()

			if (time.now >= 0 && time.now <= time.rise - 60) return 'night'
			else if (time.now <= time.rise + 60) return 'noon'
			else if (time.now <= time.set - 60) return 'day'
			else if (time.now <= time.set + 60) return 'evening'
			else if (time.now >= time.set + 60) return 'night'
			else return 'day'
		}

		// 4
		function requestNewList(collection, callback) {
			const header = new Headers()
			const collecId = collectionsIds[collection] || collectionsIds.day
			const url = `https://api.unsplash.com/photos/random?collections=${collecId}&count=8&orientation=landscape`
			header.append('Authorization', `Client-ID 3686c12221d29ca8f7947c94542025d760a8e0d49007ec70fa2c4b9f9d377b1d`)
			header.append('Accept-Version', 'v1')

			fetch(url, { headers: header }).then((raw) =>
				raw.json().then((imgArray) => {
					const filteredList = []

					imgArray.forEach((img) => {
						filteredList.push({
							url: img.urls.raw + '&w=' + screen.width + '&dpr=' + window.devicePixelRatio,
							link: img.links.html,
							username: img.user.username,
							name: img.user.name,
							city: img.location.city,
							country: img.location.country,
							color: img.color,
						})
					})

					callback(filteredList)
				})
			)
		}

		function updateLocal(list) {
			local[foundCollection] = list
			local.current = foundCollection
			chrome.storage.local.set({ dynamicCache: local })
		}

		function preloadUpdates(url) {
			noDisplayImgLoad(url, () => chrome.storage.local.set({ dynamicCache: local }))
		}

		const foundCollection = chooseCollection()
		let list = local[foundCollection]

		//
		// Switch to stop evaluating every cases
		const whichControl = local.firstStartup
			? 'firstStartup'
			: collectionChange && collectionsIds.user !== ''
			? 'collectionChange'
			: ''

		switch (whichControl) {
			case 'firstStartup': {
				loadBackground(defaultImages(foundCollection))

				function requestAllLists(idsArray) {
					requestNewList(idsArray[0], (newlist) => {
						local[idsArray[0]] = newlist

						if (idsArray.length === 1) {
							newlist[0] = defaultImages(foundCollection)
							delete local.firstStartup

							noDisplayImgLoad(newlist[1].url)
							updateLocal(newlist)

							return true
						}

						idsArray.shift()
						requestAllLists(idsArray)
					})
				}

				requestAllLists(['day', 'noon', 'evening', 'night'])
				return true
			}

			case 'collectionChange': {
				id('background_overlay').style.opacity = '0'

				requestNewList(foundCollection, (newlist) => {
					noDisplayImgLoad(newlist[0].url, () => {
						noDisplayImgLoad(newlist[1].url)
						loadBackground(newlist[0])
						id('background_overlay').style.opacity = '1'
					})

					updateLocal(newlist)
				})

				return true
			}

			default: {
				if (freqControl('get', dynamic.every, dynamic.time)) {
					// Need new image
					//
					// Test if same collection
					if (foundCollection === local.current) {
						//
						// removes previous image from list
						list.shift()

						// Load new image
						loadBackground(list[0])

						// If end of cache, get & save new list
						if (list.length === 1)
							requestNewList(foundCollection, (newlist) => {
								updateLocal(list.concat(newlist))
								preloadUpdates(list[1].url)
							})
						//
						// Or preload next
						else preloadUpdates(list[1].url)

						// Update time
						if (dynamic.every !== 'tabs') {
							dynamic.time = freqControl('set', dynamic.every)
							chrome.storage.sync.set({ dynamic: dynamic })
						}
					}

					// Collection has changed !
					else {
						// New collection already cached, get image
						// If not, fetch and display new
						if (list.length > 0) loadBackground(list[0])
						else
							requestNewList(foundCollection, (newlist) => {
								updateLocal(newlist)
								loadBackground(newlist[0])
								preloadUpdates(newlist[1].url)
							})

						// Save new collection
						dynamic.time = freqControl('set', dynamic.every)
						local.current = foundCollection

						chrome.storage.sync.set({ dynamic: dynamic })
						chrome.storage.local.set({ dynamicCache: local })
					}
				}

				// No need for new, load the same image
				else loadBackground(local[local.current][0])
				break
			}
		}
	}

	const collectionsIds = {
		noon: 'yDjgRh1iqkQ',
		day: '4933370',
		evening: '2nVzlQADDIE',
		night: 'VI5sx2SDQUg',
		user: '',
	}

	// 1
	// Startup
	if (init && init.dynamic) {
		//
		chrome.storage.local.get('dynamicCache', function getCache(local) {
			//
			// 1.9.3 ==> 1.10.0 compatiility

			if (local.dynamicCache === undefined) {
				//
				// Add local cache
				local.dynamicCache = {
					current: 'day',
					noon: [],
					day: [],
					evening: [],
					night: [],
					user: [],
				}
			}

			// inject saved background if pause
			if (init.dynamic.current && init.dynamic.every === 'pause') {
				local.dynamicCache.day = [init.dynamic.current, init.dynamic.current]
			}

			// data cleanup
			if (init.dynamic.current) {
				delete init.dynamic.current
				delete init.dynamic.next

				chrome.storage.sync.set({ dynamic: init.dynamic })
			}

			if (init.dynamic.collection.length > 0) {
				collectionsIds.user = init.dynamic.collection
			}

			cacheControl(init.dynamic, local.dynamicCache)
		})
	}

	// Settings event
	else if (event) {
		chrome.storage.sync.get('dynamic', (data) => {
			//

			chrome.storage.local.get('dynamicCache', (local) => {
				//
				const key = Object.keys(event)[0]

				switch (key) {
					case 'every': {
						if (event.every === 'pause') {
							const cache = local.dynamicCache
							data.dynamic.current = cache[cache.current][0]
						} else delete data.dynamic.current

						data.dynamic.every = event.every
						data.dynamic.time = freqControl('set', event.every)
						chrome.storage.sync.set({ dynamic: data.dynamic })
						break
					}

					case 'removedCustom': {
						chrome.storage.sync.set({ background_type: 'dynamic' })
						cacheControl(data.dynamic, local.dynamicCache)
						break
					}

					case 'collection': {
						local.dynamicCache.user = []
						data.dynamic.collection = event.collection
						collectionsIds.user = event.collection

						chrome.storage.sync.set({ dynamic: data.dynamic })
						chrome.storage.local.set({ dynamicCache: local })

						cacheControl(data.dynamic, local.dynamicCache, true)
						break
					}
				}
			})
		})
	}

	// First startup
	else {
		const sync = { every: 'hour', time: Date.now(), collection: '' },
			local = {
				firstStartup: true,
				current: 'day',
				day: [],
				noon: [],
				evening: [],
				night: [],
				user: [],
			}

		chrome.storage.local.set({ dynamicCache: local })
		chrome.storage.sync.set({ dynamic: sync })

		cacheControl(sync, local)
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

function darkmode(choice, init) {
	//
	function apply(val) {
		//
		let body

		switch (val) {
			//compare current hour with weather sunset / sunrise
			case 'auto': {
				const time = sunTime()
				body = time.now <= time.rise || time.now > time.set ? 'dark' : ''
				break
			}

			case 'system':
				body = 'autodark'
				break

			case 'enable':
				body = 'dark'
				break

			case 'disable':
				body = ''
				break

			default:
				body = 'autodark'
		}

		document.body.setAttribute('class', body)
		if (choice) chrome.storage.sync.set({ dark: choice })
	}

	if (choice) chrome.storage.sync.get('weather', (data) => apply(choice, data.weather))
	else apply(init.dark, init.weather)
}

function searchbar(event, that, storage) {
	function display(value, init) {
		id('sb_container').setAttribute('class', value ? 'shown' : 'hidden')

		if (!init) chrome.storage.sync.set({ searchbar: value })
	}

	function localisation(q) {
		let response = '',
			lang = document.documentElement.getAttribute('lang'),
			engine = domsearchbar.getAttribute('engine')

		// engineLocales est dans lang.js
		response = engineLocales[engine].base.replace('$locale$', engineLocales[engine][lang]).replace('$query$', q)

		return response
	}

	function engine(value, init) {
		const names = {
			startpage: 'Startpage',
			ddg: 'DuckDuckGo',
			qwant: 'Qwant',
			lilo: 'Lilo',
			ecosia: 'Ecosia',
			google: 'Google',
			yahoo: 'Yahoo',
			bing: 'Bing',
		}

		if (!init) chrome.storage.sync.set({ searchbar_engine: value })

		domsearchbar.setAttribute('placeholder', tradThis('Search on ' + names[value]))
		domsearchbar.setAttribute('engine', value)
	}

	function setNewtab(value, init) {
		if (!init) chrome.storage.sync.set({ searchbar_newtab: value })
		domsearchbar.setAttribute('newtab', value)
	}

	domsearchbar.onkeyup = function (e) {
		const isNewtab = e.target.getAttribute('newtab') === 'true'

		if (e.key === 'Enter') {
			if (isNewtab) window.open(localisation(this.value), '_blank')
			else window.location = localisation(this.value)
		}
	}

	switch (event) {
		case 'searchbar':
			display(that.checked)
			break

		case 'engine':
			engine(that.value)
			break

		case 'newtab':
			setNewtab(that.checked)
			break

		//init
		default: {
			const searchbar = storage.searchbar || false,
				searchengine = storage.searchbar_engine || 'google',
				searchbarnewtab = storage.searchbar_newtab || false

			//display
			display(searchbar, true)
			engine(searchengine.replace('s_', ''), true)
			setNewtab(searchbarnewtab, true)

			// 1.9.2 ==> 1.9.3 lang breaking fix
			if (storage.searchbar_engine) {
				chrome.storage.sync.set({ searchbar_engine: searchengine.replace('s_', '') })
			}
			break
		}
	}
}

function showPopup(data) {
	const popup = id('popup')
	const closePopup = id('closePopup')
	const go = id('go')

	go.setAttribute(
		'href',
		navigator.userAgent.includes('Chrome')
			? 'https://chrome.google.com/webstore/detail/bonjourr-%C2%B7-minimalist-lig/dlnejlppicbjfcfcedcflplfjajinajd/reviews'
			: 'https://addons.mozilla.org/en-US/firefox/addon/bonjourr-startpage/'
	)

	function affiche() {
		const close = function () {
			popup.classList.replace('shown', 'removing')
			chrome.storage.sync.set({ reviewPopup: 'removed' })
		}

		popup.classList.add('shown')

		closePopup.onclick = close
		go.onclick = close
	}

	//s'affiche après 30 tabs
	if (data > 30) affiche()
	else if (typeof data === 'number') chrome.storage.sync.set({ reviewPopup: data + 1 })
	else if (data !== 'removed') chrome.storage.sync.set({ reviewPopup: 0 })
	else if (data === 'removed') document.body.removeChild(popup)
}

function modifyWeightOptions(weights) {
	const doms = document.querySelectorAll('#i_weight option')

	// Pas de weights, 400
	if (!weights) {
		id('i_weight').value = '400'
		weights = ['400']
	}

	// ya des weights, transforme regular en 400
	else {
		if (weights.includes('regular')) {
			weights[weights.indexOf('regular')] = '400'
		}
	}

	if (doms) {
		doms.forEach((option) => {
			if (weights.includes(option.value)) option.style.display = 'block'
			else option.style.display = 'none'
		})
	}
}

function customSize(init, event) {
	//
	// Apply for interface, credit & settings button
	const apply = (size) => {
		dominterface.style.fontSize = size + 'px'
		id('credit').style.fontSize = size + 'px'
	}

	const save = () => {
		chrome.storage.sync.get('font', (data) => {
			let font = data.font || { family: '', weight: ['400'], size: 13 }
			font.size = event
			slowRange({ font: font }, 200)
		})
	}

	if (event) {
		save()
		apply(event)
	}

	if (init) {
		apply(init.size)
	}
}

function customFont(data, event) {
	const save = (url, family, availWeights, weight) => {
		chrome.storage.sync.get('font', (data) => {
			const font = data.font || {}

			font.url = url
			font.family = family
			font.availWeights = availWeights
			font.weight = weight

			slowRange({ font: font }, 200)
		})
	}

	// Fetches fonts.google.com url
	function apply(url, family, weight) {
		fetch(url)
			.then((response) => response.text())
			.then((text) => {
				text = text.replace(/(\r\n|\n|\r|  )/gm, '')
				id('fontstyle').textContent = text
				id('clock').style.fontFamily = family
				dominterface.style.fontFamily = family
				dominterface.style.fontWeight = weight

				canDisplayInterface('fonts')
			})
	}

	// Event only
	// Uses already saved url, replaces weight from url and apply / save
	function changeWeight(val, font) {
		if (font.url) {
			font.url = font.url.slice(0, font.url.lastIndexOf(':') + 1)
			font.url += val

			apply(font.url, font.family, val)
			save(font.url, font.family, font.availWeights, val)
		}
	}

	// Event only
	function changeFamily(json, family) {
		//
		// Cherche correspondante
		const dom = id('i_customfont')
		const font = json.items.filter((font) => font.family.toUpperCase() === family.toUpperCase())

		// One font has been found
		if (font.length > 0) {
			const availWeights = font[0].variants.filter((variant) => !variant.includes('italic'))
			const defaultWeight = availWeights.includes('regular') ? '400' : availWeights[0]
			const url = `https://fonts.googleapis.com/css?family=${font[0].family}:${defaultWeight}`

			// Change l'url, et les weight options
			apply(url, font[0].family, '400')
			save(url, font[0].family, availWeights, '400')
			modifyWeightOptions(availWeights)

			dom.blur()
		} else dom.value = ''
	}

	function triggerEvent(event) {
		//
		function fetchFontList(callback) {
			//
			if (Object.entries(googleFontList).length > 0) {
				callback(googleFontList)
			} else {
				fetch(
					'https://www.googleapis.com/webfonts/v1/webfonts?sort=popularity&key=AIzaSyAky3JYc2rCOL1jIssGBgLr1PT4yW15jOk'
				)
					.then((response) => response.json())
					.then((json) => {
						googleFontList = json
						callback(json)
					})
			}
		}

		// If nothing, removes custom font
		if (event.family === '') {
			id('fontstyle').textContent = ''
			id('clock').style.fontFamily = ''
			dominterface.style.fontFamily = ''
			dominterface.style.fontWeight = ''

			modifyWeightOptions()
			save()

			return false
		}

		if (event.weight) {
			chrome.storage.sync.get('font', (data) => changeWeight(event.weight, data.font))

			// 1.9.3 compatibility comes with "family"
			// don't return now
			if (!event.family) return false
		}

		if (event.family) {
			fetchFontList((json) => changeFamily(json, event.family))
		}

		// For best performance: Fill list & change innerHTML
		if (event.autocomplete) {
			fetchFontList(function fillFamilyInput(json) {
				const optionList = []
				json.items.forEach(function addOptions(item) {
					optionList.push(`<option value="${item.family}">${item.family}</option>`)
				})
				id('dl_fontfamily').innerHTML = optionList.join('')
			})
		}
	}

	// init
	if (data) {
		if (data.family && data.url) {
			apply(data.url, data.family, data.weight || '400')
		}

		// 1.9.3 ==> 1.10.0
		else if (data.family && !data.url) triggerEvent(data)
	}

	// event
	if (event) triggerEvent(event)
}

function customCss(init, event) {
	const styleHead = id('styles')

	if (init) styleHead.textContent = init

	if (event) {
		switch (event.is) {
			case 'styling': {
				const val = stringMaxSize(event.val, 8080)
				styleHead.textContent = val
				slowRange({ css: val }, 500)
				break
			}

			case 'resize': {
				slowRange({ cssHeight: event.val }, 500)
				break
			}
		}
	}
}

function hideElem(init, buttons, that) {
	const IDsList = [
		['time', ['time-container', 'date']],
		['main', ['greetings', 'description', 'widget']],
		['linkblocks', ['linkblocks']],
		['showSettings', ['showSettings']],
	]

	// Returns { row, col } to naviguate [[0, 0], [0, 0, 0]] etc.
	function getEventListPosition(that) {
		return {
			row: parseInt(that.getAttribute('he_row')),
			col: parseInt(that.getAttribute('he_col')),
		}
	}

	function toggleElement(dom, hide) {
		if (hide) id(dom).classList.add('he_hidden')
		else id(dom).classList.remove('he_hidden')
	}

	function isEverythingHidden(list, row) {
		const filtered = list[row].filter((el) => el === 1)
		return filtered.length === list[row].length
	}

	function initializeHiddenElements(list) {
		list.forEach((row, row_i) => {
			const parent = IDsList[row_i][0]

			isEverythingHidden(list, row_i) ? toggleElement(parent, true) : ''

			// Hide children
			row.forEach((child, child_i) => {
				const childid = IDsList[row_i][1][child_i]

				child === 1 ? toggleElement(childid, true) : ''
			})
		})
	}

	function updateToNewData(list) {
		if (list[0]) {
			if (typeof list[0][0] === 'string') {
				//
				// Flattens and removes parent IDs
				const childOnly = IDsList.flat().filter((row) => typeof row === 'object')
				let newHidden = [[0, 0], [0, 0, 0], [0], [0]]

				//
				// Go through IDs list for every old hide elems
				list.forEach((id) => {
					childOnly.forEach((row, row_i) =>
						row.forEach((col, col_i) => {
							if (col === id) {
								newHidden[row_i][col_i] = 1
							}
						})
					)
				})

				chrome.storage.sync.set({ hide: newHidden })
				return newHidden
			}

			// Is already updated
			else return list
		}

		// Had nothing to hide
		else return list
	}

	// startup initialization
	if (!that && !buttons) {
		//
		// first startup
		if (!init) {
			chrome.storage.sync.set({ hide: [[0, 0], [0, 0, 0], [0], [0]] })
			return false
		}

		initializeHiddenElements(updateToNewData(init))
	}

	// Settings buttons initialization
	else if (buttons) {
		chrome.storage.sync.get('hide', (data) => {
			//
			// 1.9.3 ==> 1.10.0
			data.hide = updateToNewData(data.hide)

			buttons.forEach((button) => {
				const pos = getEventListPosition(button)
				if (data.hide[pos.row][pos.col] === 1) button.classList.toggle('clicked')
			})
		})
	}

	// Event
	else {
		chrome.storage.sync.get('hide', (data) => {
			//
			// 1.9.3 ==> 1.10.0
			data.hide = updateToNewData(data.hide)

			const pos = getEventListPosition(that)
			const state = that.classList.contains('clicked')
			const child = IDsList[pos.row][1][pos.col]
			const parent = IDsList[pos.row][0]

			// Update hidden list
			data.hide[pos.row][pos.col] = state ? 1 : 0
			chrome.storage.sync.set({ hide: data.hide })

			// Toggle children and parent if needed
			toggleElement(child, state)
			toggleElement(parent, isEverythingHidden(data.hide, pos.row))
		})
	}
}

function canDisplayInterface(cat, init) {
	//
	// Progressive anim to max of Bonjourr animation time
	function displayInterface() {
		let loadtime = performance.now() - loadtimeStart

		if (loadtime > BonjourrAnimTime) loadtime = BonjourrAnimTime
		if (loadtime < 30) loadtime = 0

		dominterface.style.transition = `opacity ${loadtime}ms, transform .4s`
		dominterface.style.opacity = '1'
		clas(domshowsettings, true, 'enabled')

		setTimeout(() => {
			dominterface.classList.remove('init')
			domshowsettings.classList.remove('init')
		}, loadtime + 100)
	}

	// More conditions if user is using advanced features
	if (init) {
		const h = new Date().getHours()
		if (init.font) if (init.font.family && init.font.url) funcsOk.fonts = false
		//if (h < 12 || h > 21) funcsOk.weatherhigh = false
	}

	// Check if all funcs are ready
	else {
		funcsOk[cat] = true
		const entries = Object.entries(funcsOk)
		const res = entries.filter((val) => val[1] === true)

		if (res.length === entries.length) displayInterface()
	}
}

function sunTime(init) {
	if (init && init.lastState) {
		sunrise = init.lastState.sunrise
		sunset = init.lastState.sunset
	}

	//
	else {
		if (sunset === 0)
			return {
				now: minutator(new Date()),
				rise: 420,
				set: 1320,
			}
		else
			return {
				now: minutator(new Date()),
				rise: minutator(new Date(sunrise * 1000)),
				set: minutator(new Date(sunset * 1000)),
			}
	}
}

function safeFont(settingsInput) {
	const windows = document.fonts.check('16px Segoe UI')
	const macOS = document.fonts.check('16px SF Pro Display')

	// Startup
	if (!settingsInput) {
		if (!windows && !macOS)
			document.getElementById('defaultFont').href =
				'https://fonts.googleapis.com/css2?family=Inter:wght@300;400&display=swap'

		if (windows) dominterface.style.fontWeight = '350'
		if (macOS) dominterface.style.fontFamily = 'system-ui'
	}

	// Settings
	else {
		settingsInput.setAttribute('placeholder', macOS ? 'SF Pro Display' : 'Segoe UI')
	}
}

window.onload = function () {
	try {
		chrome.storage.sync.get(null, function startup(data) {
			//
			function reducedWeatherData(weather) {
				// 1.9.3 ==> 1.10.0
				const updatedWeather = weather

				if (weather) {
					if (weather.lastState && weather.lastState.sunset === undefined) {
						const old = weather.lastState

						updatedWeather.lastState = {
							feels_like: old.main.feels_like,
							temp_max: old.main.temp_max,
							sunrise: old.sys.sunrise,
							sunset: old.sys.sunset,
							description: old.weather[0].description,
							icon_id: old.weather[0].icon_id,
						}
					}
				}

				return updatedWeather
			}

			// Compatibility with older local versions
			// As it is now using "bonjourr" key
			if (window.location.protocol !== 'chrome-extension:' && localStorage.data && !localStorage.bonjourr) {
				localStorage.bonjourr = atob(localStorage.data)
				localStorage.removeItem('data')
			}

			canDisplayInterface(null, { font: data.font })
			traduction(null, data.lang)

			sunTime(reducedWeatherData(data.weather))
			weather(null, null, reducedWeatherData(data.weather))

			customFont(data.font)
			customSize(data.font)
			safeFont()

			newClock(null, data.clock)
			date(null, data.usdate)
			greetings(data.greeting)
			linksrow(data.linksrow)
			quickLinks(null, null, data)

			darkmode(null, data)
			searchbar(null, null, data)
			showPopup(data.reviewPopup)

			customCss(data.css)
			hideElem(data.hide)
			initBackground(data)
		})
	} catch (error) {
		prompt(`Bonjourr messed up 😭😭 Copy this message and contact us !`, error.stack, error.line)
	}
}
