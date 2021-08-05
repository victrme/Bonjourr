function signature(dom) {
	const span = document.createElement('span')
	const us = [
		{ href: 'https://victr.me/', name: 'Victor Azevedo' },
		{ href: 'https://tahoe.be', name: 'Tahoe Beetschen' },
	]

	if (Math.random() > 0.5) us.reverse()

	us.forEach((sign) => {
		const a = document.createElement('a')
		a.href = sign.href
		a.textContent = sign.name
		span.appendChild(a)
	})

	dom.querySelector('#rand').appendChild(span)
}

function selectBackgroundType(cat) {
	id('dynamic').style.display = 'none'
	id('custom').style.display = 'none'
	id(cat).style.display = 'block'

	chrome.storage.sync.get(['custom_every', 'dynamic'], (data) => {
		//
		// Applying functions
		if (cat === 'custom') {
			localBackgrounds(null, true)
		}
		if (cat === 'dynamic') {
			domoverlay.style.opacity = `0`
			domcredit.style.display = 'block'
			setTimeout(() => {
				clas(domcredit, true, 'shown')
				unsplash(data)
			}, BonjourrAnimTime)
		}

		// Setting frequence
		const c_every = data.custom_every || 'pause'
		const d_every = data.dynamic.every || 'hour'

		id('i_freq').value = cat === 'custom' ? c_every : d_every
	})

	chrome.storage.sync.set({ background_type: cat })
}

function showall(val, event, domSettings) {
	if (event) chrome.storage.sync.set({ showall: val })
	clas(event ? id('settings') : domSettings, val, 'all')
}

function initParams(data, settingsDom) {
	//

	const initInput = (dom, cat, base) => (settingsDom.querySelector('#' + dom).value = cat !== undefined ? cat : base)
	const initCheckbox = (dom, cat) => (settingsDom.querySelector('#' + dom).checked = cat ? true : false)
	const isThereData = (cat, sub) => (data[cat] ? data[cat][sub] : undefined)

	function toggleClockOptions(dom, analog) {
		dom.classList.remove(analog ? 'digital' : 'analog')
		dom.classList.add(analog ? 'analog' : 'digital')
	}

	// 1.9.2 ==> 1.9.3 lang break fix
	if (data.searchbar_engine) data.searchbar_engine = data.searchbar_engine.replace('s_', '')

	// 1.10.0 custom background slideshow
	const whichFreq = data.background_type === 'custom' ? data.custom_every : isThereData('dynamic', 'every')
	const whichFreqDefault = data.background_type === 'custom' ? 'pause' : 'hour'

	initInput('cssEditor', data.css, '')
	initInput('i_row', data.linksrow, 8)
	initInput('i_type', data.background_type, 'dynamic')
	initInput('i_freq', whichFreq, whichFreqDefault)
	initInput('i_blur', data.background_blur, 15)
	initInput('i_bright', data.background_bright, 0.8)
	initInput('i_dark', data.dark, 'system')
	initInput('i_greeting', data.greeting, '')
	initInput('i_sbengine', data.searchbar_engine, 'google')
	initInput('i_clockface', isThereData('clock', 'face'), 'none')
	initInput('i_timezone', isThereData('clock', 'timezone'), 'auto')
	initInput('i_collection', isThereData('dynamic', 'collection'), '')
	initInput('i_ccode', isThereData('weather', 'ccode'), 'US')
	initInput('i_customfont', isThereData('font', 'family'), '')
	initInput('i_weight', isThereData('font', 'weight'), 400)
	initInput('i_size', isThereData('font', 'size'), 16)

	initCheckbox('i_showall', data.showall)
	initCheckbox('i_geol', isThereData('weather', 'location'))
	initCheckbox('i_units', isThereData('weather', 'unit') === 'imperial')
	initCheckbox('i_linknewtab', data.linknewtab)
	initCheckbox('i_sb', data.searchbar)
	initCheckbox('i_sbnewtab', !!data.searchbar_newtab)
	initCheckbox('i_usdate', data.usdate)
	initCheckbox('i_ampm', isThereData('clock', 'ampm'), false)
	initCheckbox('i_seconds', isThereData('clock', 'seconds'), false)
	initCheckbox('i_analog', isThereData('clock', 'analog'), false)

	// Links limit
	if (data.links && data.links.length === 20) quickLinks('maxControl', true)

	// Hide elems
	hideElem(null, settingsDom.querySelectorAll('#hideelem button'), null)

	// Font family default
	safeFont(settingsDom.querySelector('#i_customfont'))

	// Font weight
	if (data.font) modifyWeightOptions(data.font.availWeights)

	// Clock
	if (data.clock) toggleClockOptions(settingsDom.querySelector('#clockoptions'), data.clock.analog)

	// Input translation
	settingsDom.querySelector('#i_title').setAttribute('placeholder', tradThis('Name'))
	settingsDom.querySelector('#i_greeting').setAttribute('placeholder', tradThis('Name'))
	settingsDom.querySelector('#i_import').setAttribute('placeholder', tradThis('Import code'))
	settingsDom.querySelector('#i_export').setAttribute('placeholder', tradThis('Export code'))
	settingsDom.querySelector('#cssEditor').setAttribute('placeholder', tradThis('Type in your custom CSS'))

	//bg
	if (data.background_type === 'custom') {
		settingsDom.querySelector('#custom').style.display = 'block'
		localBackgrounds(null, true)
	} else {
		settingsDom.querySelector('#dynamic').style.display = 'block'
	}

	//weather settings
	if (data.weather && Object.keys(data.weather).length > 0) {
		const isGeolocation = data.weather.location.length > 0
		let cityName = data.weather.city ? data.weather.city : 'City'
		settingsDom.querySelector('#i_city').setAttribute('placeholder', cityName)
		settingsDom.querySelector('#i_city').value = cityName

		//clas(settingsDom.querySelector('#sett_city'), isGeolocation, 'hidden')
		settingsDom.querySelector('#i_geol').checked = isGeolocation
	} else {
		//clas(settingsDom.querySelector('#sett_city'), true, 'hidden')
		settingsDom.querySelector('#i_geol').checked = true
	}

	//searchbar display settings
	//clas(settingsDom.querySelector('#searchbar_options'), data.searchbar, 'shown')

	//searchbar display settings
	if (data.cssHeight) settingsDom.querySelector('#cssEditor').style.height = data.cssHeight + 'px'

	//langue
	settingsDom.querySelector('#i_lang').value = data.lang || 'en'

	//firefox export
	if (!navigator.userAgent.includes('Chrome')) {
		settingsDom.querySelector('#submitExport').style.display = 'none'
		settingsDom.querySelector('#i_export').style.width = '100%'
	}

	//
	// Events
	//

	const bgfile = settingsDom.querySelector('#i_bgfile')
	const fileContainer = settingsDom.querySelector('#i_fileContainer')

	// file input animation
	bgfile.addEventListener('dragenter', function () {
		fileContainer.classList.add('dragover')
	})

	bgfile.addEventListener('dragleave', function () {
		fileContainer.classList.remove('dragover')
	})

	bgfile.addEventListener('drop', function () {
		fileContainer.classList.remove('dragover')
	})

	//general

	settingsDom.querySelector('#i_showall').onchange = function () {
		showall(this.checked, true)
	}

	settingsDom.querySelector('#i_lang').onchange = function () {
		chrome.storage.sync.set({ lang: this.value })

		//session pour le weather
		sessionStorage.lang = this.value
		if (sessionStorage.lang) location.reload()
	}

	//quick links
	settingsDom.querySelector('#i_title').onkeyup = function (e) {
		if (e.code === 'Enter') quickLinks('input', e)
	}

	settingsDom.querySelector('#i_url').onkeyup = function (e) {
		if (e.code === 'Enter') quickLinks('input', e)
	}

	settingsDom.querySelector('#submitlink').onmouseup = function () {
		quickLinks('button', this)
	}

	settingsDom.querySelector('#i_linknewtab').onchange = function () {
		quickLinks('linknewtab', this)
	}

	//visuals
	settingsDom.querySelector('#i_type').onchange = function () {
		selectBackgroundType(this.value)
	}

	settingsDom.querySelector('#i_freq').onchange = function () {
		if (settingsDom.querySelector('#i_type').value === 'custom') chrome.storage.sync.set({ custom_every: this.value })
		else unsplash(null, { every: this.value })
	}

	settingsDom.querySelector('#i_collection').onchange = function () {
		unsplash(null, { collection: stringMaxSize(this.value, 128) })
		this.blur()
	}

	//custom bg

	settingsDom.querySelector('#i_bgfile').onchange = function () {
		localBackgrounds(null, null, this.files[0])
	}

	settingsDom.querySelector('#i_blur').oninput = function () {
		filter('blur', this.value)
		slowRange({ background_blur: parseFloat(this.value) })
	}

	settingsDom.querySelector('#i_bright').oninput = function () {
		filter('bright', this.value)
		slowRange({ background_bright: parseFloat(this.value) })
	}

	settingsDom.querySelector('#i_dark').onchange = function () {
		darkmode(this.value)
	}

	//Time and date

	settingsDom.querySelector('#i_analog').onchange = function () {
		clock({ analog: this.checked })
		toggleClockOptions(settingsDom.querySelector('#clockoptions'), this.checked)
	}

	settingsDom.querySelector('#i_seconds').onchange = function () {
		clock({ seconds: this.checked })
	}

	settingsDom.querySelector('#i_clockface').onchange = function () {
		clock({ face: this.value })
	}

	settingsDom.querySelector('#i_ampm').onchange = function () {
		clock({ ampm: this.checked })
	}

	settingsDom.querySelector('#i_timezone').onchange = function () {
		clock({ timezone: this.value })
	}

	settingsDom.querySelector('#i_greeting').onkeyup = function () {
		clock({ greeting: stringMaxSize(this.value, 32) })
	}

	settingsDom.querySelector('#i_usdate').onchange = function () {
		clock({ usdate: this.checked })
	}

	//weather

	settingsDom.querySelector('#i_city').onkeypress = function (e) {
		if (!stillActive && e.code === 'Enter') weather('city', this)
	}

	settingsDom.querySelector('#i_units').onchange = function () {
		if (!stillActive) weather('units', this)
	}

	settingsDom.querySelector('#i_geol').onchange = function () {
		if (!stillActive) weather('geol', this)
	}

	//searchbar
	settingsDom.querySelector('#i_sb').onchange = function () {
		settingsDom.querySelector('#searchbar_options').classList.toggle('shown')
		if (!stillActive) searchbar('searchbar', this)
		slow(this)
	}

	settingsDom.querySelector('#i_sbengine').onchange = function () {
		searchbar('engine', this)
	}

	settingsDom.querySelector('#i_sbnewtab').onchange = function () {
		searchbar('newtab', this)
	}

	//settings

	settingsDom.querySelector('#submitReset').onclick = function () {
		importExport('reset')
	}

	settingsDom.querySelector('#submitExport').onclick = function () {
		importExport('exp', true)
	}

	settingsDom.querySelector('#submitImport').onclick = function () {
		importExport('imp', true)
	}

	settingsDom.querySelector('#i_import').onkeypress = function (e) {
		e.code === 'Enter' ? importExport('imp', true) : ''
	}

	settingsDom.querySelector('#i_export').onfocus = function () {
		importExport('exp')
	}

	settingsDom.querySelector('#i_customfont').onchange = function () {
		customFont(null, { family: this.value })
	}

	settingsDom.querySelector('#i_weight').oninput = function () {
		customFont(null, { weight: this.value })
	}

	settingsDom.querySelector('#i_size').oninput = function () {
		customSize(null, this.value)
	}

	settingsDom.querySelector('#i_row').oninput = function () {
		linksrow(null, this.value)
	}

	settingsDom
		.querySelector('#hideelem')
		.querySelectorAll('button')
		.forEach((elem) => {
			elem.onmouseup = function () {
				elem.classList.toggle('clicked')
				hideElem(null, null, this)
			}
		})

	const cssEditor = settingsDom.querySelector('#cssEditor')

	cssEditor.addEventListener('keydown', function (e) {
		if (e.code === 'Tab') e.preventDefault()
	})

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

function importExport(select, isEvent) {
	//
	function importation() {
		//
		if (isEvent) {
			const dom = id('i_import')
			const placeholder = (str) => dom.setAttribute('placeholder', tradThis(str))

			if (dom.value.length > 0) {
				try {
					// Filtered imports from input
					const imported = filterImports(JSON.parse(dom.value))

					// Load all sync & dynamicCache
					chrome.storage.sync.get(null, (data) => {
						chrome.storage.local.get('dynamicCache', (local) => {
							//
							// Remove user collection cache if collection change
							if (data.dynamic && imported.dynamic) {
								if (data.dynamic.collection !== imported.dynamic.collection) {
									local.dynamicCache.user = []
								}
							}

							// Mutate sync
							data = { ...data, ...imported }

							// Save sync & local
							chrome.storage.sync.set(data, () => {
								chrome.storage.local.set(local, () => location.reload())
							})
						})
					})
				} catch (e) {
					dom.value = ''
					placeholder('Error in import code')
					setTimeout(() => placeholder('Import code'), 2000)
				}
			}
		}
	}

	function exportation() {
		const input = id('i_export')
		const isOnChrome = navigator.userAgent.includes('Chrome')

		chrome.storage.sync.get(null, (data) => {
			//
			if (data.weather && data.weather.lastCall) delete data.weather.lastCall
			if (data.weather && data.weather.forecastLastCall) delete data.weather.forecastLastCall

			input.value = JSON.stringify(data)

			if (isEvent) {
				input.select()

				//doesn't work on firefox for security reason
				//don't want to add permissions just for this
				if (isOnChrome) {
					document.execCommand('copy')
					id('submitExport').textContent = tradThis('Copied')
				}
			}
		})
	}

	function anihilation() {
		let input = id('submitReset')

		if (!input.hasAttribute('sure')) {
			input.textContent = tradThis('Click again to confirm')
			input.setAttribute('sure', '')
		} else {
			deleteBrowserStorage()
			setTimeout(function () {
				location.reload()
			}, 20)
		}
	}

	switch (select) {
		case 'exp':
			exportation()
			break
		case 'imp':
			importation()
			break
		case 'reset':
			anihilation()
			break
	}
}

function showSettings(isMouseDown) {
	function display() {
		const edit = id('edit_linkContainer')
		const settings = id('settings')
		const isShown = has(settings, 'shown')

		clas(settings, false, 'init')
		clas(settings, !isShown, 'shown')
		clas(domshowsettings, !isShown, 'shown')

		clas(dominterface, !isShown, 'pushed')
		clas(edit, !isShown, 'pushed')
	}

	function functions(settingsDom) {
		chrome.storage.sync.get(null, (data) => {
			if (data.lang !== 'en') {
				const trns = settingsDom.querySelectorAll('.trn')
				const changeText = (dom, str) => (dict[str] ? (dom.textContent = dict[str][data.lang]) : '')
				trns.forEach((trn) => changeText(trn, trn.textContent))
			}

			initParams(data, settingsDom)
			showall(data.showall, false, settingsDom)
			signature(settingsDom)
			//
			//customFont(null, { autocomplete: true })

			document.body.appendChild(settingsDom)
		})
	}

	function init() {
		function settingsCreator(html) {
			const dom = document.createElement('div')
			dom.id = 'settings'
			dom.innerHTML = html
			dom.setAttribute('class', 'init')
			functions(dom)
		}

		switch (window.location.protocol) {
			case 'file:': {
				const xhr = new XMLHttpRequest()
				xhr.open('POST', 'settings.html', true)
				xhr.onreadystatechange = (e) => (e.target.readyState === 4 ? settingsCreator(e.target.responseText) : '')
				xhr.send()
				break
			}

			case 'http:':
			case 'https:':
			case 'chrome-extension:':
			case 'moz-extension:': {
				fetch('settings.html').then((resp) => resp.text().then(settingsCreator))
			}
		}
	}

	if (!id('settings') && isMouseDown) init()
	else if (!isMouseDown) display()
}

function showInterface(e) {
	//cherche le parent du click jusqu'a trouver linkblocks
	//seulement si click droit, quitter la fct
	let parent = e.target
	const edit = id('edit_linkContainer')
	const settings = id('settings')

	while (parent !== null) {
		parent = parent.parentElement
		if (parent && parent.id === 'linkblocks' && e.which === 3) return false
	}

	//close edit container on interface click
	if (has(edit, 'shown')) {
		clas(edit, false, 'shown')
		domlinkblocks.querySelectorAll('.l_icon_wrap').forEach((e) => clas(e, false, 'selected'))
	}

	if (has(settings, 'shown')) {
		clas(settings, false, 'shown')
		clas(domshowsettings, false, 'shown')
		clas(dominterface, false, 'pushed')

		if (edit.classList.contains('pushed')) clas(edit, false, 'pushed')
	}
}

//
// Onload
//

//si la langue a été changé
if (sessionStorage.lang) {
	setTimeout(() => showSettings(), 20)
}

domshowsettings.onmousedown = () => showSettings(true)
domshowsettings.onmouseup = () => showSettings(false)
dominterface.onclick = (e) => showInterface(e)

document.onkeydown = (e) => {
	//focus la searchbar si elle existe et les settings sont fermé
	const searchbarOn = has(id('sb_container'), 'shown') === true
	const noSettings = has(id('settings'), 'shown') === false
	const noEdit = has(id('edit_linkContainer'), 'shown') === false

	if (e.code !== 'Escape' && searchbarOn && noSettings && noEdit) domsearchbar.focus()
}

document.onkeyup = (e) => {
	if (e.code === 'Escape') showSettings()
}
