function slowRange(tosave, time = 400) {
	clearTimeout(rangeActive)
	rangeActive = setTimeout(function () {
		chrome.storage.sync.set(tosave)
	}, time)
}

function slow(that, time = 400) {
	that.setAttribute('disabled', '')
	stillActive = setTimeout(() => {
		that.removeAttribute('disabled')
		clearTimeout(stillActive)
		stillActive = false
	}, time)
}

function traduction(settingsDom, lang = 'en') {
	//
	function traduis() {
		//
		document.documentElement.setAttribute('lang', lang)

		const trns = (settingsDom ? settingsDom : document).querySelectorAll('.trn')
		const changeText = (dom, str) => (dict[str] ? (dom.textContent = dict[str][lang]) : '')
		trns.forEach((trn) => changeText(trn, trn.textContent))
	}

	if (lang !== 'en') traduis(lang)
}

function tradThis(str) {
	const lang = document.documentElement.getAttribute('lang') || 'en'
	return lang === 'en' ? str : dict[str][lang]
}

function clock(event, init) {
	//

	function zonedDate(timezone) {
		const date = new Date()
		if (timezone === 'auto' || timezone === NaN) return date
		else {
			const offset = parseInt(date.getTimezoneOffset() / 60)
			const utcHour = date.getHours() + offset

			date.setHours(utcHour + parseInt(timezone))

			return date
		}
	}

	function clockDate(date, usdate) {
		const jour = tradThis(days[date.getDay()]),
			mois = tradThis(months[date.getMonth()]),
			chiffre = date.getDate()

		id('date').textContent = usdate ? `${jour}, ${mois} ${chiffre}` : `${jour} ${chiffre} ${mois}`
	}

	function greetings(date, name) {
		const greets = [
			['Good night', 7],
			['Good morning', 12],
			['Good afternoon', 18],
			['Good evening', 24],
		]

		const domgreetings = id('greetings')
		const greetResult = greets.filter((greet) => date.getHours() < greet[1])[0]

		domgreetings.style.textTransform = name ? 'none' : 'capitalize'
		domgreetings.textContent = tradThis(greetResult[0]) + (name ? `, ${name}` : '')
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

	function startClock(clock, greeting, usdate) {
		//
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

		function clockInterval() {
			//

			function numerical(time) {
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

				let h = clock.ampm ? toAmpm(time.getHours()) : time.getHours(),
					m = fixunits(time.getMinutes()),
					s = fixunits(time.getSeconds())

				domclock.textContent = `${h}:${m}${clock.seconds ? ':' + s : ''}`
			}

			function analog(time) {
				function rotation(that, val) {
					that.style.transform = `rotate(${parseInt(val)}deg)`
				}

				let s = time.getSeconds() * 6,
					m = time.getMinutes() * 6,
					h = time.getHours() * 30

				//bouge les aiguilles minute et heure quand seconde ou minute arrive à 0
				if (true || time.getMinutes() === 0) rotation(id('minutes'), m)
				if (true || time.getHours() === 0) rotation(id('hours'), h)

				//tourne pas les secondes si pas de seconds
				if (clock.seconds) rotation(id('analogSeconds'), s)
			}

			// Control
			const date = zonedDate(clock.timezone)
			clock.analog ? analog(date) : numerical(date)

			// Midnight, change date
			if (date.getHours() === 0 && date.getMinutes() === 0) {
				clockDate(date, usdate)
			}

			// Hour change
			if (date.getMinutes() === 0) {
				greetings(date, greeting)
			}
		}

		//stops multiple intervals
		clearInterval(lazyClockInterval)

		displayControl()
		clockInterval()
		lazyClockInterval = setInterval(clockInterval, 1000)
	}

	if (event) {
		chrome.storage.sync.get(['clock', 'usdate', 'greeting'], (data) => {
			const [key, val] = Object.entries(event)[0]

			switch (key) {
				case 'usdate': {
					clockDate(zonedDate(data.clock.timezone), val)
					slowRange({ usdate: val }, 500)
					break
				}

				case 'greeting': {
					greetings(zonedDate(data.clock.timezone), val)
					slowRange({ greeting: val }, 500)
					break
				}

				default: {
					let clock = {
						analog: false,
						seconds: false,
						ampm: false,
						timezone: 'auto',
						face: 'none',
					}

					clock = { ...data.clock }
					clock[key] = val
					chrome.storage.sync.set({ clock: clock })

					if (key === 'timezone') {
						clockDate(zonedDate(val), data.usdate)
						greetings(zonedDate(val), data.greeting)
					}

					startClock(clock, data.greeting, data.usdate)
					changeAnalogFace(clock.face)
					break
				}
			}
		})
	} else {
		let clock = {
			analog: false,
			seconds: false,
			ampm: false,
			timezone: 'auto',
			face: 'none',
		}

		if (init.clock) clock = { ...clock, ...init.clock }

		startClock(clock, init.greeting, init.usdate)
		clockDate(zonedDate(clock.timezone), init.usdate)
		greetings(zonedDate(clock.timezone), init.greeting)
		changeAnalogFace(clock.face)
		canDisplayInterface('clock')
	}
}

function quickLinks(event, that, initStorage) {
	// Pour ne faire qu'un seul storage call
	// [{ index: number, url: string }]
	let editDisplayTimeout = setTimeout(() => {}, 0)
	let hovered,
		dragged = { parent: undefined, link: {}, index: 0 }

	//enleve les selections d'edit
	const removeLinkSelection = () =>
		domlinkblocks.querySelectorAll('.l_icon_wrap').forEach(function (e) {
			clas(e, false, 'selected')
		})

	//initialise les blocs en fonction du storage
	//utilise simplement une boucle de appendblock
	function initblocks(links) {
		if (links.length > 0) {
			const blocklist = links.map((link, i) => appendblock(link, i))

			canDisplayInterface('links')

			blocklist.forEach(({ icon, parent }, i) => {
				addIcon(icon, links, i)
				addEvents(parent)
			})
		}

		// Links is done
		else canDisplayInterface('links')
	}

	function addIcon(lIcon, links, index) {
		//
		function waitForIconToApply(iconurl) {
			//
			function apply(url) {
				const loadTime = performance.now() - perfStart
				const playAnim = loadTime > 30

				switch (playAnim) {
					case true: {
						lIcon.style.opacity = '0'
						setTimeout(() => {
							lIcon.removeAttribute('style')
							lIcon.src = url
						}, BonjourrAnimTime)
						break
					}

					default:
						lIcon.src = url
						break
				}
			}

			if (iconurl.length === 0 || iconurl === 'src/assets/interface/loading.gif') {
				//
				// Apply loading gif d'abord
				apply(iconurl)

				const img = new Image()
				const a = document.createElement('a')
				a.href = link.url
				const url = 'https://api.faviconkit.com/' + a.hostname + '/144'

				img.onload = () => apply(url)
				img.src = url
				img.remove()

				// Last link is newlink
				if (index === links.length - 1) {
					links[index].icon = url
					chrome.storage.sync.set({ links: links })
				}
			}

			// Apply celle cached
			else apply(iconurl)
		}

		const link = links[index]
		const perfStart = performance.now()
		const isAlias = link.icon.startsWith('alias:')

		switch (isAlias) {
			case true:
				chrome.storage.local.get([link.icon], (data) => waitForIconToApply(data[link.icon]))
				break

			default:
				waitForIconToApply(link.icon)
				break
		}
	}

	function appendblock(link) {
		let icon = link.icon
		let title = stringMaxSize(link.title, 32)
		let url = stringMaxSize(link.url, 128)

		// no icon ? + 1.9.2 dead favicons fix
		if (icon.length === 0 || icon === 'src/images/icons/favicon.png') {
			icon = 'src/assets/interface/loading.gif'
		}

		//le DOM du block
		const lIcon = document.createElement('img')
		const lIconWrap = document.createElement('div')
		const blockTitle = document.createElement('span')
		const block = document.createElement('div')
		const block_parent = document.createElement('div')

		lIcon.loading = 'lazy'
		lIcon.className = 'l_icon'
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

		return { icon: lIcon, parent: block_parent }
	}

	function addEvents(elem) {
		function handleDrag(is, that) {
			chrome.storage.sync.get('links', (data) => {
				const i = findindex(that)

				switch (is) {
					case 'start':
						dragged = { parent: elem, link: data.links[i], index: i }
						break

					case 'enter':
						hovered = { parent: elem, link: data.links[i], index: i }
						break

					case 'end': {
						if (hovered.index !== dragged.index) {
							//changes html blocks
							const hoveredChild = hovered.parent.children[0]
							const draggedChild = dragged.parent.children[0]

							hovered.parent.children[0].remove()
							dragged.parent.children[0].remove()

							hovered.parent.appendChild(draggedChild)
							dragged.parent.appendChild(hoveredChild)

							// Switches link storage
							let allLinks = data.links

							allLinks[dragged.index] = hovered.link
							allLinks[hovered.index] = dragged.link

							chrome.storage.sync.set({ links: allLinks })
						}
						break
					}
				}
			})
		}

		// Drags
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

		// Mouse clicks
		elem.oncontextmenu = function (e) {
			e.preventDefault()
			editlink(this)
		}

		elem.onmouseup = function (e) {
			removeLinkSelection()
			clearTimeout(editDisplayTimeout)
			e.which === 3 ? editlink(this) : !has(id('settings'), 'shown') ? openlink(this, e) : ''
		}

		// Mobile clicks
		let touchStartTime = 0
		let touchTimeout = setTimeout(() => {}, 0)

		elem.ontouchstart = function (e) {
			e.preventDefault()
			touchStartTime = performance.now()
			touchTimeout = setTimeout(() => editlink(this), 300)
		}

		elem.ontouchend = function (e) {
			if (performance.now() - touchStartTime < 300) {
				clearTimeout(touchTimeout)
				openlink(this, e)
			}
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
			editDisplayTimeout = setTimeout(() => id('edit_linkContainer').setAttribute('class', ''), BonjourrAnimTime)
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
			const noError = editlink(null, parseInt(id('edit_link').getAttribute('index')))
			if (noError) closeEditLink()
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

		if (e_iconurl.value.length === 8080) {
			e_iconurl.value = ''
			e_iconurl.setAttribute('placeholder', tradThis('Icon must be < 8kB'))

			return false
		}

		const updated = {
			title: stringMaxSize(e_title.value, 32),
			url: stringMaxSize(e_url.value, 128),
			icon: stringMaxSize(e_iconurl.value, 8080),
		}

		if (i || i === 0) {
			chrome.storage.sync.get('links', (data) => {
				let allLinks = [...data.links]
				const parent = domlinkblocks.children[i + 1]

				// Update on interface
				Object.entries(allLinks[i]).forEach(([key, val]) => {
					if (val !== updated[key]) {
						//
						switch (key) {
							case 'title': {
								// Adds span title or updates it
								if (!parent.querySelector('span')) {
									const span = document.createElement('span')
									span.textContent = updated[key]
									parent.children[0].appendChild(span)
								} else parent.querySelector('span').textContent = updated[key]
								break
							}

							case 'url':
								parent.children[0].setAttribute('source', updated[key])
								break

							case 'icon': {
								parent.querySelector('img').src = updated.icon

								// Saves to an alias if icon too big
								if (updated.icon.length > 64) {
									const alias = saveIconAsAlias(updated.icon)
									e_iconurl.value = alias
									updated.icon = alias
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

			return true
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
			a_hiddenlink.setAttribute('href', source)
			a_hiddenlink.setAttribute('target', data.linknewtab || e.which === 2 ? '_blank' : '_self')
			a_hiddenlink.click()
		})
	}

	function findindex(that) {
		//passe la liste des blocks, s'arrete si that correspond
		//renvoie le nombre de loop pour l'atteindre

		const list = domlinkblocks.children

		for (let i = 0; i < list.length; i++) if (that === list[i]) return i - 1
	}

	function removeblock(index) {
		chrome.storage.sync.get('links', (data) => {
			// Remove alias from storage
			if (data.links[index].icon.startsWith('alias:')) {
				chrome.storage.local.remove(data.links[index].icon)
			}

			data.links.splice(index, 1)

			//enleve le html du block
			var block_parent = domlinkblocks.children[index + 1]
			clas(block_parent, true, 'removed')

			setTimeout(function () {
				domlinkblocks.removeChild(block_parent)

				//enleve linkblocks si il n'y a plus de links
				if (data.links.length === 0) domlinkblocks.style.visibility = 'hidden'
			}, 600)

			chrome.storage.sync.set({ links: data.links })
		})
	}

	function linkSubmission() {
		//

		function saveLink(filteredLink) {
			//remet a zero les inputs
			id('i_title').value = ''
			id('i_url').value = ''

			chrome.storage.sync.get('links', (data) => {
				const blocklist = id('linkblocks_inner').querySelectorAll('.block_parent')
				const links = data.links || []

				if (links) {
					links.push(filteredLink)
					domlinkblocks.style.visibility = 'visible'
				}

				if (links.length === 30) linksInputDisable(true)

				blocklist.forEach((parent) => parent.remove())
				initblocks(links)
			})
		}

		function filterUrl(str) {
			//
			const to = (scheme) => str.startsWith(scheme)
			const acceptableSchemes = to('http://') || to('https://')
			const unacceptable = to('about:') || to('chrome://')

			return acceptableSchemes ? str : unacceptable ? false : 'https://' + str
		}

		let links = {
			title: stringMaxSize(id('i_title').value, 32),
			url: stringMaxSize(filterUrl(id('i_url').value), 128),
			icon: 'src/assets/interface/loading.gif',
		}

		//si l'url filtré est juste
		if (links.url && id('i_url').value.length > 2) {
			//et l'input n'a pas été activé ya -1s
			if (!stillActive) saveLink(links)
		}
	}

	function linksInputDisable(isMax, settingsDom) {
		const getDoms = (name) => (settingsDom ? settingsDom.querySelector('#' + name) : id(name))
		const doms = ['i_title', 'i_url', 'submitlink']

		if (isMax) doms.forEach((elem) => getDoms(elem).setAttribute('disabled', ''))
		else doms.forEach((elem) => getDoms(elem).removeAttribute('disabled'))

		clas(getDoms(doms[2]), isMax, 'max')
	}

	switch (event) {
		case 'input':
		case 'button':
			linkSubmission()
			break

		// that est settingsDom ici
		case 'maxControl':
			linksInputDisable(true, that)

		case 'linknewtab': {
			chrome.storage.sync.set({ linknewtab: that.checked ? true : false })
			id('hiddenlink').setAttribute('target', '_blank')
			break
		}
	}

	if (initStorage) {
		initblocks(initStorage.links || [])

		// No need to activate edit events asap
		setTimeout(function timeToSetEditEvents() {
			id('edit_linkContainer').oncontextmenu = (e) => e.preventDefault()
			editEvents()
		}, 150)
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
	const toFarenheit = (num) => Math.round(num * (9 / 5) + 32)
	const toCelsius = (num) => Math.round((num - 32) * (5 / 9))
	const WEATHER_API_KEY = [
		'YTU0ZjkxOThkODY4YTJhNjk4ZDQ1MGRlN2NiODBiNDU=',
		'Y2U1M2Y3MDdhZWMyZDk1NjEwZjIwYjk4Y2VjYzA1NzE=',
		'N2M1NDFjYWVmNWZjNzQ2N2ZjNzI2N2UyZjc1NjQ5YTk=',
	]

	function initWeather(param) {
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				//update le parametre de location
				param.location.push(pos.coords.latitude, pos.coords.longitude)
				request(param, false)
				request(param, true)

				// Check geolocation after settings is loaded
				if (id('settings')) {
					clas(id('sett_city'), true, 'hidden')
					id('i_geol').checked = true
				}
			},
			(refused) => {
				request(param, true)
				request(param, false)
			}
		)
	}

	function request(storage, forecast) {
		function saveCurrent(response) {
			//
			const isImperial = storage.unit === 'imperial'

			weatherToSave = {
				...weatherToSave,
				lastCall: Math.floor(new Date().getTime() / 1000),
				lastState: {
					feels_like: Math.round(isImperial ? toFarenheit(response.main.feels_like) : response.main.feels_like),
					temp_max: Math.round(isImperial ? toFarenheit(response.main.temp_max) : response.main.temp_max),
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
			let maxTempFromList = -273.15

			// Late evening forecast for tomorrow
			if (todayHour > 18) {
				const tomorrow = thisdate.setDate(thisdate.getDate() + 1)
				forecastDay = new Date(tomorrow).getDate()
			}

			// Get the highest temp for the specified day
			response.list.forEach((elem) => {
				if (new Date(elem.dt * 1000).getDate() === forecastDay)
					maxTempFromList < elem.main.temp_max ? (maxTempFromList = elem.main.temp_max) : ''
			})

			weatherToSave.fcHigh = Math.round(storage.unit === 'imperial' ? toFarenheit(maxTempFromList) : maxTempFromList)

			chrome.storage.sync.set({ weather: weatherToSave })
			displaysForecast(weatherToSave)
		}

		let url = 'https://api.openweathermap.org/data/2.5/'
		const lang = document.documentElement.getAttribute('lang')
		const [lat, lon] = storage.location || [0, 0]

		url += `${forecast ? 'forecast' : 'weather'}?appid=${atob(WEATHER_API_KEY[forecast ? 0 : 1])}`
		url += storage.location.length === 2 ? `&lat=${lat}&lon=${lon}` : `&q=${encodeURI(storage.city)},${storage.ccode}`
		url += `&units=metric&lang=${lang}`

		// Inits global object
		if (Object.keys(weatherToSave).length === 0) {
			weatherToSave = storage
		}

		// fetches, parses and apply callback
		fetch(url).then((data) => {
			if (data.ok) data.json().then((json) => (forecast ? saveForecast(json) : saveCurrent(json)))
			else if (i_city) i_city.setAttribute('placeholder', tradThis('City not found'))
		})
	}

	function cacheControl(storage) {
		const now = Math.floor(date.getTime() / 1000)
		let isCurrentChanging = false

		if (typeof storage.lastCall === 'number') {
			//
			// Current: 30 mins
			if (navigator.onLine && (now > storage.lastCall + 1800 || sessionStorage.lang)) {
				isCurrentChanging = true
				sessionStorage.removeItem('lang')
				request(storage, false)
			} else displaysCurrent(storage)

			// Forecast: follows current
			if (navigator.onLine && isCurrentChanging) {
				request(storage, true)
			} else displaysForecast(storage)
		}

		// First startup
		else initWeather(storage)
	}

	function displaysCurrent(weather) {
		let filename = 'clearsky'

		// Openweathermap is weird, not me ok
		// prettier-ignore
		switch (weather.lastState.icon_id) {
			case 200: case 201: case 202: case 210:
			case 211: case 212: case 221: case 230:
			case 231: case 232:
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
		const iconSrc = `src/assets/weather/${timeOfDay}/${filename}.png`

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

		// from 1.2s request anim to .4s hide elem anim
		setTimeout(() => (widget.style.transition = 'opacity .4s'), BonjourrAnimTime)
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

					if (data.weather.lastState) {
						const { feels_like } = data.weather.lastState
						data.weather.lastState.feels_like = that.checked ? toFarenheit(feels_like) : toCelsius(feels_like)
						data.weather.fcHigh = that.checked ? toFarenheit(data.weather.fcHigh) : toCelsius(data.weather.fcHigh)
					}

					displaysCurrent(data.weather)
					displaysForecast(data.weather)
					chrome.storage.sync.set({ weather: data.weather })
					break
				}

				case 'city': {
					if (i_city.value.length < 2) {
						return false
					}

					data.weather.ccode = i_ccode.value
					data.weather.city = stringMaxSize(i_city.value, 64)

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

						data.weather.location = []
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

function imgBackground(val, loadTime) {
	let img = new Image()

	img.onload = () => {
		if (loadTime) {
			const animDuration = loadTime > 1000 ? 1400 : loadTime + 400
			const changeDuration = (time) => (domoverlay.style.transition = `transform .4s, opacity ${time}ms`)

			changeDuration(animDuration)
			setTimeout(() => changeDuration(400), animDuration)
		}

		domoverlay.style.opacity = `1`
		id('background').style.backgroundImage = `url(${val})`
	}

	img.src = val
	img.remove()
}

function freqControl(state, every, last) {
	const nowDate = new Date()

	// instead of adding unix time to the last date
	// look if day & hour has changed
	// because we still cannot time travel
	// changes can only go forward

	switch (state) {
		case 'set':
			return nowDate.getTime()

		case 'get': {
			const lastDate = new Date(last),
				changed = {
					date: nowDate.getDate() !== lastDate.getDate(),
					hour: nowDate.getHours() !== lastDate.getHours(),
				}

			switch (every) {
				case 'day': {
					if (changed.date) return true
					break
				}

				case 'hour': {
					if (changed.date || changed.hour) return true
					break
				}

				case 'tabs':
					return true

				case 'pause':
					return false
			}
		}
	}
}

function localBackgrounds(init, event) {
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

	function addNewImage(file) {
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

				if (custom.length === 1) {
					chrome.storage.sync.get('background_type', (data) => {
						if (data.background_type === 'dynamic') chrome.storage.sync.set({ background_type: 'custom' })
					})
				}
			})
		}
		domoverlay.style.opacity = '0'
		reader.readAsDataURL(file)
	}

	function compress(e, state) {
		//
		// Hides previous bg and credits
		if (state !== 'thumbnail') {
			domoverlay.style.opacity = `0`
			clas(domcredit, false, 'shown')
			setTimeout(() => (domcredit.style.display = 'none'), BonjourrAnimTime)
		}

		const compressStart = performance.now()
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
					const compressTime = performance.now() - compressStart
					setTimeout(() => imgBackground(bloburl, compressTime), 400 - compressTime)
				})
		}

		img.src = e
	}

	function addThumbnails(data, index, settingsDom) {
		//créer une tag html en plus + remove button

		const settings = settingsDom ? settingsDom : id('settings')

		const div = document.createElement('div')
		const i = document.createElement('img')
		const rem = document.createElement('button')
		const wrap = settings.querySelector('#bg_tn_wrap')
		const file = settings.querySelector('#fileContainer')

		div.setAttribute('index', index)
		div.setAttribute('class', 'thumbnail')
		if (!mobilecheck) rem.setAttribute('class', 'hidden')
		rem.textContent = '✕'
		b64toBlobUrl(data, (bloburl) => (i.src = bloburl))

		div.appendChild(i)
		div.appendChild(rem)
		wrap.insertBefore(div, file)

		//events
		const getParentIndex = (that) => parseInt(that.parentElement.getAttribute('index'))
		const getIndex = (that) => parseInt(that.getAttribute('index'))
		const removeControl = (show, i) => domthumbnail[i].children[1].setAttribute('class', show ? 'shown' : 'hidden')

		//displays / hides remove button on desktop
		if (!mobilecheck) {
			div.onmouseenter = (e) => removeControl(true, getIndex(e.target))
			div.onmouseleave = (e) => removeControl(false, getIndex(e.target))
		}

		i.onmouseup = (e) => {
			if (e.button === 0) {
				//affiche l'image voulu
				//lui injecte le bon index
				const index = getParentIndex(e.target)
				const appliedIndex = parseInt(id('background').getAttribute('index'))

				if (index !== appliedIndex) {
					domoverlay.style.opacity = `0`

					chrome.storage.local.get('custom', (data) => {
						changeImgIndex(index)
						chrome.storage.local.set({ customIndex: index })
						compress(data.custom[index])
					})
				}
			}
		}

		rem.onmouseup = (e) => {
			if (e.button === 0) {
				let index = getParentIndex(e.target)
				let displayedIndex = parseInt(id('background').getAttribute('index'))

				const toRemoveIsDisplayed = displayedIndex === index
				const thumbnails = [...document.getElementsByClassName('thumbnail')]

				//removes thumbnail & rewrite all thumbs indexes
				thumbnails[index].remove()
				thumbnails.splice(index, 1)
				thumbnails.forEach((thumb, i) => thumb.setAttribute('index', i))

				chrome.storage.local.get(['custom', 'customThumbnails'], (data) => {
					data.custom.splice(index, 1)
					data.customThumbnails.splice(index, 1)

					chrome.storage.local.set({ custom: data.custom })
					chrome.storage.local.set({ customThumbnails: data.customThumbnails })

					// Previous image, if first, stays here
					index -= index === 0 ? 0 : 1

					// Last image is removed
					if (data.custom.length === 0) {
						domoverlay.style.opacity = `0`
						domcredit.style.display = 'block'

						setTimeout(() => {
							unsplash(null, { removedCustom: true })
							clas(domcredit, true, 'shown')
						}, 400)
					}

					// Only draw new image if displayed is removed
					else if (toRemoveIsDisplayed) {
						changeImgIndex(index)
						chrome.storage.local.set({ customIndex: index })
						compress(data.custom[index])
					}
				})
			}
		}
	}

	function displayCustomThumbnails(settingsDom) {
		const thumbnails = settingsDom.querySelectorAll('#bg_tn_wrap .thumbnail')

		chrome.storage.local.get('customThumbnails', (data) => {
			if (data.customThumbnails) {
				if (thumbnails.length < data.customThumbnails.length) {
					data.customThumbnails.forEach((thumb, i) => {
						//used for blob
						const blob = thumb.replace('data:image/jpeg;base64,', '')
						addThumbnails(blob, i, settingsDom)
					})
				}
			}
		})
	}

	if (event) {
		if (event.is === 'thumbnail') displayCustomThumbnails(event.settings)
		if (event.is === 'newfile') addNewImage(event.file)
	}

	//init
	else {
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
				chrome.storage.sync.set({ custom_time: freqControl('set') })
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
				text: city + country,
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

		credits.forEach(function cityNameRef(elem, i) {
			const dom = document.createElement('a')
			dom.textContent = elem.text
			dom.href = elem.url

			if (i === 1) id('credit').appendChild(document.createElement('br'))
			id('credit').appendChild(dom)
		})

		clas(id('credit'), true, 'shown')
	}

	function loadBackground(props, loadTime) {
		imgBackground(props.url, loadTime)
		imgCredits(props)

		// sets meta theme-color to main background's color
		document.querySelector('meta[name="theme-color"]').setAttribute('content', props.color)
	}

	function requestNewList(collection, callback) {
		const header = new Headers()
		const collecId = allCollectionIds[collection] || allCollectionIds.day
		const url = `https://api.unsplash.com/photos/random?collections=${collecId}&count=8`
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

	function chooseCollection(eventCollection) {
		//
		if (eventCollection) {
			eventCollection = eventCollection.replaceAll(` `, '')
			allCollectionIds.user = eventCollection
			return 'user'
		}

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

	function collectionControl(dynamic) {
		const { every, lastCollec, collection } = dynamic

		// Collection control
		const longEveries = every === 'pause' || every === 'day'
		const collecId = longEveries && lastCollec ? lastCollec : chooseCollection(collection)

		if (collecId !== lastCollec || lastCollec === '') {
			dynamic.lastCollec = collecId
			chrome.storage.sync.set({ dynamic: dynamic })
		}

		return collecId
	}

	function cacheControl(dynamic, caches, collection, preloading) {
		//
		const needNewImage = freqControl('get', dynamic.every, dynamic.time)
		let list = caches[collection]

		// Is trying to preload next
		if (preloading) {
			noDisplayImgLoad(list[1].url, () => chrome.storage.local.remove('waitingForPreload'))
		}

		if (needNewImage && !preloading) {
			//
			// Update time
			dynamic.lastCollec = collection
			dynamic.time = freqControl('set')

			// Removes previous image from list
			if (list.length > 1) list.shift()

			// Load new image
			loadBackground(list[0])

			// If end of cache, get & save new list
			if (list.length === 1)
				requestNewList(collection, (newlist) => {
					caches[collection] = list.concat(newlist)
					noDisplayImgLoad(newlist[0].url, () => chrome.storage.local.set({ dynamicCache: caches }))
				})
			//
			// Or preload next
			else
				noDisplayImgLoad(list[1].url, () => {
					chrome.storage.sync.set({ dynamic: dynamic })
					chrome.storage.local.set({ dynamicCache: caches })
				})
		}

		// No need for new, load the same image
		else loadBackground(list[0])
	}

	function populateEmptyList(collection, local, dynamic, isEvent) {
		//
		if (isEvent) collection = chooseCollection(collection)

		requestNewList(collection, (newlist) => {
			//
			//change
			dynamic.time = freqControl('set')
			local.dynamicCache[collection] = newlist
			chrome.storage.sync.set({ dynamic: dynamic })

			const changeStart = performance.now()

			noDisplayImgLoad(newlist[0].url, () => {
				//
				loadBackground(newlist[0], performance.now() - changeStart)
				chrome.storage.local.set({ dynamicCache: local.dynamicCache })
				chrome.storage.local.set({ waitingForPreload: true })

				//preload
				noDisplayImgLoad(newlist[1].url, () => chrome.storage.local.remove('waitingForPreload'))
			})
		})
	}

	const initOrEvent = init && init.dynamic ? 'init' : 'event'
	// collections source: https://unsplash.com/@bonjourr/collections
	const allCollectionIds = {
		noon: 'GD4aOSg4yQE',
		day: 'o8uX55RbBPs',
		evening: '3M2rKTckZaQ',
		night: 'bHDh4Ae7O8o',
		user: '',
	}

	switch (initOrEvent) {
		case 'init': {
			chrome.storage.local.get(['dynamicCache', 'waitingForPreload'], function getCache(local) {
				const { current, next, every } = init.dynamic

				// <1.10.0: next is always old import
				// current to first background, default to 'day' collection
				if (next) {
					init.dynamic.lastCollec = 'day'

					delete init.dynamic.next
					delete init.dynamic.current
				}

				//
				//
				// Real init start
				const collecId = collectionControl(init.dynamic)

				// If no dynamicCache, create
				// If list empty: request new, save sync & local
				// Not empty: normal cacheControl
				if (local.dynamicCache === undefined) {
					local.dynamicCache = bonjourrDefaults('local').dynamicCache
					populateEmptyList(collecId, local, init.dynamic, false)
					if (current && every === 'pause') local.dynamicCache.day[0] = init.dynamic.current

					//
				} else if (local.dynamicCache[collecId].length === 0) {
					populateEmptyList(collecId, local, init.dynamic, false)

					//
				} else {
					cacheControl(init.dynamic, local.dynamicCache, collecId, local.waitingForPreload)
				}
			})
			break
		}

		case 'event': {
			chrome.storage.sync.get('dynamic', (data) => {
				chrome.storage.local.get('dynamicCache', (local) => {
					//

					switch (Object.keys(event)[0]) {
						case 'every': {
							data.dynamic.every = event.every
							data.dynamic.time = freqControl('set')
							chrome.storage.sync.set({ dynamic: data.dynamic })
							break
						}

						// Back to dynamic and load first from chosen collection
						case 'removedCustom': {
							chrome.storage.sync.set({ background_type: 'dynamic' })
							loadBackground(local.dynamicCache[collectionControl(data.dynamic)][0])
							break
						}

						// Always request another set, update last time image change and load background
						case 'collection': {
							domoverlay.style.opacity = '0'
							//
							// remove user collec
							if (event.collection === '') {
								const defaultColl = chooseCollection()
								local.dynamicCache.user = []
								data.dynamic.collection = ''
								data.dynamic.lastCollec = defaultColl

								chrome.storage.sync.set({ dynamic: data.dynamic })
								chrome.storage.local.set({ dynamicCache: local.dynamicCache })

								unsplash(data)
							}

							// add new collec
							else {
								data.dynamic.collection = event.collection
								data.dynamic.lastCollec = 'user'

								populateEmptyList(event.collection, local, data.dynamic, true)
							}

							break
						}
					}
				})
			})

			break
		}
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

function searchbar(event, that, init) {
	const display = (value) => id('sb_container').setAttribute('class', value ? 'shown' : 'hidden')
	const engine = (value) => domsearchbar.setAttribute('engine', value)
	const request = (value) => domsearchbar.setAttribute('request', stringMaxSize(value, 512))
	const setNewtab = (value) => domsearchbar.setAttribute('newtab', value)

	function updateSearchbar() {
		chrome.storage.sync.get('searchbar', (data) => {
			switch (event) {
				case 'searchbar': {
					data.searchbar.on = that.checked
					display(that.checked)
					break
				}

				case 'engine': {
					data.searchbar.engine = that.value
					clas(id('searchbar_request'), that.value === 'custom', 'shown')
					engine(that.value)
					break
				}

				case 'request': {
					const val = that.value

					if (val.indexOf('%s') !== -1) {
						data.searchbar.request = stringMaxSize(val, 512)
						that.blur()
					} else if (val.length > 0) {
						val = ''
						that.setAttribute('placeholder', tradThis('%s Not found'))
						setTimeout(() => that.setAttribute('placeholder', tradThis('Search query: %s')), 2000)
					}

					request(val)
					break
				}

				case 'newtab': {
					data.searchbar.newtab = that.checked
					setNewtab(that.checked)
					break
				}
			}

			chrome.storage.sync.set({ searchbar: data.searchbar })
		})
	}

	function initSearchbar() {
		// 1.9.2 ==> 1.9.3 lang breaking fix
		if (init.engine) {
			init.engine.replace('s_', '')
			chrome.storage.sync.set({ searchbar: init })
		}

		display(init.on, true)
		engine(init.engine, true)
		request(init.request, true)
		setNewtab(init.newtab, true)
	}

	domsearchbar.onkeyup = function (e) {
		if (e.key === 'Enter' && this.value.length > 0) {
			let searchURL = ''
			const isNewtab = e.target.getAttribute('newtab') === 'true'
			const lang = document.documentElement.getAttribute('lang')
			const engine = domsearchbar.getAttribute('engine')
			const request = domsearchbar.getAttribute('request')

			// engineLocales est dans lang.js

			if (engine === 'custom') searchURL = request
			else searchURL = engineLocales[engine].base.replace('%l', engineLocales[engine][lang])

			searchURL = searchURL.replace('%s', this.value)

			isNewtab ? window.open(searchURL, '_blank') : (window.location = searchURL)
		}
	}

	event ? updateSearchbar() : initSearchbar()
}

function showPopup(data) {
	function affiche() {
		const setReviewLink = () =>
			mobilecheck
				? 'https://github.com/victrme/Bonjourr/stargazers'
				: navigator.userAgent.includes('Chrome')
				? 'https://chrome.google.com/webstore/detail/bonjourr-%C2%B7-minimalist-lig/dlnejlppicbjfcfcedcflplfjajinajd/reviews'
				: 'https://addons.mozilla.org/en-US/firefox/addon/bonjourr-startpage/'

		const close = () => {
			dom.wrap.classList.replace('shown', 'removing')
			chrome.storage.sync.set({ reviewPopup: 'removed' })
		}

		const dom = {
			wrap: document.createElement('div'),
			btnwrap: document.createElement('div'),
			desc: document.createElement('span'),
			review: document.createElement('a'),
			donate: document.createElement('a'),
			close: document.createElement('p'),
		}

		dom.wrap.id = 'popup'
		dom.desc.textContent = tradThis(
			'Love using Bonjourr? Consider giving us a review or donating, that would help a lot! 😇'
		)

		dom.review.href = setReviewLink()
		dom.donate.href = 'http://bonjourr.fr/#donate'

		dom.review.textContent = tradThis('Review')
		dom.donate.textContent = tradThis('Donate')

		dom.close.id = 'closePopup'
		dom.close.textContent = '×'

		dom.btnwrap.className = 'choices'
		dom.btnwrap.appendChild(dom.review)
		dom.btnwrap.appendChild(dom.donate)

		dom.wrap.appendChild(dom.desc)
		dom.wrap.appendChild(dom.btnwrap)
		dom.wrap.appendChild(dom.close)

		document.body.appendChild(dom.wrap)

		setTimeout(() => dom.wrap.classList.add('shown'), 10)

		if (mobilecheck) setTimeout(() => dominterface.addEventListener('touchstart', close), 4000)
		else id('closePopup').onclick = close

		document.querySelectorAll('#popup .choices a')[0].onclick = close
		document.querySelectorAll('#popup .choices a')[1].onclick = close
	}

	//s'affiche après 30 tabs
	if (data > 30) affiche()
	else if (typeof data === 'number') chrome.storage.sync.set({ reviewPopup: data + 1 })
	else if (data !== 'removed') chrome.storage.sync.set({ reviewPopup: 0 })
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
			let font = data.font || { family: '', weight: ['300'], size: 13 }
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

function modifyWeightOptions(weights, settingsDom) {
	const select = (settingsDom ? settingsDom : id('settings')).querySelector('#i_weight')
	const options = select.querySelectorAll('option')

	if (!weights || weights.length === 0) {
		options.forEach((option) => (option.style.display = 'block'))
		return true
	}

	// Theres weights
	else {
		// filters
		if (weights.includes('regular')) weights[weights.indexOf('regular')] = '400'
		weights = weights.map((aa) => parseInt(aa))

		// toggles selects
		if (options) {
			options.forEach(
				(option) => (option.style.display = weights.indexOf(parseInt(option.value)) !== -1 ? 'block' : 'none')
			)
		}
	}
}

function safeFont(settingsDom) {
	const is = safeFontList
	let toUse = is.fallback
	const hasUbuntu = document.fonts.check('16px Ubuntu')
	const notAppleOrWindows = !testOS.mac() && !testOS.windows() && !testOS.ios()

	if (testOS.windows()) toUse = is.windows
	else if (testOS.android()) toUse = is.android
	else if (testOS.mac() || testOS.ios()) toUse = is.apple
	else if (notAppleOrWindows && hasUbuntu) toUse = is.linux

	if (settingsDom) {
		settingsDom.querySelector('#i_customfont').setAttribute('placeholder', toUse.placeholder)
		modifyWeightOptions(toUse.weights, settingsDom)
	}

	return toUse
}

function customFont(data, event) {
	const save = (url, family, availWeights, weight) => {
		chrome.storage.sync.get('font', (data) => {
			const font = data.font || {}

			font.url = url
			font.family = family
			font.availWeights = availWeights || []
			font.weight = weight

			slowRange({ font: font }, 200)
		})
	}

	// Fetches fonts.google.com url
	function apply(url, family, weight) {
		if (url) {
			fetch(url)
				.then((response) => response.text())
				.then((text) => {
					text = text.replace(/(\r\n|\n|\r|  )/gm, '')
					id('fontstyle').textContent = text
					id('clock').style.fontFamily = family
					dominterface.style.fontFamily = family
					canDisplayInterface('fonts')
				})
		}

		weight = parseInt(weight)

		if (weight) {
			const list = safeFont().weights
			dominterface.style.fontWeight = weight
			id('searchbar').style.fontWeight = weight

			// If family, weight. default ? lower by one weight
			id('clock').style.fontWeight = family ? weight : weight > 100 ? list[list.indexOf(weight) - 1] : weight
		}
	}

	// Event only
	// Uses already saved url, replaces weight from url and apply / save
	function changeWeight(val, font) {
		if (font.url) {
			font.url = font.url.slice(0, font.url.lastIndexOf(':') + 1)
			font.url += val

			apply(font.url, font.family, val)
			save(font.url, font.family, font.availWeights, val)
		} else {
			apply(null, null, val)
			save('', '', [], val)
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
			const defaultWeight = availWeights.includes('regular') ? 400 : availWeights[0]
			const url = `https://fonts.googleapis.com/css?family=${font[0].family}:${defaultWeight}`

			// Change l'url
			apply(url, font[0].family, 400)
			save(url, font[0].family, availWeights, 400)

			// Et les weight options
			modifyWeightOptions(availWeights, null, true)
			id('i_weight').value = '400'

			if (dom) dom.blur()
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
					'https://www.googleapis.com/webfonts/v1/webfonts?sort=popularity&key=' +
						atob(atob('UVVsNllWTjVRV3Q1TTBwWll6SnlRMDlNTVdwSmMzTkhRbWRNY2pGUVZEUjVWekUxYWs5cg=='))
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
			// family and size
			id('fontstyle').textContent = ''
			id('clock').style.fontFamily = ''
			dominterface.style.fontFamily = ''

			// weights
			const baseWeight = testOS.windows() ? '400' : '300'
			dominterface.style.fontWeight = baseWeight
			id('searchbar').style.fontWeight = baseWeight
			id('clock').style.fontWeight = ''

			id('i_weight').value = baseWeight

			// save
			safeFont(id('settings'))
			save('', '', [], baseWeight)

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

		if (event.autocomplete) {
			fetchFontList(function fillFamilyInput(json) {
				const fragment = new DocumentFragment()

				json.items.forEach(function addOptions(item) {
					const option = document.createElement('option')

					option.textContent = item.family
					option.setAttribute('value', item.family)
					fragment.appendChild(option)
				})

				event.settingsDom.querySelector('#dl_fontfamily').appendChild(fragment)
			})
		}
	}

	// init
	if (data) {
		const { family, url, weight } = data

		if (family && url) apply(url, family, weight || '400')
		else if (weight) apply(null, null, weight)
		//
		// 1.9.3 ==> 1.10.0
		else if (family && !url) triggerEvent(data)
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

		// 1.10.0 online hotfix
		if (list.length === 0) {
			let newHidden = [[0, 0], [0, 0, 0], [0], [0]]
			chrome.storage.sync.set({ hide: newHidden })
			return newHidden
		}

		// Had nothing to hide
		else return list
	}

	// startup initialization
	if (!that && !buttons) {
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
		loadtime = loadtime < 33 ? 0 : 400

		domshowsettings.style.transition = `opacity ${loadtime}ms`
		dominterface.style.transition = `opacity ${loadtime}ms, transform .4s`
		dominterface.style.opacity = '1'

		clas(domshowsettings, true, 'enabled')

		setTimeout(() => {
			dominterface.classList.remove('init')
			domshowsettings.classList.remove('init')
			domshowsettings.style.transition = ``
		}, loadtime + 100)

		// Prevent error message from appearing
		clearTimeout(errorMessageInterval)
	}

	// More conditions if user is using advanced features
	if (init) {
		if (init.font) if (init.font.family && init.font.url) funcsOk.fonts = false
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

function filterImports(data) {
	const filter = {
		lang: (lang) => (lang === undefined ? 'en' : lang),
		background_blur: (blur) => (typeof blur === 'string' ? parseFloat(blur) : blur),

		links: (links) => {
			if (links && links.length > 0)
				links.forEach((elem, ii) => {
					if (elem.icon.length > 8080) links[ii].icon = 'src/assets/interface/loading.gif'
					else if (elem.icon.length > 64) links[ii].icon = saveIconAsAlias(elem.icon)
				})

			return links
		},

		dynamic: (dynamic) => {
			if (dynamic) {
				// New collection key missing
				// Removes dynamics cache
				if (!dynamic.collection) {
					return { ...dynamic, collection: '' }
				}
			}

			return dynamic
		},

		hide: (hide) => {
			if (hide === undefined || hide.length === 0) return [[0, 0], [0, 0, 0], [0], [0]]
			else if (hide && hide.length > 0) {
				// Changes new hidden classes
				const weatherIndex = hide.indexOf('weather_desc')
				const widgetIndex = hide.indexOf('w_icon')

				if (weatherIndex >= 0) hide[weatherIndex] = 'description'
				if (widgetIndex >= 0) hide[widgetIndex] = 'widget'
			}

			return hide
		},

		weather: (weather) => {
			if (weather) {
				if (weather.location === false) result.weather.location = []

				// 1.9.3 ==> 1.10.0
				if (weather.lastState && weather.lastState.sunset === undefined) {
					const old = weather.lastState

					weather.lastState = {
						feels_like: old.main.feels_like,
						temp_max: old.main.temp_max,
						sunrise: old.sys.sunrise,
						sunset: old.sys.sunset,
						description: old.weather[0].description,
						icon_id: old.weather[0].id,
					}
				}

				if (weather.lastCall) weather.lastCall = 0
				if (weather.forecastLastCall) delete weather.forecastLastCall
			}

			return weather
		},

		font: (font) => {
			if (font) {
				delete font.availableWeights
				delete font.supportedWeights
			}

			if (font.availWeights === undefined) font.availWeights = []

			return font
		},
	}

	let result = { ...data }

	// for 1.9.x => 1.10, newtab/engine doesnt work with forEach below
	// after 1.10, searchbar goes in filter.searchbar
	if (!result.searchbar || typeof result.searchbar === 'boolean') {
		result.searchbar = {
			on: data.searchbar || false,
			newtab: data.searchbar_newtab || false,
			engine: data.searchbar_engine || 'google',
			request: typeof data.searchbar === 'object' ? (data.searchbar.request ? data.searchbar.request : '') : '',
		}

		if (result.searchbar_engine) delete result.searchbar_engine
		if (result.searchbar_newtab) delete result.searchbar_newtab
	}

	// Go through found categories in import data to filter them
	Object.entries(data).forEach(([key, val]) => (filter[key] ? (result[key] = filter[key](val)) : ''))

	return result
}

function startup(data) {
	canDisplayInterface(null, { font: data.font })
	traduction(null, data.lang)

	sunTime(data.weather)
	weather(null, null, data.weather)

	customFont(data.font)
	customSize(data.font)

	clock(null, data)
	linksrow(data.linksrow)
	darkmode(null, data)
	searchbar(null, null, data.searchbar)
	showPopup(data.reviewPopup)

	customCss(data.css)
	hideElem(data.hide)
	initBackground(data)
	quickLinks(null, null, data)

	setTimeout(() => settingsInit(data), 200)
}

window.onload = function () {
	//
	// Only on Online
	switch (window.location.protocol) {
		case 'http:':
		case 'https:':
		case 'file:': {
			//
			// Service Worker
			if ('serviceWorker' in navigator) {
				navigator.serviceWorker.register('/service-worker.js')
			}

			// PWA install trigger (30s interaction default)
			let promptEvent
			window.addEventListener('beforeinstallprompt', function (e) {
				promptEvent = e
			})

			// Safari overflow fix
			// Todo: add safari condition
			const appHeight = () => document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`)
			window.addEventListener('resize', appHeight)
			appHeight()

			break
		}
	}

	try {
		chrome.storage.sync.get(null, (data) => {
			errorMessageInterval = setTimeout(() => {
				errorMessage(JSON.stringify(data), null)
			}, 1000)

			//
			let newVersion = !data.about
			if (data.about) newVersion = data.about.version !== BonjourrVersion

			const whichStart = Object.keys(data).length === 0 ? 'firstStartup' : newVersion ? 'newVersion' : 'normal'

			switch (whichStart) {
				case 'firstStartup': {
					data = bonjourrDefaults('sync')

					chrome.storage.local.set(bonjourrDefaults('local'))
					chrome.storage.sync.set(isExtension ? data : { import: data })
					startup(data)

					break
				}

				case 'newVersion': {
					//
					// 1.9.3 => 1.10, fills default data to storage
					if (!data.about)
						Object.entries(bonjourrDefaults('sync')).forEach(([key, val]) =>
							data[key] === undefined ? (data[key] = val) : data[key]
						)

					data = filterImports(data)
					chrome.storage.sync.set(isExtension ? data : { import: data })
					startup(data)
					break
				}

				case 'normal':
					startup(data)
					break
			}
		})
	} catch (error) {
		errorMessage(null, error)
	}
}
