function initParams(data, settingsDom) {
	//

	const paramId = (str) => settingsDom.querySelector('#' + str)
	const initInput = (dom, cat, base) => (paramId(dom).value = cat !== undefined ? cat : base)
	const initCheckbox = (dom, cat) => (paramId(dom).checked = cat ? true : false)
	const isThereData = (cat, sub) => (data[cat] ? data[cat][sub] : undefined)
	const enterBlurs = (e) => e.addEventListener('keypress', (e) => (e.key === 'Enter' ? e.target.blur() : ''))

	function toggleClockOptions(dom, analog) {
		dom.classList.remove(analog ? 'digital' : 'analog')
		dom.classList.add(analog ? 'analog' : 'digital')
	}

	// 1.10.0 custom background slideshow
	const whichFreq = data.background_type === 'custom' ? data.custom_every : isThereData('dynamic', 'every')
	const whichFreqDefault = data.background_type === 'custom' ? 'pause' : 'hour'

	// inserts languages in select
	for (const [code, title] of Object.entries(langList)) {
		let option = document.createElement("option")
			option.value = code
			option.text = title
			
		paramId('i_lang').add(option)
	}

	initInput('cssEditor', data.css, '')
	initInput('i_row', data.linksrow, 8)
	initInput('i_type', data.background_type, 'dynamic')
	initInput('i_freq', whichFreq, whichFreqDefault)
	initInput('i_blur', data.background_blur, 15)
	initInput('i_bright', data.background_bright, 0.8)
	initInput('i_dark', data.dark, 'system')
	initInput('i_favicon', data.favicon, '')
	initInput('i_tabtitle', data.tabtitle, '')
	initInput('i_greeting', data.greeting, '')
	initInput('i_sbengine', isThereData('searchbar', 'engine'), 'google')
	initInput('i_sbopacity', isThereData('searchbar', 'opacity'), 0.1)
	initInput('i_sbrequest', isThereData('searchbar', 'request'), '')
	initInput('i_qtfreq', isThereData('quotes', 'frequency'))
	initInput('i_qttype', isThereData('quotes', 'type'))
	initInput('i_clockface', isThereData('clock', 'face'), 'none')
	initInput('i_timezone', isThereData('clock', 'timezone'), 'auto')
	initInput('i_collection', isThereData('dynamic', 'collection'), '')
	initInput('i_ccode', isThereData('weather', 'ccode'), 'US')
	initInput('i_forecast', isThereData('weather', 'forecast'), 'auto')
	initInput('i_temp', isThereData('weather', 'temperature'), 'actual')
	initInput('i_customfont', isThereData('font', 'family'), '')
	initInput('i_weight', isThereData('font', 'weight'), 300)
	initInput('i_size', isThereData('font', 'size'), mobilecheck() ? 11 : 14)

	initCheckbox('i_showall', data.showall)
	initCheckbox('i_linknewtab', data.linknewtab)
	initCheckbox('i_usdate', data.usdate)
	initCheckbox('i_geol', isThereData('weather', 'location'))
	initCheckbox('i_units', isThereData('weather', 'unit') === 'imperial')
	initCheckbox('i_sb', isThereData('searchbar', 'on'))
	initCheckbox('i_sbnewtab', isThereData('searchbar', 'newtab'))
	initCheckbox('i_quotes', isThereData('quotes', 'on'))
	initCheckbox('i_qtauthor', isThereData('quotes', 'author'))
	initCheckbox('i_ampm', isThereData('clock', 'ampm'), false)
	initCheckbox('i_seconds', isThereData('clock', 'seconds'), false)
	initCheckbox('i_analog', isThereData('clock', 'analog'), false)

	// No bookmarks import on safari || online
	if (window.location.protocol === 'safari-web-extension:' || window.location.protocol.match(/https?:/gim))
		paramId('b_importbookmarks').style.display = 'none'

	// Hide elems
	hideElem(null, settingsDom.querySelectorAll('#hideelem button'), null)

	// Font family default
	safeFont(settingsDom)

	// Fetches font list if font is not default
	// to prevent forced reflow when appending to visible datalist dom
	if (isThereData('font', 'family') !== '') customFont(null, { autocomplete: true, settingsDom: settingsDom })

	// Font weight
	if (data.font && data.font.availWeights.length > 0) modifyWeightOptions(data.font.availWeights, settingsDom, true)

	// Clock
	if (data.clock) toggleClockOptions(paramId('clockoptions'), data.clock.analog)

	// Input translation
	paramId('i_title').setAttribute('placeholder', tradThis('Name'))
	paramId('i_greeting').setAttribute('placeholder', tradThis('Name'))
	paramId('i_favicon').setAttribute('placeholder', tradThis('Any emoji'))
	paramId('i_tabtitle').setAttribute('placeholder', tradThis('New tab'))
	paramId('i_sbrequest').setAttribute('placeholder', tradThis('Search query: %s'))
	paramId('cssEditor').setAttribute('placeholder', tradThis('Type in your custom CSS'))
	paramId('i_import').setAttribute('placeholder', tradThis('Import code'))
	paramId('i_export').setAttribute('title', tradThis('Export code'))

	//bg
	if (data.background_type === 'custom') {
		paramId('custom').style.display = 'block'
		settingsDom.querySelector('.as_collection').style.display = 'none'
		localBackgrounds(null, { is: 'thumbnail', settings: settingsDom })
	}

	//weather settings
	if (data.weather && Object.keys(data.weather).length > 0) {
		const isGeolocation = data.weather.location.length > 0
		let cityName = data.weather.city ? data.weather.city : 'City'
		paramId('i_city').setAttribute('placeholder', cityName)

		clas(paramId('sett_city'), isGeolocation, 'hidden')
		paramId('i_geol').checked = isGeolocation
	} else {
		clas(paramId('sett_city'), true, 'hidden')
		paramId('i_geol').checked = true
	}

	//searchbar display settings
	clas(paramId('searchbar_options'), data.searchbar.on, 'shown')
	clas(paramId('searchbar_request'), data.searchbar.engine === 'custom', 'shown')

	//searchbar display settings
	if (data.cssHeight) paramId('cssEditor').style.height = data.cssHeight + 'px'

	clas(paramId('quotes_options'), data.quotes?.on, 'shown')

	//langue
	paramId('i_lang').value = data.lang || 'en'

	importExport('exp', false, settingsDom)

	//
	// Events
	//

	const bgfile = paramId('i_bgfile')
	const uploadContainer = paramId('uploadContainer')

	enterBlurs(paramId('i_favicon'))
	enterBlurs(paramId('i_tabtitle'))
	enterBlurs(paramId('i_greeting'))

	// file input animation
	bgfile.addEventListener('dragenter', function () {
		uploadContainer.classList.add('dragover')
	})

	bgfile.addEventListener('dragleave', function () {
		uploadContainer.classList.remove('dragover')
	})

	bgfile.addEventListener('drop', function () {
		uploadContainer.classList.remove('dragover')
	})

	//general

	const tooltips = settingsDom.querySelectorAll('.tooltip')

	// Change edit tips on mobile
	if (mobilecheck())
		settingsDom.querySelector('.tooltiptext .instructions').textContent = tradThis(
			`Edit your Quick Links by long-pressing the icon.`
		)

	tooltips.forEach((elem) => {
		elem.onclick = function () {
			const toggleTooltip = (which) => {
				if (this.classList.contains(which))
					settingsDom.querySelector('.tooltiptext.' + which).classList.toggle('shown')
			}

			toggleTooltip('ttcoll')
			toggleTooltip('ttlinks')
			toggleTooltip('csslinks')
		}
	})

	paramId('i_showall').onchange = function () {
		showall(this.checked, true)
	}

	function switchLangs(nextLang) {
		function langSwitchTranslation(langs) {
			// On 'en' lang, get the dict key, not one of its values
			// create dict like object to parse through
			// switchDict is: {{'current a': 'next a'}, {'current b': 'next b'} ...}

			const getLangList = (l) => (l === 'en' ? Object.keys(dict) : Object.values(dict).map((t) => t[l]))
			const changeText = (dom, str) => (dom.textContent = switchDict[str])

			const { current, next } = langs
			const nextList = getLangList(next)
			const currentList = getLangList(current)
			let switchDict = {}

			currentList.forEach((curr, i) => (switchDict[curr] = nextList[i]))

			const trns = document.querySelectorAll('.trn')
			trns.forEach((trn) => changeText(trn, trn.textContent))
		}

		const langs = {
			current: document.documentElement.getAttribute('lang'),
			next: nextLang,
		}

		sessionStorage.lang = nextLang // Session pour le weather
		chrome.storage.sync.set({ lang: nextLang })
		document.documentElement.setAttribute('lang', nextLang)

		chrome.storage.sync.get(null, (data) => {
			data.lang = nextLang
			langSwitchTranslation(langs)
			weather(null, null, data)
			clock(null, data)

			if (data.quotes?.type === 'classic') {
				localStorage.removeItem('nextQuote')
				localStorage.removeItem('currentQuote')
				quotes(null, null, data)
			}
		})
	}

	paramId('i_lang').onchange = function () {
		switchLangs(this.value)
	}

	//quick links

	paramId('i_title').onkeyup = function (e) {
		if (e.code === 'Enter') quickLinks('input', e)
	}

	paramId('i_url').onkeyup = function (e) {
		if (e.code === 'Enter') quickLinks('input', e)
	}

	paramId('submitlink').onmouseup = function () {
		quickLinks('button', this)
	}

	paramId('b_importbookmarks').onmouseup = function () {
		linksImport()
	}

	paramId('i_linknewtab').onchange = function () {
		quickLinks('linknewtab', this)
	}

	//visuals

	paramId('i_type').onchange = function () {
		selectBackgroundType(this.value)
	}

	paramId('i_freq').onchange = function () {
		if (paramId('i_type').value === 'custom') chrome.storage.sync.set({ custom_every: this.value })
		else unsplash(null, { every: this.value })
	}

	paramId('i_refresh').onclick = function (e) {
		paramId('i_type').value === 'custom'
			? slow(this, localBackgrounds(null, { is: 'refresh', button: this.children[0] }))
			: slow(this, unsplash(null, { refresh: this.children[0] }))
	}

	paramId('i_collection').onchange = function () {
		unsplash(null, { collection: stringMaxSize(this.value, 256) })
		this.blur()
	}

	//custom bg

	paramId('i_bgfile').onchange = function () {
		localBackgrounds(null, { is: 'newfile', file: this.files[0] })
	}

	paramId('i_blur').oninput = function () {
		filter('blur', this.value)
		slowRange({ background_blur: parseFloat(this.value) })
	}

	paramId('i_bright').oninput = function () {
		filter('bright', this.value)
		slowRange({ background_bright: parseFloat(this.value) })
	}

	paramId('i_dark').onchange = function () {
		darkmode(this.value)
	}

	paramId('i_favicon').oninput = function () {
		favicon(null, this)
	}

	paramId('i_tabtitle').oninput = function () {
		tabTitle(null, this)
	}

	// paramId('i_favicon').onkeyup = (e) => (e.key === 'Enter' ? e.target.blur() : '')

	//Time and date

	paramId('i_analog').onchange = function () {
		clock({ analog: this.checked })
		toggleClockOptions(paramId('clockoptions'), this.checked)
	}

	paramId('i_seconds').onchange = function () {
		clock({ seconds: this.checked })
	}

	paramId('i_clockface').onchange = function () {
		clock({ face: this.value })
	}

	paramId('i_ampm').onchange = function () {
		clock({ ampm: this.checked })
	}

	paramId('i_timezone').onchange = function () {
		clock({ timezone: this.value })
	}

	paramId('i_greeting').onkeyup = function () {
		clock({ greeting: stringMaxSize(this.value, 32) })
	}

	paramId('i_usdate').onchange = function () {
		clock({ usdate: this.checked })
	}

	//weather

	paramId('i_city').onkeyup = function (e) {
		if (e.code === 'Enter') {
			clearTimeout(rangeActive)
			if (!stillActive) weather('city', this)
		} else {
			const that = this
			clearTimeout(rangeActive)
			rangeActive = setTimeout(() => weather('city', that), 2000)
		}
	}

	paramId('i_units').onchange = function () {
		if (!stillActive) weather('units', this)
	}

	paramId('i_geol').onchange = function () {
		if (!stillActive) weather('geol', this)
	}

	paramId('i_forecast').onchange = function () {
		weather('forecast', this)
	}

	paramId('i_temp').onchange = function () {
		weather('temp', this)
	}

	//searchbar

	paramId('i_sb').onchange = function () {
		paramId('searchbar_options').classList.toggle('shown')
		if (!stillActive) searchbar('searchbar', this)
		slow(this)
	}

	paramId('i_sbengine').onchange = function () {
		searchbar('engine', this)
	}

	paramId('i_sbopacity').oninput = function () {
		searchbar('opacity', this)
	}

	paramId('i_sbrequest').onchange = function () {
		searchbar('request', this)
	}

	paramId('i_sbnewtab').onchange = function () {
		searchbar('newtab', this)
	}

	// quotes

	paramId('i_quotes').onchange = function () {
		paramId('quotes_options').classList.toggle('shown')
		quotes('toggle', this)
	}

	paramId('i_qtfreq').onchange = function () {
		quotes('frequency', this)
	}

	paramId('i_qttype').onchange = function () {
		quotes('type', this)
	}

	paramId('i_qtrefresh').onclick = function () {
		if (!stillActive) quotes('refresh', this)
		turnRefreshButton(this.children[0], true)
		slow(this, 600)
	}

	paramId('i_qtauthor').onchange = function () {
		quotes('author', this)
	}

	//settings

	paramId('submitReset').onclick = function () {
		importExport('reset')
	}

	paramId('submitImport').onclick = function () {
		importExport('imp', true)
	}

	paramId('i_import').onkeypress = function (e) {
		e.code === 'Enter' ? importExport('imp', true) : ''
	}

	// Fetches font list only on focus (if font family is default)
	paramId('i_customfont').onfocus = function () {
		const datalist = settingsDom.querySelector('#dl_fontfamily')
		if (datalist.childElementCount === 0) customFont(null, { autocomplete: true, settingsDom: settingsDom })
	}

	paramId('i_customfont').onchange = function () {
		customFont(null, { family: this.value })
	}

	paramId('i_weight').oninput = function () {
		customFont(null, { weight: this.value })
	}

	paramId('i_size').oninput = function () {
		customSize(null, this.value)
	}

	// Reduces opacity to better see interface size changes
	if (mobilecheck()) {
		const touchHandler = (start) => (id('settings').style.opacity = start ? 0.2 : 1)
		paramId('i_size').addEventListener('touchstart', () => touchHandler(true), { passive: true })
		paramId('i_size').addEventListener('touchend', () => touchHandler(false), { passive: true })
	}

	paramId('i_row').oninput = function () {
		linksrow(null, this.value)
	}

	paramId('hideelem')
		.querySelectorAll('button')
		.forEach((elem) => {
			elem.onmouseup = function () {
				elem.classList.toggle('clicked')
				hideElem(null, null, this)
			}
		})

	const cssEditor = paramId('cssEditor')

	cssEditor.addEventListener('keyup', function (e) {
		customCss(null, { is: 'styling', val: e.target.value })
	})

	setTimeout(() => {
		const cssResize = new ResizeObserver((e) => {
			const rect = e[0].contentRect
			customCss(null, { is: 'resize', val: rect.height + rect.top * 2 })
		})
		cssResize.observe(cssEditor)
	}, 400)
}

function showall(val, event, domSettings) {
	if (event) chrome.storage.sync.set({ showall: val })
	clas(event ? id('settings') : domSettings, val, 'all')
}

function selectBackgroundType(cat) {
	id('custom').style.display = cat === 'custom' ? 'block' : 'none'
	document.querySelector('.as_collection').style.display = cat === 'custom' ? 'none' : 'block'

	chrome.storage.sync.get(['custom_every', 'dynamic'], (data) => {
		//
		// Applying functions
		if (cat === 'custom') {
			localBackgrounds(null, { is: 'thumbnail', settings: id('settings') })
		}
		if (cat === 'dynamic') {
			// Timeout needed because it uses init data
			id('background_overlay').style.opacity = `0`
			id('background').removeAttribute('index')
			setTimeout(() => unsplash(data), 400)
			clas(id('credit'), true, 'shown')
		}

		// Setting frequence
		const c_every = data.custom_every || 'pause'
		const d_every = data.dynamic.every || 'hour'

		id('i_freq').value = cat === 'custom' ? c_every : d_every
	})

	chrome.storage.sync.set({ background_type: cat })
}

function importExport(select, isEvent, settingsDom) {
	function fadeOut() {
		const dominterface = id('interface')
		dominterface.click()
		dominterface.style.transition = 'opacity .4s'
		dominterface.style.opacity = '0'
		setTimeout(() => location.reload(), 400)
	}

	function importation() {
		//
		const dom = id('i_import')
		const placeholder = (str) => dom.setAttribute('placeholder', tradThis(str))

		if (!isEvent || dom?.value?.length === 0) {
			return
		}

		function applyImportation(sync, local, newImport) {
			// Remove user collection cache if collection change
			if (sync.dynamic && newImport.dynamic) {
				if (sync.dynamic.collection !== newImport.dynamic.collection) {
					local.dynamicCache.user = []
				}
			}

			// Delete current links on imports containing links somewhere
			// to avoid duplicates
			if (newImport.links?.length > 0 || bundleLinks(newImport)?.length > 0) {
				bundleLinks(sync).forEach((elem) => {
					delete sync[elem._id]
				})
			}

			sync = { ...sync, ...newImport }
			delete sync.about // Remove about to trigger "new version" startup to filter data

			sync = detectPlatform() === 'online' ? { import: sync } : sync // full import on Online is through "import" field

			chrome.storage.sync.clear() // Must clear, if not, it can add legacy data
			chrome.storage.sync.set(sync, chrome.storage.local.set(local))

			fadeOut()
		}

		try {
			const imported = JSON.parse(dom.value)

			// Load all sync & dynamicCache
			chrome.storage.sync.get(null, (data) =>
				chrome.storage.local.get('dynamicCache', (local) => applyImportation(data, local, imported))
			)
		} catch (e) {
			dom.value = ''
			placeholder('Error in import code')
			setTimeout(() => placeholder('Import code'), 2000)
			console.error(e)
		}
	}

	function exportation() {
		if (!id('settings') && !settingsDom) return false

		const pre = settingsDom ? settingsDom.querySelector('#i_export') : id('i_export')

		chrome.storage.sync.get(null, (data) => {
			if (data.weather && data.weather.lastCall) delete data.weather.lastCall
			if (data.weather && data.weather.forecastLastCall) delete data.weather.forecastLastCall

			data.about.browser = detectPlatform()
			pre.textContent = JSON.stringify(data)
		})
	}

	function anihilation() {
		let input = id('submitReset')

		if (!input.hasAttribute('sure')) {
			input.textContent = tradThis('Click again to confirm')
			input.setAttribute('sure', '')
		} else {
			detectPlatform() === 'online' ? lsOnlineStorage.del() : deleteBrowserStorage()
			fadeOut()
		}
	}

	const fncs = { exp: exportation, imp: importation, reset: anihilation }
	fncs[select]()
}

function signature(dom) {
	const spans = dom.querySelectorAll('#rand span')
	const hyper = dom.querySelectorAll('#rand a')
	const us = [
		{ href: 'https://victr.me/', name: 'Victor Azevedo' },
		{ href: 'https://tahoe.be/', name: 'Tahoe Beetschen' },
	]

	if (Math.random() > 0.5) us.reverse()

	spans[0].textContent = `${tradThis('by')} `
	spans[1].textContent = ` & `

	hyper.forEach((hyper, i) => {
		hyper.href = us[i].href
		hyper.textContent = us[i].name
	})
}

function settingsInit(data) {
	const domshowsettings = id('showSettings')
	const dominterface = id('interface')

	function settingsCreator(html) {
		function showSettings() {
			const settings = id('settings')
			const settingsNotShown = !has(settings, 'shown')
			const domedit = id('editlink')

			mobilecheck() ? '' : clas(dominterface, settingsNotShown, 'pushed')

			clas(settings, false, 'init')
			clas(settings, settingsNotShown, 'shown')
			clas(domshowsettings, settingsNotShown, 'shown')
			clas(domedit, settingsNotShown, 'pushed')
		}

		// HTML creation
		const parser = new DOMParser()
		const settingsDom = document.createElement('div')
		const contentList = [...parser.parseFromString(html, 'text/html').body.childNodes]

		settingsDom.id = 'settings'
		contentList.forEach((elem) => settingsDom.appendChild(elem))

		settingsDom.setAttribute('class', 'init')

		traduction(settingsDom, data.lang)
		signature(settingsDom)
		initParams(data, settingsDom)
		showall(data.showall, false, settingsDom)

		// Apply to body
		document.body.prepend(settingsDom)

		// Add Events
		if (sessionStorage.lang) showSettings()
		domshowsettings.onclick = () => showSettings()
		document.onkeyup = (e) => (e.code === 'Escape' ? showSettings() : '')
	}

	function interfaceClickEvents(e) {
		//cherche le parent du click jusqu'a trouver linkblocks
		//seulement si click droit, quitter la fct
		let parent = e.target
		const settings = id('settings')
		const domedit = document.querySelector('#editlink')

		while (parent !== null) {
			parent = parent.parentElement
			if (parent && parent.id === 'linkblocks' && e.which === 3) return false
		}

		// hides edit menu
		if (has(domedit, 'shown')) closeEditLink()

		//
		if (has(settings, 'shown')) {
			clas(settings, false, 'shown')
			clas(domshowsettings, false, 'shown')
			clas(dominterface, false, 'pushed')
		}

		if (document.body.classList.contains('tabbing')) {
			clas(document.body, false, 'tabbing')
		}
	}

	function interfaceKeyEvents(e) {
		//focus la searchbar si elle existe et les settings sont fermé
		const searchbarOn = has(id('sb_container'), 'shown') === true
		const noSettings = has(id('settings'), 'shown') === false

		if (e.code !== 'Escape' && e.code !== 'ControlLeft' && searchbarOn && noSettings) id('searchbar').focus()
		if (e.code === 'Tab') clas(document.body, true, 'tabbing')
	}

	if (window.location.protocol === 'file:') {
		const xhr = new XMLHttpRequest()
		xhr.open('POST', 'settings.html', true)
		xhr.onreadystatechange = (e) => (e.target.readyState === 4 ? settingsCreator(e.target.responseText) : '')
		xhr.send()
	} else {
		fetch('settings.html').then((resp) => resp.text().then(settingsCreator))
	}

	dominterface.onclick = interfaceClickEvents
	document.onkeydown = interfaceKeyEvents
}
