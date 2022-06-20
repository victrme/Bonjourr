function initParams(data, settingsDom) {
	//

	const paramId = (str) => settingsDom.querySelector('#' + str)
	const paramClasses = (str) => settingsDom.querySelectorAll('.' + str)
	const initInput = (dom, cat, base) => (paramId(dom).value = cat !== undefined ? cat : base)
	const initCheckbox = (dom, cat) => (paramId(dom).checked = cat ? true : false)
	const isThereData = (cat, sub) => (data[cat] ? data[cat][sub] : undefined)

	function toggleClockOptions(dom, analog) {
		dom.classList.remove(analog ? 'digital' : 'analog')
		dom.classList.add(analog ? 'analog' : 'digital')
	}

	// 1.10.0 custom background slideshow
	const whichFreq = data.background_type === 'custom' ? data.custom_every : isThereData('dynamic', 'every')
	const whichFreqDefault = data.background_type === 'custom' ? 'pause' : 'hour'

	initInput('cssEditor', data.css, '')
	initInput('i_row', data.linksrow, 8)
	initInput('i_linkstyle', data.linkstyle, 'default')
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
	initInput('i_textshadow', data.textShadow)

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

	// Input translation
	paramId('i_title').setAttribute('placeholder', tradThis('Name'))
	paramId('i_greeting').setAttribute('placeholder', tradThis('Name'))
	paramId('i_tabtitle').setAttribute('placeholder', tradThis('New tab'))
	paramId('i_sbrequest').setAttribute('placeholder', tradThis('Search query: %s'))
	paramId('cssEditor').setAttribute('placeholder', tradThis('Type in your custom CSS'))
	// paramId('i_import').setAttribute('placeholder', tradThis('Import code'))
	// paramId('i_export').setAttribute('title', tradThis('Export code'))

	// Change edit tips on mobile
	if (mobilecheck()) {
		settingsDom.querySelector('.tooltiptext .instructions').textContent = tradThis(
			`Edit your Quick Links by long-pressing the icon.`
		)
	}

	// inserts languages in select
	Object.entries(langList).forEach(([code, title]) => {
		let option = document.createElement('option')
		option.value = code
		option.text = title
		paramId('i_lang').appendChild(option)
	})

	// Activate changelog (hasUpdated is activated in background.js)
	if (localStorage.hasUpdated === 'true') {
		changelogControl(settingsDom)
	}

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

	// Backgrounds options init
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

	// Searchbar display settings
	clas(paramId('searchbar_options'), data.searchbar?.on, 'shown')
	clas(paramId('searchbar_request'), data.searchbar?.engine === 'custom', 'shown')

	// CSS height control
	if (data.cssHeight) paramId('cssEditor').style.height = data.cssHeight + 'px'

	// Quotes option display
	clas(paramId('quotes_options'), data.quotes?.on, 'shown')

	// Language input
	paramId('i_lang').value = data.lang || 'en'

	paramsExport(settingsDom)

	//
	//
	// Events
	//
	//

	// Pressing "Enter" removes focus from input to indicate change
	const enterBlurs = (e) => e.addEventListener('keypress', (e) => (e.key === 'Enter' ? e.target.blur() : ''))
	enterBlurs(paramId('i_favicon'))
	enterBlurs(paramId('i_tabtitle'))
	enterBlurs(paramId('i_greeting'))

	//general

	paramClasses('uploadContainer').forEach(function(uploadContainer) {
		toggleDrag = () => uploadContainer.classList.toggle('dragover')

		const input = uploadContainer.querySelector('input[type="file"')

		input.addEventListener('dragenter', toggleDrag)
		input.addEventListener('dragleave', toggleDrag)
		input.addEventListener('drop', toggleDrag)
	})

	const tooltips = settingsDom.querySelectorAll('.tooltip')

	// Change edit tips on mobile
	if (mobilecheck())
		settingsDom.querySelector('.tooltiptext .instructions').textContent = tradThis(
			`Edit your Quick Links by long-pressing the icon.`
		)

	tooltips.forEach((elem) => {
		elem.onclick = function () {
			const toggleTooltip = (which) => {
				if (this.classList.contains(which)) settingsDom.querySelector('.tooltiptext.' + which).classList.toggle('shown')
			}

			const names = ['tttab', 'ttcoll', 'ttlinks', 'csslinks', 'settingsMngmt']
			names.forEach(name => toggleTooltip(name));
		}
	})

	// Reduces opacity to better see interface appearance changes
	if (mobilecheck()) {
		const touchHandler = (start) => (id('settings').style.opacity = start ? 0.2 : 1)
		const rangeInputs = settingsDom.querySelectorAll("input[type='range'")

		rangeInputs.forEach(function (input) {
			input.addEventListener('touchstart', () => touchHandler(true), { passive: true })
			input.addEventListener('touchend', () => touchHandler(false), { passive: true })
		})
	}

	//
	// General

	paramId('i_showall').onchange = function () {
		showall(this.checked, true)
	}

	paramId('i_lang').onchange = function () {
		switchLangs(this.value)
	}

	paramId('i_greeting').onkeyup = function () {
		clock({ greeting: stringMaxSize(this.value, 32) })
	}

	paramId('i_favicon').oninput = function () {
		favicon(null, this)
	}

	paramId('i_tabtitle').oninput = function () {
		tabTitle(null, this)
	}

	paramId('i_dark').onchange = function () {
		darkmode(null, this.value)
	}

	paramId('hideelem')
		.querySelectorAll('button')
		.forEach((elem) => {
			elem.onmouseup = function () {
				elem.classList.toggle('clicked')
				hideElem(null, null, this)
			}
		})

	//
	// Quick links

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
		quickLinks('linknewtab', this.checked)
	}

	paramId('i_linkstyle').onchange = function () {
		quickLinks('linkstyle', this.value)
	}

	paramId('i_row').oninput = function () {
		linksrow(null, null, this.value)
	}

	//
	// Dynamic backgrounds

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

	//
	// Custom backgrounds

	paramId('i_bgfile').onchange = function () {
		localBackgrounds(null, { is: 'newfile', file: this.files })
	}

	paramId('i_blur').oninput = function () {
		filter('blur', this.value)
		slowRange({ background_blur: parseFloat(this.value) })
	}

	paramId('i_bright').oninput = function () {
		filter('bright', this.value)
		slowRange({ background_bright: parseFloat(this.value) })
	}

	//
	// Time and date

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

	paramId('i_usdate').onchange = function () {
		clock({ usdate: this.checked })
	}

	//
	// Weather

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

	//
	// Searchbar

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

	//
	// Quotes

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

	//
	// Custom fonts

	// Fetches font list only on focus (if font family is default)
	paramId('i_customfont').onfocus = function () {
		if (settingsDom.querySelector('#dl_fontfamily').childElementCount === 0) {
			customFont(null, { autocomplete: true, settingsDom: settingsDom })
		}
	}

	paramId('i_customfont').onchange = function () {
		customFont(null, { family: this.value })
	}

	paramId('i_weight').oninput = function () {
		customFont(null, { weight: this.value })
	}

	paramId('i_size').oninput = function () {
		customFont(null, { size: this.value })
	}

	paramId('i_textshadow').oninput = function () {
		textShadow(null, this.value)
	}

	//
	// Custom Style

	paramId('cssEditor').addEventListener('keyup', function (e) {
		customCss(null, { is: 'styling', val: e.target.value })
	})

	cssInputSize(paramId('cssEditor'))

	//
	// Settings management

	paramId('submitReset').onclick = function () {
		importExport('reset')
	}

	paramId('i_importfile').onchange = function () {
		const file = this.files[0]
		const reader = new FileReader()

		reader.onload = function (e) {
			try {
				const json = JSON.parse(window.atob(reader.result))
				importation(json)
			} catch (err) {
				console.log(err)
			}
		}
		reader.readAsText(file)
	}

	paramId('s_settingsexport').onclick = function () {
		clas(this, true, 'selected')

		clas(document.querySelector('#importexport .param'), false, 'visibleImport')
	}

	paramId('s_settingsimport').onclick = function () {
		clas(this, true, 'selected')
		clas(document.querySelector('#importexport .param'), true, 'visibleImport')
	}

	paramId('exportfile').onclick = function () {
		const a = id('exportSettings')

		chrome.storage.sync.get(null, (data) => {
			a.href = `data:text/plain;charset=utf-8,${window.btoa(JSON.stringify(data))}`
			a.download = `bonjourrExport-${data?.about?.version}-${randomString(6)}.txt`
			a.click()
		})
	}

	paramId('copyimport').onclick = async function () {
		try {
			await navigator.clipboard.writeText(id('i_settingsarea').value)
			this.textContent = 'Copied !'
			setTimeout(() => (id('copyimport').textContent = 'Copy settings'), 1000)
		} catch (err) {
			console.error('Failed to copy: ', err)
		}
	}

	paramId('i_importtext').onkeyup = function () {
		try {
			JSON.parse(this.value)
			id('importtext').removeAttribute('disabled')
		} catch (error) {
			id('importtext').setAttribute('disabled', '')
		}
	}

	paramId('importtext').onclick = function () {
		importation(JSON.parse(id('i_importtext').value))
	}
}

function cssInputSize(param) {
	setTimeout(() => {
		const cssResize = new ResizeObserver((e) => {
			const rect = e[0].contentRect
			customCss(null, { is: 'resize', val: rect.height + rect.top * 2 })
		})
		cssResize.observe(param)
	}, 400)
}

function changelogControl(settingsDom) {
	const domshowsettings = document.querySelector('#showSettings')
	const domchangelog = settingsDom.querySelector('#changelogContainer')

	clas(domchangelog, true, 'shown')
	clas(domshowsettings, true, 'hasUpdated')

	function dismiss() {
		clas(domshowsettings, false, 'hasUpdated')
		domchangelog.className = 'dismissed'
		localStorage.removeItem('hasUpdated')
	}

	settingsDom.querySelector('#link').onclick = () => dismiss()
	settingsDom.querySelector('#log_dismiss').onclick = () => dismiss()
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

function showall(val, event, domSettings) {
	if (event) chrome.storage.sync.set({ showall: val })
	clas(event ? id('settings') : domSettings, val, 'all')
}

function selectBackgroundType(cat) {
	function toggleType(sync, local) {
		id('custom').style.display = cat === 'custom' ? 'block' : 'none'
		document.querySelector('.as_collection').style.display = cat === 'custom' ? 'none' : 'block'

		// Only apply fade out/in if there are local backgrounds
		// No local ? no reason to fade to black or show no thumbnails
		// Just stick to unsplash

		if (cat === 'custom' && local.selectedId !== '') {
			id('background_overlay').style.opacity = `0`
			localBackgrounds(null, { is: 'thumbnail', settings: id('settings') })
			setTimeout(
				() =>
					localBackgrounds({
						every: sync.custom_every,
						time: sync.custom_time,
					}),
				400
			)
		}

		if (cat === 'dynamic') {
			clas(id('credit'), true, 'shown')

			if (local.selectedId !== '') {
				id('background_overlay').style.opacity = `0`
				setTimeout(() => unsplash(sync), 400)
			}
		}

		const c_every = sync.custom_every || 'pause'
		const d_every = sync.dynamic.every || 'hour'

		id('i_freq').value = cat === 'custom' ? c_every : d_every // Setting frequence input

		chrome.storage.sync.set({ background_type: cat })
	}

	chrome.storage.local.get('selectedId', (local) => {
		chrome.storage.sync.get(['custom_every', 'custom_time', 'dynamic'], (sync) => toggleType(sync, local))
	})
}

function importation(dataToImport) {
	function fadeOut() {
		const dominterface = id('interface')
		dominterface.click()
		dominterface.style.transition = 'opacity .4s'
		dominterface.style.opacity = '0'
		setTimeout(() => location.reload(), 400)
	}

	try {
		// Load all sync & dynamicCache
		chrome.storage.sync.get(null, (sync) => {
			chrome.storage.local.get('dynamicCache', (local) => {
				//
				console.log(dataToImport)
				const newImport = dataToImport

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
				sync = detectPlatform() === 'online' ? { import: sync } : sync // full import on Online is through "import" field

				chrome.storage.sync.clear() // Must clear, if not, it can add legacy data
				chrome.storage.sync.set(sync, chrome.storage.local.set(local))

				sessionStorage.isImport = true // to separate import and new version startup

				fadeOut()
			})
		})
	} catch (e) {
		console.log(e)
	}
}

function paramsExport(settingsDom) {
	if (!settingsDom && !id('settings')) {
		return false
	}

	const dom = settingsDom || id('settings')
	const input = dom.querySelector('#i_settingsarea')

	dom.querySelector('#importtext').setAttribute('disabled', '') // because cannot export same settings

	chrome.storage.sync.get(null, (data) => {
		if (data.weather && data.weather.lastCall) delete data.weather.lastCall
		if (data.weather && data.weather.forecastLastCall) delete data.weather.forecastLastCall
		data.about.browser = detectPlatform()

		const prettified = JSON.stringify(data, null, '\t')

		input.value = prettified
	})
}

function signature(dom) {
	const spans = dom.querySelectorAll('#rand span')
	const as = dom.querySelectorAll('#rand a')
	const us = [
		{ href: 'https://victr.me/', name: 'Victor Azevedo' },
		{ href: 'https://tahoe.be/', name: 'Tahoe Beetschen' },
	]

	if (Math.random() > 0.5) us.reverse()

	spans[0].textContent = `${tradThis('by')} `
	spans[1].textContent = ` & `

	as.forEach((a, i) => {
		a.href = us[i].href
		a.textContent = us[i].name
	})
}

function settingsInit(data) {
	function settingsCreator(html) {
		const domshowsettings = id('showSettings')
		const dominterface = id('interface')
		const domedit = id('editlink')

		const parser = new DOMParser()
		const settingsDom = document.createElement('div')
		const contentList = [...parser.parseFromString(html, 'text/html').body.childNodes]

		settingsDom.id = 'settings'
		settingsDom.setAttribute('class', 'init')
		contentList.forEach((elem) => settingsDom.appendChild(elem))

		traduction(settingsDom, data.lang)
		signature(settingsDom)
		initParams(data, settingsDom)
		showall(data.showall, false, settingsDom)

		document.body.prepend(settingsDom) // Apply to body

		//
		// Events
		//

		function toggleDisplay(dom) {
			const isClosed = !has(dom, 'shown')

			clas(dom, false, 'init')
			clas(dom, isClosed, 'shown')
			clas(domshowsettings, isClosed, 'shown')
			clas(domedit, isClosed, 'pushed')

			if (!mobilecheck()) clas(dominterface, isClosed, 'pushed')
		}

		domshowsettings.onclick = function () {
			toggleDisplay(settingsDom)
		}

		document.onkeydown = function (e) {
			if (e.code === 'Escape') {
				toggleDisplay(settingsDom) // Opens menu when pressing "Escape"
				return
			}

			if (e.code === 'Tab') {
				clas(document.body, true, 'tabbing') // Shows input outline when using tab
				return
			}

			if (id('error') && e.ctrlKey) {
				return // do nothing if pressing ctrl or if there's an error message
			}

			const conditions = [
				['sb_container', true],
				['settings', false],
				['editlink', false],
			]

			if (conditions.every(([name, shouldBe]) => has(id(name), 'shown') === shouldBe)) {
				id('searchbar').focus() // Focus searchbar if only searchbar is on
			}
		}

		dominterface.onclick = function (e) {
			if (e.composedPath().includes('linkblocks')) {
				return // Do nothing if links are clicked
			}

			if (has(id('editlink'), 'shown')) {
				closeEditLink() // hides edit menu
			}

			if (document.body.classList.contains('tabbing')) {
				clas(document.body, false, 'tabbing') // Removes tabbing class on click
			}

			// Close menu when clicking anywhere on interface
			if (has(settingsDom, 'shown')) {
				clas(settingsDom, false, 'shown')
				clas(domshowsettings, false, 'shown')
				clas(dominterface, false, 'pushed')
			}
		}
	}

	fetch('settings.html').then((resp) => resp.text().then(settingsCreator))
}
