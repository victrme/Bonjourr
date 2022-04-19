function traduction(settingsDom, lang = 'en') {
	//
	function traduis() {
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

function favicon(init, event) {
	function createFavicon(emoji) {
		const svg = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${emoji}</text></svg>`
		document.querySelector("link[rel~='icon']").href = emoji ? svg : 'src/assets/favicon-128x128.png'
	}

	if (init !== undefined) createFavicon(init)

	if (event) {
		const val = event.value
		const isEmoji = val.match(/\p{Emoji}/gu) && !val.match(/[0-9a-z]/g)

		if (isEmoji) createFavicon(val)
		else event.value = ''

		slowRange({ favicon: isEmoji ? val : '' })
	}
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

		try {
			startClock(clock, init.greeting, init.usdate)
			clockDate(zonedDate(clock.timezone), init.usdate)
			greetings(zonedDate(clock.timezone), init.greeting)
			changeAnalogFace(clock.face)
			canDisplayInterface('clock')
		} catch (e) {
			errorMessage('Clock / greetings failed at init', e)
		}
	}
}

function quickLinks(event, that, init) {
	// Pour ne faire qu'un seul storage call
	// [{ index: number, url: string }]
	let editDisplayTimeout = setTimeout(() => {}, 0)
	let hovered = { parent: undefined, link: {}, index: 0 }

	async function initblocks(links) {
		if (links.length > 0) {
			try {
				// Add blocks and events
				const blocklist = links.map((l) => appendblock(l))
				blocklist.forEach(({ parent }) => addEvents(parent))
				canDisplayInterface('links')

				// Load icons one by one
				links.map(async (link, index) => {
					const dom = blocklist[index].icon
					const needsToChange = ['api.faviconkit.com', 'loading.gif'].some((x) => link.icon.includes(x))

					// Fetch new icons if matches these urls
					if (needsToChange) {
						link.icon = await fetchNewIcon(dom, link.url)
						chrome.storage.sync.set({ [link._id]: link })
					}

					// Apply cached
					else dom.src = link.icon
				})
			} catch (e) {
				errorMessage('Failed to load links', e)
			}
		}

		// Links is done
		else canDisplayInterface('links')
	}

	async function fetchNewIcon(dom, url) {
		// Apply loading gif d'abord
		dom.src = 'src/assets/interface/loading.gif'

		const img = new Image()
		const a = document.createElement('a')
		a.href = url

		// Google favicon API is fallback
		let result = `https://www.google.com/s2/favicons?sz=64&domain=${a.hostname}`
		const api = await fetch(`https://favicongrabber.com/api/grab/${a.hostname}`)

		if (api.ok) {
			const json = await api.json()
			const array = json.icons.filter((x) => x.src.includes('.png'))
			let png = { size: 0, index: 0 }

			// Filter favicon pngs
			// Keep the biggest one (or first one if no sizes)
			if (array.length > 0) {
				array.forEach((elem, i) => {
					if (elem.sizes) {
						const currentSize = parseInt(elem.sizes.split('x')[0])
						if (currentSize > png[0]) png = { size: currentSize, index: i }
					}
				})

				result = array[png.index].src
			}
		}

		img.onload = () => (dom.src = result)
		img.src = result
		img.remove()

		return result
	}

	function appendblock(link) {
		let title = stringMaxSize(link.title, 64)
		let url = stringMaxSize(link.url, 512)

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
		blockTitle.style.display = title === '' ? 'none' : 'block'

		block.className = 'block'
		block.setAttribute('source', url)
		block.appendChild(lIconWrap)
		block.appendChild(blockTitle)

		block_parent.setAttribute('class', 'block_parent')
		block_parent.setAttribute('draggable', 'true')
		block_parent.appendChild(block)

		//l'ajoute au dom
		domlinkblocks.appendChild(block_parent)

		return { icon: lIcon, parent: block_parent }
	}

	function removeLinkSelection() {
		//enleve les selections d'edit
		domlinkblocks.querySelectorAll('.l_icon_wrap').forEach(function (e) {
			clas(e, false, 'selected')
		})
	}

	function showDelIcon(input) {
		const img = input.nextElementSibling
		if (input.value === '') img.classList.remove('shown')
		else img.classList.add('shown')
	}

	function addEvents(elem) {
		function handleDrag(is, that) {
			chrome.storage.sync.get(null, (data) => {
				const index = findindex(that)
				const link = bundleLinks(data)[index]

				if (is === 'enter') {
					hovered = { parent: elem, link, index }
					return
				}

				if (is === 'end') {
					if (hovered.index === index) return

					const dragged = { parent: elem }
					const hoveredChild = hovered.parent.children[0]
					const draggedChild = dragged.parent.children[0]

					hovered.parent.children[0].remove()
					dragged.parent.children[0].remove()
					hovered.parent.appendChild(draggedChild)
					dragged.parent.appendChild(hoveredChild)

					const temp = link.order
					data[link._id].order = hovered.link.order
					data[hovered.link._id].order = temp

					chrome.storage.sync.set(data)
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

			if (e.which === 3) {
				editlink(this)
				return
			}

			if (!has(id('settings'), 'shown')) {
				openlink(this, e)
			}
		}

		// Mobile clicks
		let touchStartTime = 0
		let touchTimeout = setTimeout(() => {}, 0)

		const startHandler = () => {
			touchStartTime = performance.now()
			touchTimeout = setTimeout(() => editlink(elem), 300)
		}

		const endHandler = (e) => {
			if (performance.now() - touchStartTime < 300) {
				clearTimeout(touchTimeout)
				openlink(elem, e)
			}
		}

		elem.addEventListener('touchstart', startHandler, { passive: true })
		elem.addEventListener('touchend', endHandler, { passive: true })
	}

	function editEvents() {
		const editLinkContainer = id('editlink_container')

		function closeEditLink() {
			removeLinkSelection()
			editLinkContainer.classList.add('hiding')
			editDisplayTimeout = setTimeout(() => editLinkContainer.setAttribute('class', ''), BonjourrAnimTime)
		}

		function emptyAndHideIcon(e) {
			e.target.previousElementSibling.value = ''
			e.target.classList.remove('shown')
		}

		id('e_delete').onclick = function () {
			removeLinkSelection()
			removeblock(parseInt(id('editlink').getAttribute('index')))
			clas(editLinkContainer, false, 'shown')
			if (id('settings')) linksInputDisable(false)
		}

		id('e_submit').onclick = function () {
			removeLinkSelection()
			const noError = editlink(null, parseInt(id('editlink').getAttribute('index')))
			if (noError) closeEditLink()
		}
		// close on button
		id('e_close').onclick = () => closeEditLink()

		// close on outside click
		const outsideClick = (e) => (e.target.id === 'editlink_container' ? closeEditLink() : '')
		if (mobilecheck) editLinkContainer.addEventListener('touchstart', outsideClick, { passive: true })
		else editLinkContainer.onmousedown = outsideClick

		const removers = ['re_title', 're_url', 're_iconurl']
		const inputs = ['e_title', 'e_url', 'e_iconurl']

		removers.forEach((name) => (id(name).onclick = (e) => emptyAndHideIcon(e)))
		inputs.forEach((name) => (id(name).onkeyup = (e) => showDelIcon(e.target)))
	}

	function editlink(that, i) {
		const e_title = id('e_title')
		const e_url = id('e_url')
		const e_iconurl = id('e_iconurl')

		function displayEditWindow() {
			const index = findindex(that)
			const liconwrap = that.querySelector('.l_icon_wrap')
			const container = id('editlink_container')
			const opendedSettings = has(id('settings'), 'shown')

			clas(liconwrap, true, 'selected')
			clas(container, true, 'shown')
			clas(container, opendedSettings, 'pushed')

			id('editlink').setAttribute('index', index)

			chrome.storage.sync.get(null, (data) => {
				const link = bundleLinks(data).filter((l) => l.order === index)[0]
				const { title, url, icon } = link

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

		function updatesEditedLink() {
			if (e_iconurl.value.length === 7500) {
				e_iconurl.value = ''
				e_iconurl.setAttribute('placeholder', tradThis('Icon must be < 8kB'))

				return false
			}

			chrome.storage.sync.get(null, (data) => {
				const parent = domlinkblocks.children[i + 1]
				let link = bundleLinks(data).filter((l) => l.order === i)[0]

				link = {
					...link,
					title: stringMaxSize(e_title.value, 64),
					url: stringMaxSize(e_url.value, 512),
					icon: stringMaxSize(e_iconurl.value, 7500),
				}

				parent.querySelector('.block').setAttribute('source', link.url)
				parent.querySelector('img').src = link.icon
				parent.querySelector('span').textContent = link.title

				parent.querySelector('span').style.display = link.title === '' ? 'none' : 'block'

				// Updates
				chrome.storage.sync.set({ [link._id]: link })
			})

			return true
		}

		// If i is defined, updates a link
		if (typeof i === 'number') {
			return updatesEditedLink()
		}

		displayEditWindow()
	}

	function openlink(that, e) {
		const source = that.children[0].getAttribute('source')
		const a_hiddenlink = id('hiddenlink')

		chrome.storage.sync.get('linknewtab', (data) => {
			const toNewTab = e.which === 2 || e.ctrlKey || data.linknewtab

			a_hiddenlink.setAttribute('href', source)
			a_hiddenlink.setAttribute('target', toNewTab ? '_blank' : '_self')
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
		chrome.storage.sync.get(null, (data) => {
			const links = bundleLinks(data)
			let link = links.filter((l) => l.order === index)[0]

			//enleve le html du block
			const blockParent = domlinkblocks.children[index + 1]
			const height = blockParent.getBoundingClientRect().height

			blockParent.style.height = height + 'px'
			clas(blockParent, true, 'removed')

			setTimeout(function () {
				domlinkblocks.removeChild(blockParent)
				if (links.length === 0) domlinkblocks.style.visibility = 'hidden' //enleve linkblocks si il n'y a plus de links
			}, 600)

			links.map((l) => {
				l.order > index ? (l.order -= 1) : '' // Decrement order for elements above the one removed
				data[l._id] = l // updates link in storage
			})

			chrome.storage.sync.set(data)
			chrome.storage.sync.remove(link._id)
		})
	}

	function linkSubmission(importList) {
		//
		function filterNewLink(title, url) {
			//
			url = stringMaxSize(url, 512)
			const to = (scheme) => url.startsWith(scheme)
			const acceptableSchemes = to('http://') || to('https://')
			const unacceptable = to('about:') || to('chrome://')

			return {
				_id: 'links' + randomString(6),
				order: 0,
				title: stringMaxSize(title, 64),
				icon: 'src/assets/interface/loading.gif',
				url: acceptableSchemes ? url : unacceptable ? false : 'https://' + url,
			}
		}

		function saveLink(link, order) {
			id('i_title').value = ''
			id('i_url').value = ''

			link.order = order

			// Displays and saves before fetching icon
			initblocks([link])
			chrome.storage.sync.set({ [link._id]: link })

			// Some other dom control
			if (order >= 30) linksInputDisable(true)
			domlinkblocks.style.visibility = 'visible'
		}

		chrome.storage.sync.get(null, (data) => {
			const links = bundleLinks(data)
			const url = id('i_url').value
			const title = id('i_title').value

			if (importList?.length > 0) {
				importList.forEach(({ title, url }, i) => {
					if (!url) return
					saveLink(filterNewLink(title, url), links.length + i) // increment order for each import
				})
			}

			// Si l'url est assez longue et l'input n'a pas été activé ya -1s
			if (url.length > 2 && !stillActive) {
				saveLink(filterNewLink(title, url), links.length)
			}
		})
	}

	function linksInputDisable(isMax, settingsDom) {
		const getDoms = (name) => (settingsDom ? settingsDom.querySelector('#' + name) : id(name))
		const doms = ['i_title', 'i_url', 'submitlink', 'b_importbookmarks']

		if (isMax) doms.forEach((elem) => getDoms(elem).setAttribute('disabled', ''))
		else doms.forEach((elem) => getDoms(elem).removeAttribute('disabled'))

		clas(getDoms(doms[2]), isMax, 'max')
		clas(getDoms(doms[3]), isMax, 'max')
	}

	switch (event) {
		case 'input':
		case 'button':
			linkSubmission(that)
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

	if (init) {
		initblocks(bundleLinks(init))

		// No need to activate edit events asap
		setTimeout(function timeToSetEditEvents() {
			id('editlink_container').oncontextmenu = (e) => e.preventDefault()
			editEvents()
		}, 150)
	}
}

async function linksImport() {
	const closeBookmarks = (container) => {
		container.classList.add('hiding')
		setTimeout(() => container.setAttribute('class', ''), BonjourrAnimTime)
	}

	function main(links, bookmarks) {
		const changeCounter = (number) => (id('selectedCounter').textContent = `${number} / 30`)

		const form = document.createElement('form')
		const allCategories = [...bookmarks[0].children]
		let counter = links.length || 0
		let bookmarksList = []
		let selectedList = []

		changeCounter(counter)
		allCategories.forEach((cat) => bookmarksList.push(...cat.children))

		bookmarksList.forEach((mark, index) => {
			const elem = document.createElement('div')
			const title = document.createElement('h5')
			const url = document.createElement('pre')

			title.textContent = mark.title
			url.textContent = mark.url
			elem.setAttribute('index', index)

			elem.appendChild(title)
			elem.appendChild(url)
			elem.onclick = () => {
				const isSelected = elem.classList.toggle('selected')
				const isFull = isSelected && counter === 30

				// Color counter
				clas(id('selectedCounter'), isSelected && counter > 28, 'full')

				// unselect selection if full
				if (isFull) elem.classList.toggle('selected')
				else {
					isSelected ? selectedList.push(elem.getAttribute('index')) : selectedList.pop()
					isSelected ? counter++ : (counter -= 1)
					changeCounter(counter)
				}

				// Change submit button text & class on selections
				const amountSelected = counter - links.length
				id('applybookmarks').textContent = tradThis(
					amountSelected === 0
						? 'Select bookmarks to import'
						: amountSelected === 1
						? 'Import this bookmark'
						: 'Import these bookmarks'
				)
				clas(id('applybookmarks'), amountSelected === 0, 'none')
			}

			// only append links if url are not empty
			// (temp fix to prevent adding bookmarks folder title ?)
			if (typeof mark.url === 'string')
				if (links.filter((x) => x.url === stringMaxSize(mark.url, 512)).length === 0) form.appendChild(elem)
		})

		// Replace form to filter already added bookmarks
		const oldForm = document.querySelector('#bookmarks form')
		if (oldForm) oldForm.remove()
		id('bookmarks').insertBefore(form, document.querySelector('#bookmarks .bookmarkOptions'))

		// Submit event
		id('applybookmarks').onclick = function () {
			const bookmarkToApply = selectedList.map((i) => ({ title: bookmarksList[i].title, url: bookmarksList[i].url }))

			if (bookmarkToApply.length > 0) {
				closeBookmarks(id('bookmarks_container'))
				quickLinks('button', bookmarkToApply, null)
			}
		}
	}

	// Ask for bookmarks first
	chrome.permissions.request({ permissions: ['bookmarks'] }, (granted) => {
		if (!granted) return

		chrome.storage.sync.get(null, (data) => {
			;(window.location.protocol === 'moz-extension:' ? browser : chrome).bookmarks.getTree().then((response) => {
				clas(id('bookmarks_container'), true, 'shown')
				main(bundleLinks(data), response)
			})
		})
	})

	// Close events
	document.querySelector('#bookmarks #e_close').onclick = () => closeBookmarks(id('bookmarks_container'))

	id('bookmarks_container').addEventListener('click', function (e) {
		if (e.target.id === 'bookmarks_container') closeBookmarks(this)
	})
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
	const toggleTempUnit = (F, temp) => (F ? toFarenheit(temp) : toCelsius(temp))

	const WEATHER_API_KEY = [
		'YTU0ZjkxOThkODY4YTJhNjk4ZDQ1MGRlN2NiODBiNDU=',
		'Y2U1M2Y3MDdhZWMyZDk1NjEwZjIwYjk4Y2VjYzA1NzE=',
		'N2M1NDFjYWVmNWZjNzQ2N2ZjNzI2N2UyZjc1NjQ5YTk=',
	]

	async function initWeather(param) {
		const applyResult = (geol) => {
			request(param, true)
			request(param, false)

			if (id('settings')) {
				id('i_ccode').value = param.ccode
				id('i_city').setAttribute('placeholder', param.city)

				if (geol) {
					clas(id('sett_city'), true, 'hidden')
					id('i_geol').checked = true
				}
			}
		}

		try {
			const ipapi = await fetch('https://ipapi.co/json')
			if (ipapi.ok) {
				const json = await ipapi.json()
				if (!json.error) param = { ...param, city: json.city, ccode: json.country }
			}
		} catch (error) {
			console.warn(error)
		}

		navigator.geolocation.getCurrentPosition(
			(pos) => {
				param.location = [pos.coords.latitude, pos.coords.longitude]
				applyResult(true)
			},
			() => applyResult(false)
		)
	}

	async function request(storage, forecast) {
		function saveCurrent(response) {
			//
			const isF = storage.unit === 'imperial'
			const { temp, feels_like, temp_max } = response.main

			weatherToSave = {
				...weatherToSave,
				lastCall: Math.floor(new Date().getTime() / 1000),
				lastState: {
					temp: isF ? toFarenheit(temp) : temp,
					feels_like: isF ? toFarenheit(feels_like) : feels_like,
					temp_max: isF ? toFarenheit(temp_max) : temp_max,
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

			const isF = storage.unit === 'imperial'
			weatherToSave.fcHigh = Math.floor(isF ? toFarenheit(maxTempFromList) : maxTempFromList)
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
		try {
			const weatherAPI = await fetch(url)

			if (weatherAPI.ok) {
				const json = await weatherAPI.json()
				forecast ? saveForecast(json) : saveCurrent(json)
			}
			return weatherAPI.ok
		} catch (error) {
			return false
		}
	}

	function weatherCacheControl(storage) {
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

	function displaysCurrent(storage) {
		const currentState = storage.lastState

		// 1.11.1 => 1.11.2 control
		if (storage.temperature === undefined) {
			storage.temperature = 'actual'
			currentState.temp = currentState.feels_like
		}

		function handleDescription() {
			const desc = currentState.description
			const feels = Math.floor(currentState.feels_like)
			const actual = Math.floor(currentState.temp)
			let tempText = ''

			switch (storage.temperature) {
				case 'feelslike': {
					tempText = `${tradThis('It currently feels like')} ${feels}°`
					break
				}

				case 'both': {
					tempText = `${tradThis('It is currently')} ${actual}°, ${tradThis('feels like')} ${feels}°`
					break
				}

				default: {
					tempText = `${tradThis('It is currently')} ${actual}°`
				}
			}

			current.textContent = `${desc[0].toUpperCase() + desc.slice(1)}. ${tempText}`
			widget.querySelector('p').textContent = actual + '°'
		}

		function handleWidget() {
			let filename = 'lightrain'
			const categorieIds = [
				[[200, 201, 202, 210, 211, 212, 221, 230, 231, 232], 'thunderstorm'],
				[[300, 301, 302, 310], 'lightdrizzle'],
				[[312, 313, 314, 321], 'showerdrizzle'],
				[[500, 501, 502, 503], 'lightrain'],
				[[504, 520, 521, 522], 'showerrain'],
				[[511, 600, 601, 602, 611, 612, 613, 615, 616, 620, 621, 622], 'snow'],
				[[701, 711, 721, 731, 741, 751, 761, 762, 771, 781], 'mist'],
				[[800], 'clearsky'],
				[[801], 'fewclouds'],
				[[802], 'brokenclouds'],
				[[803, 804], 'overcastclouds'],
			]

			categorieIds.forEach((category) => {
				if (category[0].includes(currentState.icon_id)) filename = category[1]
			})

			const widgetIcon = widget.querySelector('img')
			const { now, rise, set } = sunTime()
			const timeOfDay = now < rise || now > set ? 'night' : 'day'
			const iconSrc = `src/assets/weather/${timeOfDay}/${filename}.png`

			if (widgetIcon) {
				if (widgetIcon.getAttribute('src') !== iconSrc) widgetIcon.setAttribute('src', iconSrc)
			} else {
				const icon = document.createElement('img')
				icon.src = iconSrc
				icon.setAttribute('draggable', 'false')
				widget.prepend(icon)

				// from 1.2s request anim to .4s hide elem anim
				setTimeout(() => (widget.style.transition = 'opacity .4s'), BonjourrAnimTime)
			}
		}

		handleWidget()
		handleDescription()

		clas(current, false, 'wait')
		clas(widget, false, 'wait')
	}

	function displaysForecast(weather) {
		forecast.textContent = `${tradThis('with a high of')} ${weather.fcHigh}° ${tradThis(
			date.getHours() > 21 ? 'tomorrow' : 'today'
		)}.`

		clas(forecast, false, 'wait')
	}

	function forecastVisibilityControl(value) {
		let isTimeForForecast = false

		if (value === 'auto') isTimeForForecast = date.getHours() < 12 || date.getHours() > 21
		else isTimeForForecast = value === 'always'

		clas(forecast, isTimeForForecast, 'shown')
	}

	async function updatesWeather() {
		//

		async function fetches(weather) {
			const main = await request(weather, false)
			const forecast = await request(weather, true)

			return main && forecast
		}

		chrome.storage.sync.get('weather', async (data) => {
			switch (event) {
				case 'units': {
					data.weather.unit = that.checked ? 'imperial' : 'metric'

					if (data.weather.lastState) {
						const { feels_like, temp } = data.weather.lastState
						data.weather.lastState.temp = toggleTempUnit(that.checked, temp)
						data.weather.lastState.feels_like = toggleTempUnit(that.checked, feels_like)
						data.weather.fcHigh = toggleTempUnit(that.checked, data.weather.fcHigh)
					}

					displaysCurrent(data.weather)
					displaysForecast(data.weather)
					chrome.storage.sync.set({ weather: data.weather })
					slow(that)
					break
				}

				case 'city': {
					slow(that)

					if (i_city.value.length < 3) return false
					else if (navigator.onLine) {
						data.weather.ccode = i_ccode.value
						data.weather.city = stringMaxSize(i_city.value, 64)

						const inputAnim = i_city.animate([{ opacity: 1 }, { opacity: 0.6 }], {
							direction: 'alternate',
							easing: 'linear',
							duration: 800,
							iterations: Infinity,
						})

						const cityFound = await fetches(data.weather)

						if (cityFound) i_city.blur()
						i_city.setAttribute('placeholder', cityFound ? data.weather.city : tradThis('City not found'))
						i_city.value = ''
						inputAnim.cancel()
					}

					break
				}

				case 'geol': {
					data.weather.location = []
					that.setAttribute('disabled', '')

					if (that.checked) {
						navigator.geolocation.getCurrentPosition(
							(pos) => {
								//update le parametre de location
								clas(sett_city, that.checked, 'hidden')
								data.weather.location.push(pos.coords.latitude, pos.coords.longitude)
								fetches(data.weather)
							},
							(refused) => {
								//désactive geolocation if refused
								setTimeout(() => (that.checked = false), 400)
								if (!data.weather.city) initWeather()
								console.log(refused)
							}
						)
					} else {
						i_city.setAttribute('placeholder', data.weather.city)
						i_ccode.value = data.weather.ccode
						clas(sett_city, that.checked, 'hidden')

						data.weather.location = []
						fetches(data.weather)
					}

					slow(that)
					break
				}

				case 'forecast': {
					data.weather.forecast = that.value
					chrome.storage.sync.set({ weather: data.weather })
					forecastVisibilityControl(that.value)
					break
				}

				case 'temp': {
					data.weather.temperature = that.value
					chrome.storage.sync.set({ weather: data.weather })
					displaysCurrent(data.weather)
					break
				}
			}
		})
	}

	// Event & Init
	if (event) updatesWeather()
	else {
		try {
			if (validateHideElem(init.hide)) {
				if (init.hide[1][1] + init.hide[1][2] === 2) return false
			}
		} catch (e) {
			errorMessage('Could not validate Hide in Weather', e)
		}

		try {
			forecastVisibilityControl(init.weather.forecast || 'mornings')
			weatherCacheControl(init.weather)
		} catch (e) {
			errorMessage('Weather init did not work', e)
		}
	}
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

function imgBackground(val, loadTime, init) {
	let img = new Image()

	img.onload = () => {
		if (loadTime) {
			const animDuration = loadTime > 1000 ? 1400 : loadTime + 400
			const changeDuration = (time) => (domoverlay.style.transition = `transform .4s, opacity ${time}ms`)

			changeDuration(animDuration)
			setTimeout(() => changeDuration(BonjourrAnimTime), animDuration)
		}

		const applyBackground = () => {
			domoverlay.style.opacity = `1`
			id('background').style.backgroundImage = `url(${val})`
		}

		init ? applyBackground() : setTimeout(applyBackground, BonjourrAnimTime)
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
			const perfStart = performance.now()
			const cleanData = background.slice(background.indexOf(',') + 1, background.length)
			b64toBlobUrl(cleanData, (bloburl) => {
				imgBackground(bloburl, perfStart, !!init)
				changeImgIndex(index)
			})
		}
	}

	function isOnlineStorageAtCapacity(newFile) {
		//
		// Only applies to versions using localStorage: 5Mo limit
		if (isOnlineOrSafari) {
			const ls = localStorage.bonjourrBackgrounds

			// Takes dynamic cache + google font list
			const potentialFontList = JSON.parse(ls).googleFonts ? 0 : 7.6e5
			const lsSize = ls.length + potentialFontList + 10e4

			// Uploaded file in storage would exceed limit
			if (lsSize + newFile.length > 5e6) {
				alert(`Image size exceeds storage: ${parseInt(Math.abs(lsSize - 5e6) / 1000)}ko left`)
				domoverlay.style.opacity = '1'

				return true
			}
		}

		return false
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

			if (isOnlineStorageAtCapacity(result)) {
				// Exit with warning before saving image
				return console.warn('Uploaded image was not saved')
			}

			chrome.storage.local.get(['custom'], (data) => {
				const custom = data.custom ? data.custom : []
				const bumpedindex = custom.length

				compress(result)
				compress(result, 'thumbnail')
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
			clas(domcredit, false, 'shown')
			domoverlay.style.opacity = `0`
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

						unsplash(null, { removedCustom: true })
						clas(domcredit, true, 'shown')
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
		try {
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
		} catch (e) {
			errorMessage('Could not init local backgrounds', e)
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
		// Filtering

		let needsSpacer = false
		let artist = ''
		let photoLocation = ''
		let exifDescription = ''
		const referral = '?utm_source=Bonjourr&utm_medium=referral'
		const { city, country, name, username, link, exif } = image

		if (!city && !country) {
			photoLocation = tradThis('Photo by ')
		} else {
			if (city) photoLocation = city + ', '
			if (country) {
				photoLocation += country
				needsSpacer = true
			}
		}

		if (exif) {
			const orderedExifData = [
				{ key: 'model', format: `%val% - ` },
				{ key: 'aperture', format: `f/%val% ` },
				{ key: 'exposure_time', format: `%val%s ` },
				{ key: 'iso', format: `ISO %val% ` },
				{ key: 'focal_length', format: `%val%mm` },
			]

			orderedExifData.forEach(({ key, format }) => {
				if (exif[key]) {
					exifDescription += format.replace('%val%', exif[key])
				}
			})
		}

		// Force Capitalization
		artist = name
			.split(' ')
			.map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLocaleLowerCase())
			.join(' ')

		// DOM element

		const locationDOM = document.createElement('a')
		const spacerDOM = document.createElement('span')
		const artistDOM = document.createElement('a')
		const exifDOM = document.createElement('p')

		exifDOM.className = 'exif'
		exifDOM.textContent = exifDescription
		locationDOM.textContent = photoLocation
		artistDOM.textContent = artist
		spacerDOM.textContent = ` - `

		locationDOM.href = link + referral
		artistDOM.href = 'https://unsplash.com/@' + username + referral

		domcredit.textContent = ''

		domcredit.appendChild(exifDOM)
		domcredit.appendChild(locationDOM)
		if (needsSpacer) domcredit.appendChild(spacerDOM)
		domcredit.appendChild(artistDOM)

		clas(domcredit, true, 'shown')
	}

	function loadBackground(props, loadTime) {
		imgBackground(props.url, loadTime, !!init)
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
						exif: img.exif,
						desc: img.description,
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
					noDisplayImgLoad(newlist[0].url, () => {
						chrome.storage.local.set({ dynamicCache: caches })
						chrome.storage.local.remove('waitingForPreload')
					})
				})
			//
			// Or preload next
			else
				noDisplayImgLoad(list[1].url, () => {
					chrome.storage.sync.set({ dynamic: dynamic })
					chrome.storage.local.set({ dynamicCache: caches })
					chrome.storage.local.remove('waitingForPreload')
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
			chrome.storage.local.get(['dynamicCache', 'waitingForPreload'], function initDynamic(local) {
				try {
					const { current, next, every } = init.dynamic

					// <1.10.0: next is always old import
					// current to first background, default to 'day' collection
					if (next) {
						init.dynamic.lastCollec = 'day'

						delete init.dynamic.next
						delete init.dynamic.current
					}

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
				} catch (e) {
					errorMessage('Dynamic errored on init', e)
				}
			})
			break
		}

		case 'event': {
			chrome.storage.sync.get('dynamic', (data) => {
				chrome.storage.local.get(['dynamicCache', 'waitingForPreload'], (local) => {
					//

					switch (Object.keys(event)[0]) {
						case 'refresh': {
							const buttonSpan = Object.values(event)[0]
							const animationOptions = { duration: 600, easing: 'ease-out' }

							// Only refreshes background if preload is over
							// If not, animate button to show it is trying
							if (local.waitingForPreload === undefined) {
								id('background_overlay').style.opacity = 0
								data.dynamic.time = 0
								chrome.storage.sync.set({ dynamic: data.dynamic })
								chrome.storage.local.set({ waitingForPreload: true })

								buttonSpan.animate([{ transform: 'rotate(360deg)' }], animationOptions)

								setTimeout(
									() =>
										cacheControl(data.dynamic, local.dynamicCache, collectionControl(data.dynamic), false),
									BonjourrAnimTime
								)
							} else
								buttonSpan.animate(
									[
										{ transform: 'rotate(0deg)' },
										{ transform: 'rotate(90deg)' },
										{ transform: 'rotate(0deg)' },
									],
									animationOptions
								)

							break
						}

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
	else {
		try {
			apply(init.dark, init.weather)
		} catch (e) {
			errorMessage('Dark mode somehow messed up', e)
		}
	}
}

function searchbar(event, that, init) {
	const emptyButton = id('sb_empty')
	const display = (value) => id('sb_container').setAttribute('class', value ? 'shown' : 'hidden')
	const engine = (value) => domsearchbar.setAttribute('engine', value)
	const request = (value) => domsearchbar.setAttribute('request', stringMaxSize(value, 512))
	const setNewtab = (value) => domsearchbar.setAttribute('newtab', value)
	const opacity = (value) => {
		domsearchbar.setAttribute(
			'style',
			`background: rgba(255, 255, 255, ${value}); color: ${value > 0.4 ? '#222' : '#fff'}`
		)

		emptyButton.style.color = value > 0.4 ? '#222' : '#fff'
	}

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

				case 'opacity': {
					data.searchbar.opacity = parseFloat(that.value)
					opacity(parseFloat(that.value))
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

			if (event === 'opacity') slowRange({ searchbar: data.searchbar })
			else chrome.storage.sync.set({ searchbar: data.searchbar })
		})
	}

	function initSearchbar() {
		try {
			display(init.on)
			engine(init.engine)
			request(init.request)
			setNewtab(init.newtab)
			opacity(init.opacity)
		} catch (e) {
			errorMessage('Error in searchbar initialization', e)
		}
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

			searchURL = searchURL.replace('%s', encodeURIComponent(this.value))

			isNewtab ? window.open(searchURL, '_blank') : (window.location = searchURL)
		}
	}

	domsearchbar.oninput = function () {
		clas(emptyButton, this.value.length > 0, 'shown')
	}

	emptyButton.onclick = function () {
		domsearchbar.value = ''
		domsearchbar.focus()
		clas(this, false, 'shown')
	}

	event ? updateSearchbar() : initSearchbar()
}

async function quotes(event, that, init) {
	function display(value) {
		id('quotes_container').setAttribute('class', value ? 'shown' : 'hidden')
	}

	async function newQuote(lang, type) {
		async function handleJson(type, json) {
			switch (type) {
				case 'inspirobot': {
					// inspirobot response has three quotes
					// some are too long
					// some are pauses
					const filter = (quote) => quote.includes('[pause') || quote.length > 200

					let n = 1
					while (n <= 5 && filter(json.data[n].text)) {
						n = n + 2
					}

					// returns current quote if none is valid
					return n < 5 ? { author: 'Inspirobot', content: json.data[n].text } : await newQuote(lang, type)
				}

				case 'kaamelott': {
					return !filter(json.citation.citation)
						? { author: json.citation.infos.personnage, content: json.citation.citation }
						: await newQuote(lang, type)
				}

				case 'classic': {
					return json
				}
			}
		}

		const URLs = {
			classic: `https://i18n-quotes.herokuapp.com/${lang || 'en'}`,
			kaamelott: 'https://quotes-proxy.herokuapp.com/kaamelott',
			inspirobot: 'https://quotes-proxy.herokuapp.com/inspirobot',
		}

		try {
			// Fetch a random quote from the quotes API
			const response = await fetch(URLs[type || 'classic'])
			const json = await response.json()

			if (response.ok) return handleJson(type, json)
		} catch (error) {
			errorMessage('An error occured with the quotes API', error)
		}
	}

	function insertToDom(values) {
		id('quote').textContent = values.content
		id('author').textContent = values.author
	}

	function getFromStorage() {
		if (localStorage.nextQuote) {
			return JSON.parse(localStorage.nextQuote)
		}
		return null
	}

	function saveToStorage(elem) {
		localStorage.setItem('nextQuote', JSON.stringify(elem))
	}

	function updateSettings() {
		chrome.storage.sync.get(['lang', 'quotes'], async (data) => {
			const updated = { ...data.quotes }
			const { lang } = data

			switch (event) {
				case 'toggle': {
					display(that.checked)
					if (id('quote').textContent === '') {
						insertToDom(getFromStorage())
						saveToStorage(await newQuote(lang, data.quotes.type))
					}

					updated.on = that.checked
					break
				}

				case 'author': {
					id('author').classList.toggle('alwaysVisible')
					updated.author = that.checked
					break
				}

				case 'frequency': {
					updated.frequency = that.value
					if (that.value === 'tabs') saveToStorage(await newQuote(lang, data.quotes.type))
					break
				}

				case 'type': {
					updated.type = that.value
					const quote = await newQuote(lang, that.value)
					insertToDom(quote)
					saveToStorage(quote)
					break
				}

				case 'refresh': {
					updated.last = freqControl('set')
					const quote = await newQuote(lang, data.quotes.type)
					insertToDom(quote)
					saveToStorage(quote)

					break
				}
			}

			chrome.storage.sync.set({ quotes: updated })
		})
	}

	// update and quit
	if (event) {
		updateSettings()
		return
	}

	// quotes off, just quit
	if (init?.quotes?.on === false) {
		return
	}

	const { lang, quotes } = init
	let quote = getFromStorage()
	let needsNewQuote = freqControl('get', quotes.frequency, quotes.last)

	//
	// first startup:	fetch new, store & display
	// needsNewQuote:	fetch new, store & display
	// "tabs" freq: 	fetch new to store everytime, displays storage
	//

	if (quote === null || needsNewQuote) {
		quote = await newQuote(lang, quotes.type)
		saveToStorage(quote)
		quotes.last = freqControl('set') // updates last quotes timestamp
		chrome.storage.sync.set({ quotes })
	}

	// Displays
	if (quotes.author) id('author').classList.add('alwaysVisible')
	insertToDom(quote)
	display(true)

	// "tabs" control in last to prevent fetching from blocking display
	if (quotes.frequency === 'tabs') {
		saveToStorage(await newQuote(lang, quotes.type))
	}
}

function showPopup(data) {
	//
	function affiche() {
		const setReviewLink = () =>
			mobilecheck
				? 'https://github.com/victrme/Bonjourr/stargazers'
				: navigator.userAgent.includes('Chrome')
				? 'https://chrome.google.com/webstore/detail/bonjourr-%C2%B7-minimalist-lig/dlnejlppicbjfcfcedcflplfjajinajd/reviews'
				: 'https://addons.mozilla.org/en-US/firefox/addon/bonjourr-startpage/'

		const dom = {
			wrap: document.createElement('div'),
			btnwrap: document.createElement('div'),
			desc: document.createElement('p'),
			review: document.createElement('a'),
			donate: document.createElement('a'),
		}

		const closePopup = (fromText) => {
			if (fromText) {
				id('popup').classList.remove('shown')
				setTimeout(() => {
					id('popup').remove()
					setTimeout(() => (id('credit').style = ''), BonjourrAnimTime)
				}, 200)
			}
			chrome.storage.sync.set({ reviewPopup: 'removed' })
		}

		dom.wrap.id = 'popup'
		dom.desc.id = 'popup_text'
		dom.desc.textContent = tradThis(
			'Love using Bonjourr? Consider giving us a review or donating, that would help a lot! 😇'
		)

		dom.review.href = setReviewLink()
		dom.donate.href = 'https://ko-fi.com/bonjourr'

		dom.review.textContent = tradThis('Review')
		dom.donate.textContent = tradThis('Donate')

		dom.btnwrap.id = 'popup_buttons'
		dom.btnwrap.appendChild(dom.review)
		dom.btnwrap.appendChild(dom.donate)

		dom.wrap.appendChild(dom.desc)
		dom.wrap.appendChild(dom.btnwrap)

		document.body.appendChild(dom.wrap)

		domcredit.style.opacity = 0
		setTimeout(() => dom.wrap.classList.add('shown'), 200)

		dom.review.addEventListener('mousedown', () => closePopup(false))
		dom.donate.addEventListener('mousedown', () => closePopup(false))
		dom.desc.addEventListener('click', () => closePopup(true), { passive: true })
	}

	//s'affiche après 30 tabs
	if (data > 30) affiche()
	else if (typeof data === 'number') chrome.storage.sync.set({ reviewPopup: data + 1 })
	else if (data !== 'removed') chrome.storage.sync.set({ reviewPopup: 0 })
}

function customSize(init, event) {
	// Divided by 16 is === to body px size
	// so that users don't have their font size changed (on desktop at least)
	const apply = (size) => (dominterface.style.fontSize = size / 16 + 'em')

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
			const fetchGoogleFonts = () => {
				const a =
					'NjUsNzQsMTI0LDEwMCw4NywxMjYsNzEsMTA5LDk0LDg1LDk1LDg4LDEwMiw3OSw2NSw5OCwxMzYsNjksMTMxLDEzNiw5NSwxMDYsMTE3LDk2LDEyNSwxMjcsMTA0LDEzNCwxMTMsMTA0LDE0Myw3NiwxMzMsMTEwLDE1NSw4NSwxMzMsMTQyLDEwMw=='

				fetch(
					'https://www.googleapis.com/webfonts/v1/webfonts?sort=popularity&key=' +
						new TextDecoder().decode(
							new Uint8Array(
								atob(a)
									.split(',')
									.map((e, t) => e - t)
							)
						)
				)
					.then((response) => response.json())
					.then((json) => {
						// 1.11.1 => 1.11.2 firefox sql bug fix
						if (localStorage.googleFonts) localStorage.removeItem('googleFonts')

						if (json.error) console.log('Google Fonts messed up: ', json.error)
						else {
							chrome.storage.local.set({ googleFonts: json })
							callback(json)
						}
					})
			}

			chrome.storage.local.get('googleFonts', (local) => {
				if (local.googleFonts) {
					if (local.googleFonts.error) {
						chrome.storage.local.remove('googleFonts')
						console.log('Google Fonts messed up: ', local.googleFonts.error)
						return false
					} else {
						try {
							callback(JSON.parse(local.googleFonts))
						} catch (error) {
							fetchGoogleFonts()
						}
					}
				} else fetchGoogleFonts()
			})
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
		try {
			const { family, url, weight } = data
			if (family && url) apply(url, family, weight || '400')
			else if (weight) apply(null, null, weight)
		} catch (e) {
			errorMessage('Custom fonts failed to start', e)
		}
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
	const getEventListPosition = (that) => ({
		row: parseInt(that.getAttribute('he_row')),
		col: parseInt(that.getAttribute('he_col')),
	})

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

			if (isEverythingHidden(list, row_i)) toggleElement(parent, true)

			// Hide children
			row.forEach((child, child_i) => {
				const childid = IDsList[row_i][1][child_i]
				if (!!child) toggleElement(childid, true)
			})
		})
	}

	// startup initialization
	if (!that && !buttons && validateHideElem(init)) {
		try {
			initializeHiddenElements(init)
		} catch (e) {
			errorMessage('Hide failed on init', e)
		}
	}

	// Settings buttons initialization
	else if (buttons) {
		chrome.storage.sync.get('hide', (data) => {
			try {
				data.hide = validateHideElem(data.hide) ? data.hide : [[0, 0], [0, 0, 0], [0], [0]]
				buttons.forEach((button) => {
					const pos = getEventListPosition(button)
					if (data.hide[pos.row][pos.col] === 1) button.classList.toggle('clicked')
				})
			} catch (e) {
				errorMessage('Hide buttons failed', e)
			}
		})
	}

	// Event
	else {
		chrome.storage.sync.get(['weather', 'hide'], (data) => {
			data.hide = validateHideElem(data.hide) ? data.hide : [[0, 0], [0, 0, 0], [0], [0]]

			const pos = getEventListPosition(that)
			const state = that.classList.contains('clicked')
			const child = IDsList[pos.row][1][pos.col]
			const parent = IDsList[pos.row][0]

			// Update hidden list
			data.hide[pos.row][pos.col] = state ? 1 : 0
			chrome.storage.sync.set({ hide: data.hide })

			// Re-activates weather
			if (!state && pos.row === 1 && pos.col > 0) weather(null, null, data)

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

function onlineMobilePageUpdate() {
	chrome.storage.sync.get(['dynamic', 'waitingForPreload', 'weather', 'background_type', 'hide'], (data) => {
		const { dynamic, background_type } = data
		const dynamicNeedsImage = background_type === 'dynamic' && freqControl('get', dynamic.every, dynamic.time)

		if (dynamicNeedsImage) {
			domoverlay.style.opacity = 0
			unsplash(data, false)
		}

		clock(null, data)
		sunTime(data.weather)
		weather(null, null, data)
	})
}

function filterImports(data) {
	const filter = {
		lang: (lang) => (lang === undefined ? 'en' : lang),
		background_blur: (blur) => (typeof blur === 'string' ? parseFloat(blur) : blur),

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
			if (validateHideElem(hide)) {
				// Changes new hidden classes
				const weatherIndex = hide.indexOf('weather_desc')
				const widgetIndex = hide.indexOf('w_icon')

				if (weatherIndex >= 0) hide[weatherIndex] = 'description'
				if (widgetIndex >= 0) hide[widgetIndex] = 'widget'
			} else {
				hide = [[0, 0], [0, 0, 0], [0], [0]]
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
						temp: old.main.temp,
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
				if (weather.forecast === undefined) weather.forecast = 'auto'
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

		searchbar: (sb) => {
			let updatedSb = bonjourrDefaults('sync').searchbar

			if (typeof sb === 'boolean') {
				// Converts searchbar from <1.9.x bool to object
				updatedSb.on = sb
				updatedSb.newtab = data.searchbar_newtab || false
				updatedSb.engine = data.searchbar_engine ? data.searchbar_engine.replace('s_', '') : 'google'
			}

			// Add new searchbar settings >1.10.0
			if (updatedSb.opacity === undefined) updatedSb.opacity = 0.1
			if (updatedSb.request === undefined) updatedSb.request = ''

			return updatedSb
		},
	}

	function linksFilter(sync) {
		const aliasKeyList = Object.keys(sync).filter((key) => key.match('alias:'))

		sync.links?.forEach(({ title, url, icon }, i) => {
			const id = 'links' + randomString(6)
			const filteredIcon = icon.startsWith('alias:') ? sync[icon] : icon

			sync[id] = { _id: id, order: i, title, icon: filteredIcon, url }
		})

		aliasKeyList.forEach((key) => delete sync[key]) // removes <1.13.0 aliases
		delete sync.links // removes <1.13.0 links array

		return sync
	}

	let result = { ...data }

	delete result?.searchbar_engine
	delete result?.searchbar_newtab

	try {
		// Go through found categories in import data to filter them
		Object.entries(result).forEach(([key, val]) => (filter[key] ? (result[key] = filter[key](val)) : ''))
		result = linksFilter(result)
	} catch (e) {
		errorMessage('Messed up in filter imports', e)
	}

	return result
}

function startup(data) {
	canDisplayInterface(null, { font: data.font })
	traduction(null, data.lang)

	sunTime(data.weather)
	weather(null, null, data)

	customFont(data.font)
	customSize(data.font)

	favicon(data.favicon)
	clock(null, data)
	linksrow(data.linksrow)
	darkmode(null, data)
	searchbar(null, null, data.searchbar)
	quotes(null, null, data)
	showPopup(data.reviewPopup)

	customCss(data.css)
	hideElem(data.hide)
	initBackground(data)
	quickLinks(null, null, data)

	setTimeout(() => settingsInit(data), 200)
}

window.onload = function () {
	// On settings changes, update export code
	if (isExtension) chrome.storage.onChanged.addListener(() => importExport('exp'))
	else window.onstorage = () => importExport('exp')

	// For Mobile that caches pages for days
	if (mobilecheck) {
		document.addEventListener('visibilitychange', () => onlineMobilePageUpdate())
	}

	// Checks every 5 minutes if weather needs update
	setInterval(() => {
		navigator.onLine ? chrome.storage.sync.get(['weather', 'hide'], (data) => weather(null, null, data)) : ''
	}, 5 * 60 * 1000)

	// Only on Online / Safari
	if (['http', 'https', 'file:'].some((a) => window.location.protocol.includes(a))) {
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
	}

	try {
		chrome.storage.sync.get(null, (data) => {
			// First Startup, chrome.storage is null
			if (Object.keys(data).length === 0) {
				data = bonjourrDefaults('sync')
				chrome.storage.local.set(bonjourrDefaults('local'))
				chrome.storage.sync.set(isExtension ? data : { import: data })
			}

			// Version is different, can be new update or imports
			else if (!data.about || data.about.version !== BonjourrVersion) {
				data = filterImports(data)

				// Change version in here
				// Only after "different version" startup is triggered
				data.about = { browser: BonjourrBrowser, version: BonjourrVersion }

				chrome.storage.sync.clear()
				chrome.storage.sync.set(isExtension ? data : { import: data })
			}
			// console.log(data);
			startup(data)
		})
	} catch (e) {
		errorMessage('Could not load chrome storage on startup', e)
	}
}
