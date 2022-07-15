function traduction(settingsDom, lang = 'en') {
	if (lang === 'en') return

	document.documentElement.setAttribute('lang', lang)

	const trns = (settingsDom ? settingsDom : document).querySelectorAll('.trn')
	const changeText = (dom, str) => (dict[str] ? (dom.textContent = dict[str][lang]) : '')
	trns.forEach((trn) => changeText(trn, trn.textContent))
}

function favicon(init, event) {
	function createFavicon(emoji) {
		const svg = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="85">${emoji}</text></svg>`
		document.querySelector("link[rel~='icon']").href = emoji ? svg : `src/assets/${getFavicon()}`
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

function tabTitle(init, event) {
	const title = init ? init : event ? stringMaxSize(event.value, 80) : tradThis('New tab')

	if (event) slowRange({ tabtitle: title })
	document.title = title
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

				id('clock').textContent = `${h}:${m}${clock.seconds ? ':' + s : ''}`
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
			errorMessage('Clock or greetings failed at init', e)
		}
	}
}

function quickLinks(event, that, init) {
	const domlinkblocks = id('linkblocks')

	async function initblocks(links, linksrow) {
		//
		function createBlock(link) {
			let title = stringMaxSize(link.title, 64)
			let url = stringMaxSize(link.url, 512)

			//le DOM du block
			const img = document.createElement('img')
			const span = document.createElement('span')
			const atag = document.createElement('a')
			const li = document.createElement('li')

			img.alt = ''
			img.loading = 'lazy'
			img.setAttribute('draggable', 'false')

			atag.appendChild(img)
			atag.appendChild(span)
			atag.setAttribute('draggable', 'false')

			atag.href = url
			atag.setAttribute('rel', 'noreferrer noopener')

			li.id = link._id
			li.setAttribute('class', 'block')
			li.appendChild(atag)

			// this also adds "normal" title as usual
			textOnlyControl(li, title, domlinkblocks.className === 'text')

			return { icon: img, block: li }
		}

		function createRows(blocks, rowSize) {
			const rowsAmount = Math.ceil(blocks.length / rowSize)

			// append uls to linkblocks
			for (let row = 0; row < rowsAmount; row++) {
				const ul = document.createElement('ul')

				// append block lis to uls (rows)
				for (let col = 0; col < rowSize; col++) {
					const li = blocks[col + rowSize * row]?.block
					if (li) ul.appendChild(li)
				}

				domlinkblocks.appendChild(ul)
			}
		}

		async function fetchNewIcon(dom, url) {
			// Apply loading gif d'abord
			dom.src = 'src/assets/interface/loading.svg'

			const img = new Image()

			// DuckDuckGo favicon API is fallback
			let result = `https://icons.duckduckgo.com/ip3/${extractHostname(url)}.ico`
			const bonjourrAPI = await fetch(`https://favicon.bonjourr.fr/api/${extractHostname(url)}`)
			const apiText = await bonjourrAPI.text() // API return empty string if nothing found

			if (apiText.length > 0) {
				result = apiText
			}

			img.onload = () => (dom.src = result)
			img.src = result
			img.remove()

			return result
		}

		if (links.length > 0) {
			if (!init) {
				// remove old links blocks rows
				document.querySelectorAll('#linkblocks ul').forEach((ul) => ul.remove())
			}

			try {
				// Add blocks and events
				const blocklist = links.map((l) => createBlock(l))
				blocklist.forEach(({ block }) => addEvents(block))

				canDisplayInterface('links')
				linksDragging()

				createRows(blocklist, linksrow)

				// Load icons one by one
				links.map(async (link, index) => {
					const dom = blocklist[index].icon
					const needsToChange = ['api.faviconkit.com', 'loading.svg'].some((x) => link.icon.includes(x))

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

	function removeLinkSelection() {
		//enleve les selections d'edit
		domlinkblocks.querySelectorAll('img').forEach(function (e) {
			clas(e, false, 'selected')
		})
	}

	function addEvents(elem) {
		// Mouse clicks
		elem.oncontextmenu = function (e) {
			e.preventDefault()
			removeLinkSelection()
			displayEditWindow(this, { x: e.x, y: e.y })
		}

		elem.onkeyup = function (e) {
			if (e.key === 'e') {
				const { offsetLeft, offsetTop } = e.target
				displayEditWindow(this, { x: offsetLeft, y: offsetTop })
			}
		}

		// Mobile clicks
		if (mobilecheck())
			(function mobileTouches() {
				let touchStartTime = 0
				let touchTimeout = setTimeout(() => {}, 0)

				const startHandler = (e) => {
					touchStartTime = performance.now()
					touchTimeout = setTimeout(() => {
						const { clientX, clientY } = e.touches[0]
						displayEditWindow(elem, { x: clientX, y: clientY })
					}, 600)
				}

				const endHandler = (e) => {
					const pressTime = performance.now() - touchStartTime
					if (pressTime < 600) clearTimeout(touchTimeout)
				}

				elem.addEventListener('touchstart', startHandler, { passive: true })
				elem.addEventListener('touchend', endHandler, { passive: true })
			})()
	}

	function linksDragging() {
		let draggedDOM
		let draggedId = ''
		let switchedId = ''
		let coords = {}
		let startsDrag = false
		let [ox, oy] = [0, 0]
		let startMousePosition = { x: 0, y: 0 }

		const deplaceElem = (dom, x, y) => {
			id(dom).style.transform = `translateX(${x}px) translateY(${y}px)`
		}

		const initDrag = (e) => {
			const { x, y } = e

			// Initialise toute les coordonnees
			// Defini l'ID de l'element qui se deplace
			// Defini la position de la souris pour pouvoir offset le deplacement de l'elem

			startsDrag = true
			startMousePosition = { x, y }
			draggedId = e.composedPath().find((e) => e.className === 'block').id

			document.querySelectorAll('#linkblocks li').forEach((block) => {
				const { x, y, width, height } = block.getBoundingClientRect()

				coords[block.id] = {
					pos: { x, y },
					triggerbox: {
						// Creates a box with 10% padding used to trigger
						// the rearrange if mouse position is in-between these values
						x: [x + width * 0.1, x + width * 0.9],
						y: [y + height * 0.1, y + height * 0.9],
					},
				}
			})

			draggedDOM = id(draggedId)
			draggedDOM.style.zIndex = '4'
			draggedDOM.style.cursor = 'grabbing'
			draggedDOM.style.transition = 'none'
			draggedDOM.querySelector('a').href = '#' // to prevent clicking on link on mouse up
		}

		const applyDrag = (e) => {
			//
			// Element switcher
			//
			Object.entries(coords).forEach(([key, val]) => {
				if (
					// Mouse position is inside a block trigger box
					// And it is not the dragged block box
					// Nor the switched block (to trigger switch once)
					e.x > val.triggerbox.x[0] &&
					e.x < val.triggerbox.x[1] &&
					e.y > val.triggerbox.y[0] &&
					e.y < val.triggerbox.y[1] &&
					key !== switchedId
				) {
					//
					// Moves previous switched to its original position
					if (switchedId) {
						deplaceElem(switchedId, 0, 0)
					}

					switchedId = key
					let diffx = coords[draggedId].pos.x - coords[switchedId].pos.x
					let diffy = coords[draggedId].pos.y - coords[switchedId].pos.y

					deplaceElem(key, diffx, diffy)

					// console.clear()
					// console.log(switchedId)
					// console.log('Translate diff x: ', diffx)
					// console.log('Translate diff y: ', diffy)
				}
			})

			//
			// Move dragged element
			//
			ox = e.x - startMousePosition.x
			oy = e.y - startMousePosition.y

			// This as to stay at the end for some reason
			draggedDOM.style.transform = `translateX(${ox}px) translateY(${oy}px)`
		}

		const endDrag = () => {
			if (draggedId && startsDrag) {
				let diffx = coords[switchedId].pos.x - coords[draggedId].pos.x // opposite of applyDrag calc
				let diffy = coords[switchedId].pos.y - coords[draggedId].pos.y // idk why, but it works

				draggedDOM.setAttribute('style', `cursor: pointer; transform: translate(${diffx}px, ${diffy}px)`)

				startsDrag = false
				coords = {}

				setTimeout(() => {
					chrome.storage.sync.get(null, (data) => {
						//
						// Swaps order between elements in data storage
						let temp = data[switchedId].order
						data[switchedId].order = data[draggedId].order
						data[draggedId].order = temp

						slowRange({ ...data }) // saves

						document.querySelectorAll('#linkblocks ul').forEach((ul) => ul.remove()) // remove uls
						initblocks(bundleLinks(data), data.linksrow) // re-init blocks

						draggedId = '' // has to stay at the end of timeout for the order swap
						switchedId = '' // ditto
					})
				}, 200)
			}
		}

		domlinkblocks.onmousemove = function (e) {
			if (e.which !== 1) return // Do nothing if other or no buttons are pressed

			!startsDrag ? initDrag(e) : applyDrag(e)
		}

		domlinkblocks.onmouseup = endDrag
		domlinkblocks.onmouseout = endDrag
	}

	function editEvents() {
		function submitEvent() {
			return updatesEditedLink(id('editlink').getAttribute('data-linkid'))
		}

		function inputSubmitEvent(e) {
			if (e.code === 'Enter') {
				submitEvent()
				e.target.blur() // unfocus to signify change
			}
		}

		id('e_delete').onclick = function () {
			removeLinkSelection()
			removeblock(parseInt(id('editlink').getAttribute('index')))
			clas(id('editlink'), false, 'shown')
		}

		id('e_submit').onclick = function (e) {
			const noErrorOnEdit = submitEvent() // returns false if saved icon data too big
			if (noErrorOnEdit) {
				closeEditLink() // only auto close on apply changes button
				removeLinkSelection()
			}
		}

		id('e_title').addEventListener('keyup', inputSubmitEvent)
		id('e_url').addEventListener('keyup', inputSubmitEvent)
		id('e_iconurl').addEventListener('keyup', inputSubmitEvent)
	}

	function displayEditWindow(that, { x, y }) {
		//
		function positionsEditWindow() {
			const { innerHeight, innerWidth } = window // viewport size

			removeLinkSelection()

			if (x + 250 > innerWidth) x -= x + 250 - innerWidth // right overflow pushes to left
			if (y + 200 > innerHeight) y -= 200 // bottom overflow pushes above mouse

			// Moves edit link to mouse position
			document.querySelector('#editlink').style.transform = `translate(${x + 3}px, ${y + 3}px)`
		}

		const linkId = that.id
		const domicon = that.querySelector('img')
		const domedit = document.querySelector('#editlink')
		const opendedSettings = has(id('settings'), 'shown')

		chrome.storage.sync.get(linkId, (data) => {
			const { title, url, icon } = data[linkId]

			id('e_title').setAttribute('placeholder', tradThis('Title'))
			id('e_url').setAttribute('placeholder', tradThis('Link'))
			id('e_iconurl').setAttribute('placeholder', tradThis('Icon'))

			id('e_title').value = title
			id('e_url').value = url
			id('e_iconurl').value = icon

			positionsEditWindow()

			clas(domicon, true, 'selected')
			clas(domedit, true, 'shown')
			clas(domedit, opendedSettings, 'pushed')

			domedit.setAttribute('data-linkid', linkId)

			id('e_title').focus()
		})
	}

	function updatesEditedLink(linkId) {
		const e_title = id('e_title')
		const e_url = id('e_url')
		const e_iconurl = id('e_iconurl')

		if (e_iconurl.value.length === 7500) {
			e_iconurl.value = ''
			e_iconurl.setAttribute('placeholder', tradThis('Icon must be < 8kB'))

			return false
		}

		chrome.storage.sync.get(linkId, (data) => {
			const domlink = id(linkId)
			const domicon = domlink.querySelector('img')
			const domurl = domlink.querySelector('a')
			let link = data[linkId]

			link = {
				...link,
				title: stringMaxSize(e_title.value, 64),
				url: stringMaxSize(e_url.value, 512),
				icon: stringMaxSize(e_iconurl.value, 7500),
			}

			textOnlyControl(domlink, link.title, domlinkblocks.className === 'text')
			domurl.href = link.url
			domicon.src = link.icon

			// Updates
			chrome.storage.sync.set({ [linkId]: link })
		})

		return true
	}

	function removeblock(index) {
		chrome.storage.sync.get(null, (data) => {
			const links = bundleLinks(data)
			let link = links.filter((l) => l.order === index)[0]

			//enleve le html du block
			const blockParent = domlinkblocks.children[index]
			const height = blockParent.getBoundingClientRect().height

			blockParent.style.height = height + 'px'
			clas(blockParent, true, 'removed')

			setTimeout(function () {
				domlinkblocks.removeChild(blockParent)
				if (links.length === 0) domlinkblocks.style.visibility = 'hidden' //enleve linkblocks si il n'y a plus de links
			}, 600)

			links.forEach((l) => {
				l.order -= l.order > index ? 1 : 0 // Decrement order for elements above the one removed
				data[l._id] = l // updates link in storage
			})

			chrome.storage.sync.set(isExtension ? data : { import: data })
			chrome.storage.sync.remove(link._id)
		})
	}

	function linkSubmission(type, importList) {
		// importList here can also be button dom when type is "addlink"
		// This needs to be cleaned up later

		chrome.storage.sync.get(null, (data) => {
			const links = bundleLinks(data)
			let newLinksList = []

			const validator = (title, url, order) => {
				url = stringMaxSize(url, 512)
				const to = (scheme) => url.startsWith(scheme)
				const acceptableSchemes = to('http://') || to('https://') || to('localhost:')
				const unacceptable = to('about:') || to('chrome://')

				return {
					order: order,
					_id: 'links' + randomString(6),
					title: stringMaxSize(title, 64),
					icon: 'src/assets/interface/loading.svg',
					url: acceptableSchemes ? url : unacceptable ? false : 'https://' + url,
				}
			}

			// Default link submission
			if (type === 'addlink') {
				const title = id('i_title').value
				const url = id('i_url').value

				if (url.length < 3 || stillActive) return

				id('i_title').value = ''
				id('i_url').value = ''

				newLinksList.push(validator(title, url, links.length))
			}

			// When importing bookmarks
			if (type === 'import') {
				if (importList?.length === 0) return

				importList.forEach(({ title, url }, i) => {
					if (url) {
						newLinksList.push(validator(title, url, links.length + i))
					}
				})
			}

			// Saves to storage added links before icon fetch saves again
			newLinksList.forEach((newlink) => {
				chrome.storage.sync.set({ [newlink._id]: newlink })
			})

			// Add new link(s) to existing ones
			links.push(...newLinksList)

			// Displays and saves before fetching icon
			initblocks(links, data.linksrow)
			domlinkblocks.style.visibility = 'visible'
		})
	}

	function textOnlyControl(block, title, toText) {
		const span = block.querySelector('span')
		const a = block.querySelector('a')

		span.textContent = toText && title === '' ? extractDomain(a.href) : title
	}

	if (event) {
		const Add = event === 'addlink'
		const Import = event === 'import'
		const Toggle = event === 'toggle'
		const Newtab = event === 'linknewtab'
		const Style = event === 'linkstyle'
		const Row = event === 'linksrow'

		if (Add) {
			linkSubmission(event)
		}

		if (Import) {
			linkSubmission(event, that)
		}

		if (Toggle) {
			clas(id('linkblocks'), !that, 'hidden')
			interfaceWidgetToggle(null, 'links')
			chrome.storage.sync.set({ quicklinks: that })
		}

		if (Newtab) {
			chrome.storage.sync.set({ linknewtab: that })
			document.querySelectorAll('.block').forEach((block) => {
				block.setAttribute('target', '_blank')
			})
		}

		if (Style) {
			chrome.storage.sync.get(null, (data) => {
				const links = bundleLinks(data)
				const classes = ['large', 'medium', 'small', 'text']
				const blocks = document.querySelectorAll('#linkblocks .block')

				links.forEach(({ title }, i) => textOnlyControl(blocks[i], title, that === 'text'))

				classes.forEach((c) => domlinkblocks.classList.remove(c))
				domlinkblocks.classList.add(that)

				chrome.storage.sync.set({ linkstyle: that })
			})
		}

		if (Row) {
			chrome.storage.sync.get(null, (data) => {
				const links = bundleLinks(data)
				const row = parseInt(that)

				initblocks(links, row)
				slowRange({ linksrow: row })
			})
		}

		return
	}

	domlinkblocks.className = init.linkstyle // set class before appendBlock, cannot be moved
	clas(id('linkblocks'), !init.quicklinks, 'hidden')
	initblocks(bundleLinks(init), init.linksrow)

	setTimeout(() => editEvents(), 150) // No need to activate edit events asap
	window.addEventListener('resize', closeEditLink)
}

async function linksImport() {
	const closeBookmarks = (container) => {
		container.classList.add('hiding')
		setTimeout(() => container.setAttribute('class', ''), 400)
	}

	function main(links, bookmarks) {
		const listdom = document.createElement('ol')
		const allCategories = [...bookmarks[0].children]
		let counter = links.length || 0
		let bookmarksList = []
		let selectedList = []

		allCategories.forEach((cat) => bookmarksList.push(...cat.children))

		bookmarksList.forEach((mark, index) => {
			const elem = document.createElement('li')
			const titleWrap = document.createElement('p')
			const title = document.createElement('span')
			const favicon = document.createElement('img')
			const url = document.createElement('pre')

			favicon.src = 'https://icons.duckduckgo.com/ip3/' + extractHostname(mark.url) + '.ico'
			favicon.alt = ''

			title.textContent = mark.title
			url.textContent = mark.url

			titleWrap.appendChild(favicon)
			titleWrap.appendChild(title)

			elem.setAttribute('data-index', index)
			elem.setAttribute('tabindex', '0')
			elem.appendChild(titleWrap)
			elem.appendChild(url)

			function select() {
				const isSelected = elem.classList.toggle('selected')
				isSelected ? selectedList.push(elem.getAttribute('data-index')) : selectedList.pop()
				isSelected ? counter++ : (counter -= 1)

				// Change submit button text & class on selections
				const amountSelected = counter - links.length
				id('bmk_apply').textContent = tradThis(
					amountSelected === 0
						? 'Select bookmarks to import'
						: amountSelected === 1
						? 'Import this bookmark'
						: 'Import these bookmarks'
				)
				clas(id('bmk_apply'), amountSelected === 0, 'none')
			}

			elem.onclick = select
			elem.onkeydown = (e) => (e.code === 'Enter' ? select() : '')

			// only append links if url are not empty
			// (temp fix to prevent adding bookmarks folder title ?)
			if (typeof mark.url === 'string')
				if (links.filter((x) => x.url === stringMaxSize(mark.url, 512)).length === 0) listdom.appendChild(elem)
		})

		// Replace list to filter already added bookmarks
		const oldList = document.querySelector('#bookmarks ol')
		if (oldList) oldList.remove()
		id('bookmarks').prepend(listdom)

		// Just warning if no bookmarks were found
		if (bookmarksList.length === 0) {
			clas(id('bookmarks'), true, 'noneFound')
			return
		}

		// Submit event
		id('bmk_apply').onclick = function () {
			const bookmarkToApply = selectedList.map((i) => ({ title: bookmarksList[i].title, url: bookmarksList[i].url }))

			if (bookmarkToApply.length > 0) {
				closeBookmarks(id('bookmarks_container'))
				quickLinks('import', bookmarkToApply, null)
			}
		}

		document.querySelector('#bookmarks ol li').focus()
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
	document.querySelector('#bmk_close').onclick = () => closeBookmarks(id('bookmarks_container'))

	id('bookmarks_container').addEventListener('click', function (e) {
		if (e.target.id === 'bookmarks_container') closeBookmarks(this)
	})
}

function weather(event, that, init) {
	let weatherToSave = {}
	const date = new Date()
	const i_city = id('i_city')
	const i_ccode = id('i_ccode')
	const sett_city = id('sett_city')
	const current = id('current')
	const forecast = id('forecast')
	const tempContainer = id('tempContainer')

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

		if (!navigator.onLine) {
			return
		}

		const type = forecast ? 'forecast' : 'weather'
		const lang = document.documentElement.getAttribute('lang')
		const key = window.atob(WEATHER_API_KEY[forecast ? 0 : 1])

		const [lat, lon] = storage.location || [0, 0]
		const isGeol = storage.location.length === 2
		const geolStr = `&lat=${lat}&lon=${lon}`
		const cityStr = `&q=${encodeURI(storage.city)},${storage.ccode}`
		const location = isGeol ? geolStr : cityStr

		const url = `https://api.openweathermap.org/data/2.5/${type}?appid=${key}${location}&units=metric&lang=${lang}`

		// Inits global object
		if (Object.keys(weatherToSave).length === 0) {
			weatherToSave = storage
		}

		try {
			const weatherAPI = await fetch(url) // fetches, parses and apply callback

			if (weatherAPI.ok) {
				const json = await weatherAPI.json()
				forecast ? saveForecast(json) : saveCurrent(json)
			}

			return weatherAPI.ok
		} catch (error) {
			return
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
			tempContainer.querySelector('p').textContent = actual + '°'
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

			const widgetIcon = tempContainer.querySelector('img')
			const { now, rise, set } = sunTime()
			const timeOfDay = now < rise || now > set ? 'night' : 'day'
			const iconSrc = `src/assets/weather/${timeOfDay}/${filename}.png`

			if (widgetIcon) {
				widgetIcon.setAttribute('src', iconSrc)
				return
			}

			const icon = document.createElement('img')
			icon.src = iconSrc
			icon.setAttribute('alt', '')
			icon.setAttribute('draggable', 'false')
			tempContainer.prepend(icon)

			// from 1.2s request anim to .4s hide elem anim
			setTimeout(() => (tempContainer.style.transition = 'opacity 0.4s, max-height 0.4s, transform 0.4s'), 400)
		}

		handleWidget()
		handleDescription()

		clas(current, false, 'wait')
		clas(tempContainer, false, 'wait')
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
	const blur = data.background_blur !== undefined ? data.background_blur : 15
	const bright = data.background_bright !== undefined ? data.background_bright : 0.8

	filter('init', [parseFloat(blur), parseFloat(bright)])

	if (type === 'custom') {
		localBackgrounds({
			every: data.custom_every,
			time: data.custom_time,
		})
		return
	}

	unsplash(data)
}

function imgBackground(val, loadTime, init) {
	let img = new Image()

	img.onload = () => {
		if (loadTime) {
			const animDuration = loadTime > 1000 ? 1400 : loadTime + 400
			const changeDuration = (time) => (id('background_overlay').style.transition = `transform .4s, opacity ${time}ms`)

			changeDuration(animDuration)
			setTimeout(() => changeDuration(400), animDuration)
		}

		const applyBackground = () => {
			id('background_overlay').style.opacity = `1`
			id('background').style.backgroundImage = `url(${val})`
			localIsLoading = false
		}

		init ? applyBackground() : setTimeout(applyBackground, 400)
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

	if (state === 'set') {
		return nowDate.getTime()
	}

	const lastDate = new Date(last)
	const changed = {
		date: nowDate.getDate() !== lastDate.getDate(),
		hour: nowDate.getHours() !== lastDate.getHours(),
	}

	if (every === 'day') return changed.date
	if (every === 'hour') return changed.date || changed.hour
	if (every === 'tabs') return true
	if (every === 'pause') return last === 0
	if (every === 'period') return periodOfDay(sunTime()) !== periodOfDay(sunTime(), lastDate)
}

function localBackgrounds(init, event) {
	// Storage needs to be flat, as to only ask for needed background
	// SelectedId is self explanatory
	// CustomIds is list to get amount of backgrounds without accessing them
	// storage.local = {
	// 	  `full${_id}`: "/9j/4AAQSkZJRgAB...",
	// 	  `thumb${_id}`: "/9j/4AAQSkZJRgAB...",
	// 	  idsList: [ _id1, _id2, _id3 ],
	//    selectedId: _id3
	// }

	function isOnlineStorageAtCapacity(newFile) {
		//
		// Only applies to versions using localStorage: 5Mo limit
		if (detectPlatform() === 'online') {
			const ls = localStorage.bonjourrBackgrounds

			// Takes dynamic cache + google font list
			const potentialFontList = JSON.parse(ls).googleFonts ? 0 : 7.6e5
			const lsSize = ls.length + potentialFontList + 10e4

			// Uploaded file in storage would exceed limit
			if (lsSize + newFile.length > 5e6) {
				alert(`Image size exceeds storage: ${parseInt(Math.abs(lsSize - 5e6) / 1000)}ko left`)
				id('background_overlay').style.opacity = '1'

				return true
			}
		}

		return false
	}

	function b64toBlobUrl(b64Data, callback) {
		fetch(`data:image/jpeg;base64,${b64Data}`).then((res) => {
			res.blob().then((blob) => callback(URL.createObjectURL(blob)))
		})
	}

	function thumbnailSelection(id) {
		document.querySelectorAll('.thumbnail').forEach((thumb) => clas(thumb, false, 'selected'))
		clas(document.querySelector('.thumbnail#' + id), true, 'selected') // add selection style
	}

	function addNewImage(files) {
		files = [...files] // fileList to Array
		let filesIdsList = []
		let selected = ''

		files.forEach(() => {
			const _id = randomString(6)
			selected = _id
			filesIdsList.push(_id)
		})

		files.forEach((file, i) => {
			let reader = new FileReader()

			reader.onload = function (event) {
				const result = event.target.result

				if (isOnlineStorageAtCapacity(result)) {
					return console.warn('Uploaded image was not saved') // Exit with warning before saving image
				}

				compress(result, 'thumbnail', filesIdsList[i])
				compress(result)

				chrome.storage.local.set({ ['custom_' + filesIdsList[i]]: result })
			}

			localIsLoading = true
			id('background_overlay').style.opacity = '0'
			reader.readAsDataURL(file)
		})

		// Adds to list, becomes selected and save background
		chrome.storage.local.get(['idsList'], (local) => {
			let list = [...local.idsList]
			list.push(...filesIdsList)

			if (local.idsList.length === 0) {
				chrome.storage.sync.set({ background_type: 'custom' }) // change type si premier local
			}

			setTimeout(() => thumbnailSelection(selected), 400)

			chrome.storage.local.set({
				...local,
				idsList: list,
				selectedId: selected,
			})
		})
	}

	function compress(e, state, _id) {
		//
		// Hides previous bg and credits
		if (state !== 'thumbnail') {
			clas(id('credit'), false, 'shown')
			id('background_overlay').style.opacity = `0`
		}

		const compressStart = performance.now()
		const img = new Image()

		img.onload = () => {
			const elem = document.createElement('canvas')
			const ctx = elem.getContext('2d')

			// canvas proportionné à l'image
			// rétréci suivant le taux de compression
			// si thumbnail, toujours 140px
			const height = state === 'thumbnail' ? 140 * window.devicePixelRatio : img.height
			const scaleFactor = height / img.height
			elem.width = img.width * scaleFactor
			elem.height = height

			ctx.drawImage(img, 0, 0, img.width * scaleFactor, height) //dessine l'image proportionné

			const data = ctx.canvas.toDataURL(img) // renvoie le base64
			const cleanData = data.slice(data.indexOf(',') + 1, data.length) //used for blob

			if (state === 'thumbnail') {
				chrome.storage.local.set({ ['customThumb_' + _id]: cleanData })
				addThumbnails(cleanData, _id, null, true)

				return
			}

			b64toBlobUrl(cleanData, (bloburl) => {
				const compressTime = performance.now() - compressStart
				setTimeout(() => imgBackground(bloburl, compressTime), 400 - compressTime)
			})
		}

		img.src = e
	}

	function addThumbnails(data, _id, settingsDom, isSelected) {
		const settings = settingsDom ? settingsDom : id('settings')

		const div = document.createElement('div')
		const i = document.createElement('img')
		const rem = document.createElement('button')
		const wrap = settings.querySelector('#fileContainer')

		div.id = _id
		div.setAttribute('class', 'thumbnail' + (isSelected ? ' selected' : ''))
		if (!mobilecheck()) rem.setAttribute('class', 'hidden')

		let close = document.createElement('img')
		close.setAttribute('src', 'src/assets/interface/close.svg')
		rem.appendChild(close)

		b64toBlobUrl(data, (bloburl) => (i.src = bloburl))

		div.appendChild(i)
		div.appendChild(rem)
		wrap.prepend(div)

		i.onmouseup = (e) => {
			if (e.button !== 0 || localIsLoading) return

			const _id = e.target.parentElement.id
			const bgKey = 'custom_' + _id

			chrome.storage.local.get('selectedId', (local) => {
				// image selectionné est différente de celle affiché
				if (_id !== local.selectedId) {
					thumbnailSelection(_id)

					id('background_overlay').style.opacity = `0`
					localIsLoading = true
					chrome.storage.local.set({ selectedId: _id }) // Change bg selectionné
					chrome.storage.local.get([bgKey], (local) => compress(local[bgKey])) //affiche l'image voulue
				}
			})
		}

		rem.onmouseup = (e) => {
			const path = e.composedPath()

			if (e.button !== 0 || localIsLoading) {
				return
			}

			chrome.storage.local.get(['idsList', 'selectedId'], (local) => {
				const thumbnail = path.find((d) => d.className.includes('thumbnail'))
				const _id = thumbnail.id
				let { idsList, selectedId } = local
				let poppedList = idsList.filter((a) => !a.includes(_id))

				thumbnail.remove()

				chrome.storage.local.remove('custom_' + _id)
				chrome.storage.local.remove(['customThumb_' + _id])
				chrome.storage.local.set({ idsList: poppedList })

				// Draw new image if displayed is removed
				if (_id === selectedId) {
					// To another custom
					if (poppedList.length > 0) {
						selectedId = poppedList[0]
						thumbnailSelection(selectedId)

						const toShowId = 'custom_' + poppedList[0]
						chrome.storage.local.get([toShowId], (local) => compress(local[toShowId]))
					}

					// back to unsplash
					else {
						id('background_overlay').style.opacity = 0
						chrome.storage.sync.set({ background_type: 'dynamic' })
						setTimeout(() => chrome.storage.sync.get('dynamic', (data) => unsplash(data)), 400)
						selectedId = ''
					}

					chrome.storage.local.set({ selectedId }) // selected is new chosen background
				}
			})
		}
	}

	function displayCustomThumbnails(settingsDom) {
		const thumbnails = settingsDom.querySelectorAll('#bg_tn_wrap .thumbnail')

		chrome.storage.local.get(['idsList', 'selectedId'], (local) => {
			const { idsList, selectedId } = local

			if (idsList.length > 0 && thumbnails.length < idsList.length) {
				const thumbsKeys = idsList.map((a) => 'customThumb_' + a) // To get keys for storage

				// Parse through thumbnails to display them
				chrome.storage.local.get(thumbsKeys, (local) => {
					Object.entries(local).forEach(([key, val]) => {
						if (!key.startsWith('customThumb_')) return // online only, can be removed after lsOnlineStorage rework

						const _id = key.replace('customThumb_', '')
						const blob = val.replace('data:image/jpeg;base64,', '')
						const isSelected = _id === selectedId

						addThumbnails(blob, _id, settingsDom, isSelected)
					})
				})
			}
		})
	}

	function refreshCustom(button) {
		chrome.storage.sync.get('custom_every', (sync) => {
			id('background_overlay').style.opacity = 0
			turnRefreshButton(button, true)
			localIsLoading = true

			setTimeout(
				() =>
					localBackgrounds({
						every: sync.custom_every,
						time: 0,
					}),
				400
			)
		})
	}

	if (event) {
		if (event.is === 'thumbnail') displayCustomThumbnails(event.settings)
		if (event.is === 'newfile') addNewImage(event.file)
		if (event.is === 'refresh') refreshCustom(event.button)
		return
	}

	function applyCustomBackground(id) {
		chrome.storage.local.get(['custom_' + id], (local) => {
			const perfStart = performance.now()
			const background = local['custom_' + id]

			const cleanData = background.slice(background.indexOf(',') + 1, background.length)
			b64toBlobUrl(cleanData, (bloburl) => {
				imgBackground(bloburl, perfStart, !!init)
			})
		})
	}

	chrome.storage.local.get(['selectedId', 'idsList'], (local) => {
		try {
			// need all of saved stuff
			let { selectedId, idsList } = local
			const { every, time } = init
			const needNewImage = freqControl('get', every, time || 0)

			// 1.14.0 (firefox?) background recovery fix
			if (!idsList) {
				idsList = []
				selectedId = ''

				chrome.storage.local.get(null, (local) => {
					const ids = Object.keys(local)
						.filter((k) => k.startsWith('custom_'))
						.map((k) => k.replace('custom_', ''))

					chrome.storage.local.set({ idsList: ids, selectedId: ids[0] || '' })
					chrome.storage.sync.get(null, (data) => initBackground(data))
				})
			}

			if (idsList.length === 0) {
				chrome.storage.sync.get('dynamic', (data) => unsplash(data)) // no bg, back to unsplash
				return
			}

			if (every && needNewImage) {
				if (idsList.length > 1) {
					idsList = idsList.filter((l) => !l.includes(selectedId)) // removes current from list
					selectedId = idsList[Math.floor(Math.random() * idsList.length)] // randomize from list
				}

				applyCustomBackground(selectedId)

				chrome.storage.sync.set({ custom_time: freqControl('set') })
				chrome.storage.local.set({ selectedId })

				if (id('settings')) thumbnailSelection(selectedId) // change selection if coming from refresh

				return
			}

			applyCustomBackground(selectedId)
		} catch (e) {
			errorMessage('Could not init local backgrounds', e)
		}
	})
}

async function unsplash(init, event) {
	async function preloadImage(src) {
		const img = new Image()

		img.src = src
		await img.decode()
		img.remove()

		return
	}

	function imgCredits(image) {
		//
		// Filtering
		const domcredit = id('credit')
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

	async function requestNewList(collection) {
		const header = new Headers()
		const collecId = allCollectionIds[collection] || allCollectionIds.day
		const url = `https://api.unsplash.com/photos/random?collections=${collecId}&count=8`
		header.append('Authorization', `Client-ID 3686c12221d29ca8f7947c94542025d760a8e0d49007ec70fa2c4b9f9d377b1d`)
		header.append('Accept-Version', 'v1')

		const resp = await fetch(url, { headers: header })
		const json = await resp.json()

		if (resp.status === 404 || json.length === 1) {
			console.log(json?.errors)
			return false
		}

		const filteredList = []
		const { width, height } = screen
		const imgSize = width > height ? width : height // higher res on mobile

		json.forEach((img) => {
			filteredList.push({
				url: img.urls.raw + '&w=' + imgSize + '&dpr=' + window.devicePixelRatio,
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

		return filteredList
	}

	function chooseCollection(eventCollection) {
		if (eventCollection) {
			eventCollection = eventCollection.replaceAll(` `, '')
			allCollectionIds.user = eventCollection
			return 'user'
		}

		return periodOfDay(sunTime())
	}

	function collectionControl(dynamic) {
		const { every, lastCollec, collection } = dynamic
		const Pause = every === 'pause'
		const Day = every === 'day'

		if ((Pause || Day) && lastCollec) {
			return lastCollec // Keeps same collection on >day so that user gets same type of backgrounds
		}

		const collec = chooseCollection(collection) // Or updates collection with sunTime or user collec
		dynamic.lastCollec = collec
		chrome.storage.sync.set({ dynamic: dynamic })

		return collec
	}

	async function cacheControl(dynamic, caches, collection, preloading) {
		//
		const needNewImage = freqControl('get', dynamic.every, dynamic.time)
		let list = caches[collection]

		if (preloading) {
			loadBackground(list[0])
			await preloadImage(list[1].url) // Is trying to preload next
			chrome.storage.local.remove('waitingForPreload')
			return
		}

		if (!needNewImage) {
			loadBackground(list[0]) // No need for new, load the same image
			return
		}

		// Needs new image, Update time
		dynamic.lastCollec = collection
		dynamic.time = freqControl('set')

		// Removes previous image from list
		if (list.length > 1) list.shift()

		// Load new image
		loadBackground(list[0])

		// If end of cache, get & save new list
		if (list.length === 1 && navigator.onLine) {
			const newList = await requestNewList(collection)

			if (newList) {
				caches[collection] = list.concat(newList)
				await preloadImage(newList[0].url)
				chrome.storage.local.set({ dynamicCache: caches })
				chrome.storage.local.remove('waitingForPreload')
			}

			return
		}

		if (list.length > 1) await preloadImage(list[1].url) // Or preload next

		chrome.storage.sync.set({ dynamic: dynamic })
		chrome.storage.local.set({ dynamicCache: caches })
		chrome.storage.local.remove('waitingForPreload')
	}

	async function populateEmptyList(collection, local, dynamic, isEvent) {
		if (isEvent) {
			collection = chooseCollection(collection) // if it comes from collection change
		}

		const newList = await requestNewList(collection)
		const changeStart = performance.now()

		if (!newList) {
			return // Don't save dynamicCache if request failed, also don't preload nothing
		}

		await preloadImage(newList[0].url)
		loadBackground(newList[0], performance.now() - changeStart)

		local.dynamicCache[collection] = newList
		chrome.storage.local.set({ dynamicCache: local.dynamicCache })
		chrome.storage.local.set({ waitingForPreload: true })

		//preload
		await preloadImage(newList[1].url)
		chrome.storage.local.remove('waitingForPreload')
	}

	function updateDynamic(event, sync, local) {
		switch (Object.keys(event)[0]) {
			case 'refresh': {
				// Only refreshes background if preload is over
				// If not, animate button to show it is trying
				if (local.waitingForPreload === undefined) {
					turnRefreshButton(Object.values(event)[0], true)
					id('background_overlay').style.opacity = 0

					const newDynamic = { ...sync.dynamic, time: 0 }
					chrome.storage.sync.set({ dynamic: newDynamic })
					chrome.storage.local.set({ waitingForPreload: true })

					setTimeout(() => cacheControl(newDynamic, local.dynamicCache, collectionControl(newDynamic), false), 400)

					return
				}

				turnRefreshButton(Object.values(event)[0], false)
				break
			}

			case 'every': {
				sync.dynamic.every = event.every
				sync.dynamic.time = freqControl('set')
				chrome.storage.sync.set({ dynamic: sync.dynamic })
				break
			}

			// Back to dynamic and load first from chosen collection
			case 'removedCustom': {
				chrome.storage.sync.set({ background_type: 'dynamic' })
				loadBackground(local.dynamicCache[collectionControl(sync.dynamic)][0])
				break
			}

			// Always request another set, update last time image change and load background
			case 'collection': {
				if (!navigator.onLine) return

				id('background_overlay').style.opacity = '0'

				// remove user collec
				if (event.collection === '') {
					const defaultColl = chooseCollection()
					local.dynamicCache.user = []
					sync.dynamic.collection = ''
					sync.dynamic.lastCollec = defaultColl

					chrome.storage.sync.set({ dynamic: sync.dynamic })
					chrome.storage.local.set({ dynamicCache: local.dynamicCache })

					unsplash(sync)
					return
				}

				// add new collec
				sync.dynamic.collection = event.collection
				sync.dynamic.lastCollec = 'user'
				sync.dynamic.time = freqControl('set')
				chrome.storage.sync.set({ dynamic: sync.dynamic })

				populateEmptyList(event.collection, local, sync.dynamic, true)
				break
			}
		}
	}

	// collections source: https://unsplash.com/@bonjourr/collections
	const allCollectionIds = {
		noon: 'GD4aOSg4yQE',
		day: 'o8uX55RbBPs',
		evening: '3M2rKTckZaQ',
		night: 'bHDh4Ae7O8o',
		user: '',
	}

	if (event) {
		// No init, Event
		chrome.storage.sync.get('dynamic', (sync) =>
			chrome.storage.local.get(['dynamicCache', 'waitingForPreload'], (local) => {
				updateDynamic(event, sync, local)
			})
		)

		return
	}

	chrome.storage.local.get(['dynamicCache', 'waitingForPreload'], (local) => {
		try {
			// Real init start
			const collecId = collectionControl(init.dynamic)
			const cache = local.dynamicCache || localDefaults.dynamicCache

			if (cache[collecId].length === 0) {
				populateEmptyList(collecId, local, init.dynamic, false) // If list empty: request new, save sync & local
				return
			}

			cacheControl(init.dynamic, cache, collecId, local.waitingForPreload) // Not empty: normal cacheControl
		} catch (e) {
			errorMessage('Dynamic errored on init', e)
		}
	})

	return
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

function darkmode(init, event) {
	function apply(option) {
		const time = sunTime()
		const cases = {
			auto: time.now <= time.rise || time.now > time.set ? 'dark' : '',
			system: 'autodark',
			enable: 'dark',
			disable: '',
		}

		document.body.setAttribute('class', cases[option])
	}

	if (event) {
		apply(event)
		chrome.storage.sync.set({ dark: event })
		return
	}

	try {
		apply(init)
	} catch (e) {
		errorMessage('Dark mode somehow messed up', e)
	}
}

function searchbar(event, that, init) {
	const domsearchbar = id('searchbar')
	const emptyButton = id('sb_empty')
	const submitButton = id('sb_submit')

	const display = (value) => id('sb_container').setAttribute('class', value ? 'shown' : 'hidden')
	const setEngine = (value) => domsearchbar.setAttribute('engine', value)
	const setRequest = (value) => domsearchbar.setAttribute('request', stringMaxSize(value, 512))
	const setNewtab = (value) => domsearchbar.setAttribute('newtab', value)
	const setOpacity = (value) => {
		domsearchbar.setAttribute('style', `background: rgba(255, 255, 255, ${value}); color: ${value > 0.4 ? '#222' : '#fff'}`)

		if (value > 0.4) id('sb_container').classList.add('opaque')
		else id('sb_container').classList.remove('opaque')
	}

	function updateSearchbar() {
		chrome.storage.sync.get('searchbar', (data) => {
			switch (event) {
				case 'searchbar': {
					data.searchbar.on = that.checked
					display(that.checked)
					interfaceWidgetToggle(null, 'searchbar')
					break
				}

				case 'engine': {
					data.searchbar.engine = that.value
					clas(id('searchbar_request'), that.value === 'custom', 'shown')
					setEngine(that.value)
					break
				}

				case 'opacity': {
					data.searchbar.opacity = parseFloat(that.value)
					setOpacity(parseFloat(that.value))
					break
				}

				case 'request': {
					let val = that.value

					if (val.indexOf('%s') !== -1) {
						data.searchbar.request = stringMaxSize(val, 512)
						that.blur()
					} else if (val.length > 0) {
						val = ''
						that.setAttribute('placeholder', tradThis('%s Not found'))
						setTimeout(() => that.setAttribute('placeholder', tradThis('Search query: %s')), 2000)
					}

					setRequest(val)
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
		const { on, engine, request, newtab, opacity } = init || syncDefaults.searchbar
		try {
			display(on)
			setEngine(engine)
			setRequest(request)
			setNewtab(newtab)
			setOpacity(opacity)

			if (on) domsearchbar.focus()
		} catch (e) {
			errorMessage('Error in searchbar initialization', e)
		}
	}

	function submitSearch() {
		let searchURL = ''
		const isNewtab = domsearchbar.getAttribute('newtab') === 'true'
		const engine = domsearchbar.getAttribute('engine')
		const request = domsearchbar.getAttribute('request')
		const lang = document.documentElement.getAttribute('lang')

		// engineLocales est dans lang.js
		if (engine === 'custom') searchURL = request
		else searchURL = engineLocales[engine].base.replace('%l', engineLocales[engine][lang])

		searchURL = searchURL.replace('%s', encodeURIComponent(domsearchbar.value))

		isNewtab ? window.open(searchURL, '_blank') : (window.location = searchURL)
	}

	function toggleInputButton(toggle) {
		if (toggle) {
			emptyButton.removeAttribute('disabled')
			submitButton.removeAttribute('disabled')
		} else {
			emptyButton.setAttribute('disabled', '')
			submitButton.setAttribute('disabled', '')
		}
	}

	domsearchbar.onkeyup = function (e) {
		if (e.key === 'Enter' && this.value.length > 0) {
			submitSearch()
		}
	}

	domsearchbar.oninput = function () {
		const hasText = this.value.length > 0

		clas(emptyButton, hasText, 'shown')
		clas(submitButton, hasText, 'shown')
		toggleInputButton(hasText)
	}

	emptyButton.onclick = function () {
		domsearchbar.value = ''
		domsearchbar.focus()
		clas(this, false, 'shown')
		clas(submitButton, false, 'shown')
		toggleInputButton(false)
	}

	submitButton.onclick = function () {
		submitSearch()
	}

	event ? updateSearchbar() : initSearchbar()
}

async function quotes(event, that, init) {
	function display(value) {
		clas(id('linkblocks'), value, 'withQuotes')
		id('quotes_container').setAttribute('class', value ? 'shown' : 'hidden')
	}

	async function newQuote(lang, type) {
		try {
			if (!navigator.onLine) {
				return []
			}

			// Fetch a random quote from the quotes API
			const query = (type += type === 'classic' ? `/${lang}` : '')
			const response = await fetch('https://quotes.bonjourr.fr/' + query)
			const json = await response.json()

			if (response.ok) {
				return json
			}
		} catch (error) {
			console.warn(error)
			return []
		}
	}

	function insertToDom(values) {
		if (!values) return
		id('quote').textContent = values.content
		id('author').textContent = values.author
	}

	function controlCacheList(list, lang, type) {
		list.shift() // removes used quote
		chrome.storage.local.set({ quotesCache: list })

		if (list.length < 2) {
			newQuote(lang, type).then((list) => {
				chrome.storage.local.set({ quotesCache: list })
			})
		}

		return list
	}

	function updateSettings() {
		chrome.storage.sync.get(['lang', 'quotes'], async (data) => {
			const updated = { ...data.quotes }
			const { lang, quotes } = data

			switch (event) {
				case 'toggle': {
					const on = that.checked // to use inside storage callback
					updated.on = on

					chrome.storage.local.get('quotesCache', (local) => {
						insertToDom(local.quotesCache[0])
						display(on)
					})

					interfaceWidgetToggle(null, 'quotes')
					break
				}

				case 'author': {
					id('author').classList.toggle('alwaysVisible')
					updated.author = that.checked
					break
				}

				case 'frequency': {
					updated.frequency = that.value
					break
				}

				case 'type': {
					updated.type = that.value

					const list = await newQuote(lang, that.value)
					chrome.storage.local.set({ quotesCache: list })

					insertToDom(list[0])
					break
				}

				case 'refresh': {
					updated.last = freqControl('set')

					chrome.storage.local.get('quotesCache', async (local) => {
						const quote = controlCacheList(local.quotesCache, lang, quotes.type)[0]
						insertToDom(quote)
					})

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

	// Cache:
	// storage.local = { quotesCache: Array(20) }
	// NeedsNewQuote: Removes first element of the list
	// if list is too small, fetches new batch of quotes
	// All quotes type share the same cache
	// changing quotes type fetches new batch

	// Init
	chrome.storage.local.get('quotesCache', async (local) => {
		canDisplayInterface('quotes')

		const { lang, quotes } = init
		let needsNewQuote = freqControl('get', quotes.frequency, quotes.last)
		let cache = local.quotesCache
		let quote = {}

		if (!cache || cache?.length === 0) {
			cache = await newQuote(lang, quotes.type) // gets list
			chrome.storage.local.set({ quotesCache: cache }) // saves list

			quote = cache[0]
		}

		if (needsNewQuote) {
			quotes.last = freqControl('set') // updates last quotes timestamp
			chrome.storage.sync.set({ quotes })

			quote = controlCacheList(cache, lang, quotes.type)[0] // has removed last quote from cache
		}

		// quotes off, just quit
		if (init?.quotes?.on === false) {
			return
		}

		quote = cache[0] // all conditions passed, cache is safe to use

		// Displays
		if (quotes.author) id('author').classList.add('alwaysVisible')
		insertToDom(quote)
		display(true)
	})
}

function showPopup(data) {
	//
	function affiche() {
		const setReviewLink = () =>
			getBrowser() === 'chrome'
				? 'https://chrome.google.com/webstore/detail/bonjourr-%C2%B7-minimalist-lig/dlnejlppicbjfcfcedcflplfjajinajd/reviews'
				: getBrowser() === 'firefox'
				? 'https://addons.mozilla.org/en-US/firefox/addon/bonjourr-startpage/'
				: getBrowser() === 'safari'
				? 'https://apps.apple.com/fr/app/bonjourr-startpage/id1615431236'
				: getBrowser() === 'edge'
				? 'https://microsoftedge.microsoft.com/addons/detail/bonjourr/dehmmlejmefjphdeoagelkpaoolicmid'
				: 'https://bonjourr.fr/help#%EF%B8%8F-reviews'

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
					setTimeout(() => (id('credit').style = ''), 400)
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

		id('credit').style.opacity = 0
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
	const notAppleOrWindows = !testOS.mac && !testOS.windows && !testOS.ios

	if (testOS.windows) toUse = is.windows
	else if (testOS.android) toUse = is.android
	else if (testOS.mac || testOS.ios) toUse = is.apple
	else if (notAppleOrWindows && hasUbuntu) toUse = is.linux

	if (settingsDom) {
		settingsDom.querySelector('#i_customfont').setAttribute('placeholder', toUse.placeholder)
		modifyWeightOptions(toUse.weights, settingsDom)
	}

	return toUse
}

function customFont(init, event) {
	function setSize(val) {
		dominterface.style.fontSize = val / 16 + 'em' // 16 is body px size
	}

	function setFamily(family, fontface) {
		id('fontstyle').textContent = fontface
		id('clock').style.fontFamily = '"' + family + '"'
		id('credit').style.fontFamily = '"' + family + '"'
		dominterface.style.fontFamily = '"' + family + '"'
		canDisplayInterface('fonts')
	}

	function setWeight(family, weight) {
		weight = parseInt(weight)

		if (weight) {
			const list = safeFont().weights
			dominterface.style.fontWeight = weight
			id('searchbar').style.fontWeight = weight

			// Default bonjourr lowers font weight on clock (because we like it)
			const loweredWeight = weight > 100 ? list[list.indexOf(weight) - 1] : weight
			id('clock').style.fontWeight = family ? weight : loweredWeight
		}
	}

	async function setFontface(url) {
		const resp = await fetch(url)
		const text = await resp.text()
		const fontface = text.replace(/(\r\n|\n|\r|  )/gm, '')
		chrome.storage.local.set({ fontface })

		return fontface
	}

	function updateFont(event) {
		function fetchFontList(callback) {
			chrome.storage.local.get('googleFonts', async (local) => {
				//
				// Get list from storage
				if (local.googleFonts && !local.googleFonts?.error) {
					callback(local.googleFonts)
					return
				}

				// Get list from API if browser is online
				if (navigator.onLine) {
					const a = 'QUl6YVN5QWt5M0pZYzJyQ09MMWpJc3NHQmdMcjFQVDR5VzE1ak9r'
					const url = 'https://www.googleapis.com/webfonts/v1/webfonts?sort=popularity&key=' + window.atob(a)
					const resp = await fetch(url)

					if (!resp.ok) return // return nothing if smth wrong, will try to fetch next time

					const json = await resp.json()
					chrome.storage.local.set({ googleFonts: json })

					callback(json)
				}
			})
		}

		function removeFont() {
			id('fontstyle').textContent = ''
			id('clock').style.fontFamily = ''
			id('credit').style.fontFamily = ''
			dominterface.style.fontFamily = ''

			// weights
			const baseWeight = testOS.windows ? '400' : '300'
			dominterface.style.fontWeight = baseWeight
			id('searchbar').style.fontWeight = baseWeight
			id('clock').style.fontWeight = ''

			id('i_weight').value = baseWeight

			return { url: '', family: '', availWeights: [], weight: baseWeight }
		}

		async function changeFamily(json, family) {
			//
			// Cherche correspondante
			const dom = id('i_customfont')
			const font = json.items.filter((font) => font.family.toUpperCase() === family.toUpperCase())

			// One font has been found
			if (font.length > 0) {
				const availWeights = font[0].variants.filter((variant) => !variant.includes('italic'))
				const defaultWeight = availWeights.includes('regular') ? 400 : availWeights[0]
				const url = encodeURI(`https://fonts.googleapis.com/css?family=${font[0].family}:${defaultWeight}`)
				const fontface = await setFontface(url)

				setFamily(font[0].family, fontface)
				setWeight(font[0].family, 400)
				modifyWeightOptions(availWeights, null, true)
				id('i_weight').value = '400'

				if (dom) dom.blur()
				return { url, family: font[0].family, availWeights, weight: 400 }
			}

			// No fonts found
			else {
				dom.value = ''
				safeFont(id('settings'))
				return { url: '', family: '', availWeights: [], weight: testOS.windows ? '400' : '300' }
			}
		}

		if (event.autocomplete) {
			fetchFontList(function fillFamilyInput(json) {
				if (!json) return

				const fragment = new DocumentFragment()

				json.items.forEach(function addOptions(item) {
					const option = document.createElement('option')

					option.textContent = item.family
					option.setAttribute('value', item.family)
					fragment.appendChild(option)
				})

				event.settingsDom.querySelector('#dl_fontfamily').appendChild(fragment)
			})

			return
		}

		chrome.storage.sync.get('font', async (data) => {
			let font = data.font

			if (event.size) {
				font.size = event.size
				setSize(event.size)
				slowRange({ font: font }, 200)
				return
			}

			if (event.weight) {
				if (font.url) {
					font.url = font.url.slice(0, font.url.lastIndexOf(':') + 1)
					font.url += event.weight
					setFamily(font.family, await setFontface(font.url))
				}

				// If nothing, removes custom font
				else font.weight = event.weight

				setWeight(font.family, event.weight)
				slowRange({ font: font }, 200)
				return
			}

			if (event.family === '') {
				safeFont(id('settings'))
				slowRange({ font: { size: font.size, ...removeFont() } }, 200)
				chrome.storage.local.remove('fontface')
				return
			}

			if (event.family) {
				fetchFontList(async (json) => {
					slowRange({ font: { size: font.size, ...(await changeFamily(json, event.family)) } }, 200)
				})
			}
		})
	}

	if (event) {
		updateFont(event)
		return
	}

	// init
	try {
		setSize(init.size)
		setWeight(init.family, init.weight)

		// Sets family
		if (init.family === '') return

		chrome.storage.local.get('fontface', async ({ fontface }) => {
			setFamily(init.family, fontface || (await setFontface(init.url))) // fetch font-face data if none in storage
		})
	} catch (e) {
		errorMessage('Custom fonts failed to start', e)
	}
}

function textShadow(init, event) {
	const potency = init ? init : event
	id('interface').style.textShadow = `1px 2px 6px rgba(0, 0, 0, ${potency})`

	if (event) slowRange({ textShadow: potency })
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
		['main', ['greetings', 'description', 'tempContainer']],
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
		const domshowsettings = id('showSettings')
		let loadtime = performance.now() - loadtimeStart

		if (loadtime > 400) loadtime = 400
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
		if (init.font?.family && init.font?.url) funcsOk.fonts = false
		if (init.quotes?.on) funcsOk.quotes = false
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
			id('background_overlay').style.opacity = 0
			unsplash(data, false)
		}

		clock(null, data)
		sunTime(data.weather)
		weather(null, null, data)
	})
}

function filterImports(data) {
	let result = { ...syncDefaults, ...data }

	// Hide elem classes changed at some point
	if (validateHideElem(data.hide)) {
		const weatherIndex = data.hide.indexOf('weather_desc')
		const widgetIndex = data.hide.indexOf('w_icon')

		if (weatherIndex >= 0) data.hide[weatherIndex] = 'description'
		if (widgetIndex >= 0) data.hide[widgetIndex] = 'widget'
	} else {
		hide = [[0, 0], [0, 0, 0], [0], [0]]
	}

	// <1.9.0 searchbar options was boolean
	if (typeof data.searchbar === 'boolean') {
		result.on = sb
		result.newtab = data.searchbar_newtab || false
		result.engine = data.searchbar_engine ? data.searchbar_engine.replace('s_', '') : 'google'
	}

	// Filter links to remove alias and give random ids
	try {
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
		result = linksFilter(result)
	} catch (e) {
		errorMessage('Messed up in filter imports', e)
	}

	return result
}

function interfaceWidgetToggle(init, event) {
	const toggleEmpty = (is) => clas(id('widgets'), is, 'empty')

	// Event is a string of the widget name to toggle
	if (event) {
		chrome.storage.sync.get(['searchbar', 'quotes', 'quicklinks'], (data) => {
			let displayed = {
				links: data.quicklinks,
				quotes: data.quotes.on,
				searchbar: data.searchbar.on,
			}

			displayed[event] = !displayed[event] // toggles relevent widget
			toggleEmpty(!(displayed.links || displayed.quotes || displayed.searchbar)) // checks if all values are false
		})

		return
	}

	toggleEmpty(!(init.quicklinks || init.searchbar.on || init.quotes.on)) // if one is true, not empty
}

function startup(data) {
	traduction(null, data.lang)
	canDisplayInterface(null, data)

	sunTime(data.weather)
	weather(null, null, data)

	customFont(data.font)
	textShadow(data.textShadow)

	favicon(data.favicon)
	tabTitle(data.tabtitle)
	clock(null, data)
	darkmode(data.dark, null)
	searchbar(null, null, data.searchbar)
	quotes(null, null, data)
	showPopup(data.reviewPopup)

	customCss(data.css)
	hideElem(data.hide)
	initBackground(data)
	quickLinks(null, null, data)
	interfaceWidgetToggle(data)

	setTimeout(() => settingsInit(data), 200)
}

const dominterface = id('interface'),
	isExtension = detectPlatform() !== 'online',
	funcsOk = {
		clock: false,
		links: false,
	}

let lazyClockInterval = setTimeout(() => {}, 0),
	localIsLoading = false,
	loadtimeStart = performance.now(),
	sunset = 0,
	sunrise = 0

window.onload = function () {
	isExtension // On settings changes, update export code
		? chrome.storage.onChanged.addListener(() => updateExportJSON())
		: (window.onstorage = () => updateExportJSON())

	setInterval(() => {
		// Checks every 5 minutes if weather needs update
		navigator.onLine ? chrome.storage.sync.get(['weather', 'hide'], (data) => weather(null, null, data)) : ''
	}, 5 * 60 * 1000)

	// For Mobile that caches pages for days
	if (mobilecheck()) {
		document.addEventListener('visibilitychange', () => onlineMobilePageUpdate())
	}

	// Only on Online / Safari
	if (detectPlatform() === 'online') {
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

		if (testOS.ios && navigator.userAgent.includes('Firefox')) {
			// Fix for opening tabs Firefox iOS
			let globalID
			function triggerAnimationFrame() {
				appHeight()
				globalID = requestAnimationFrame(triggerAnimationFrame)
			}

			window.requestAnimationFrame(triggerAnimationFrame)
			setTimeout(function () {
				cancelAnimationFrame(globalID)
			}, 500)
		}
	}

	try {
		chrome.storage.sync.get(null, (data) => {
			const isImport = sessionStorage.isImport === 'true'
			const versionChange = data?.about?.version !== syncDefaults.about.version

			// First Startup, chrome.storage is null
			if (Object.keys(data).length === 0) {
				data = syncDefaults
				document.documentElement.setAttribute('lang', defaultLang())
				chrome.storage.local.set(localDefaults)
				chrome.storage.sync.set(isExtension ? data : { import: data })
			}

			// Import
			if (isImport) {
				// needs local to migrate backgrounds (1.13.2 => 1.14.0)
				chrome.storage.local.get(null, (local) => {
					local = localDataMigration(local)
					data = filterImports(data)
					sessionStorage.removeItem('isImport')

					// Change version in here
					// Only after "different version" startup is triggered
					data.about = { browser: detectPlatform(), version: syncDefaults.about.version }

					chrome.storage.sync.clear()
					chrome.storage.sync.set(isExtension ? data : { import: data })

					// (can be removed): updates local for 1.13.2 => 1.14.0
					if (isExtension) {
						chrome.storage.local.clear()
						chrome.storage.local.set({ ...local }, () => startup(data))
					} else {
						localStorage.bonjourrBackgrounds = JSON.stringify(local)
						startup(data)
					}
					// end (can be removed)
					// startup(data)
				})

				return
			}

			// Update
			if (versionChange) {
				// Is at least 1.14.0, no filtering to do, just update version
				chrome.storage.sync.set({
					quicklinks: true,
					about: { browser: detectPlatform(), version: syncDefaults.about.version },
				})
			}

			startup(data)
		})
	} catch (e) {
		errorMessage('Could not load chrome storage on startup', e)
	}
}
