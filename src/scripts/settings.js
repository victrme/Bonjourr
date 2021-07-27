function signature() {
	let v = "<a href='https://victr.me/'>Victor Azevedo</a>"
	let t = "<a href='https://tahoe.be'>Tahoe Beetschen</a>"
	let e = document.createElement('span')

	e.innerHTML = Math.random() > 0.5 ? ` ${v} & ${t}` : ` ${t} & ${v}`
	id('rand').appendChild(e)
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
			clas(id('credit'), false, 'shown')
		}
		if (cat === 'dynamic') {
			id('background_overlay').style.opacity = '0'
			setTimeout(() => unsplash(data), BonjourrAnimTime)
		}

		// Setting frequence
		const c_every = data.custom_every || 'pause'
		const d_every = data.dynamic.every || 'hour'

		id('i_freq').value = cat === 'custom' ? c_every : d_every
	})

	chrome.storage.sync.set({ background_type: cat })
}

function showall(val, event) {
	if (event) chrome.storage.sync.set({ showall: val })
	clas(id('settings'), val, 'all')
}

function toggleClockOptions(analog) {
	const optionsWrapper = id('clockoptions')
	if (analog) {
		optionsWrapper.classList.remove('digital')
		optionsWrapper.classList.add('analog')
	} else {
		optionsWrapper.classList.remove('analog')
		optionsWrapper.classList.add('digital')
	}
}

function settingsEvents() {
	const bgfile = document.getElementById('i_bgfile')
	const fileContainer = document.getElementById('i_fileContainer')

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

	id('i_showall').onchange = function () {
		showall(this.checked, true)
	}

	id('i_lang').onchange = function () {
		chrome.storage.sync.set({ lang: this.value })

		//session pour le weather
		sessionStorage.lang = this.value
		if (sessionStorage.lang) location.reload()
	}

	//quick links
	id('i_title').onkeyup = function (e) {
		if (e.code === 'Enter') quickLinks('input', e)
	}

	id('i_url').onkeyup = function (e) {
		if (e.code === 'Enter') quickLinks('input', e)
	}

	id('submitlink').onmouseup = function () {
		quickLinks('button', this)
	}

	id('i_linknewtab').onchange = function () {
		quickLinks('linknewtab', this)
	}

	//visuals
	id('i_type').onchange = function () {
		selectBackgroundType(this.value)
	}

	id('i_freq').onchange = function () {
		if (id('i_type').value === 'custom') chrome.storage.sync.set({ custom_every: this.value })
		else unsplash(null, { every: this.value })
	}

	id('i_collection').onchange = function () {
		unsplash(null, { collection: stringMaxSize(this.value, 128) })
		this.blur()
	}

	//custom bg

	id('i_bgfile').onchange = function () {
		localBackgrounds(null, null, this.files[0])
	}

	id('i_blur').oninput = function () {
		filter('blur', this.value)
		slowRange({ background_blur: parseFloat(this.value) })
	}

	id('i_bright').oninput = function () {
		filter('bright', this.value)
		slowRange({ background_bright: parseFloat(this.value) })
	}

	id('i_dark').onchange = function () {
		darkmode(this.value)
	}

	id('i_greeting').onkeyup = function () {
		greetings(stringMaxSize(this.value, 32), true)
	}

	//Time and date

	id('i_analog').onchange = function () {
		newClock({ param: 'analog', value: this.checked })
		toggleClockOptions(this.checked)
	}

	id('i_seconds').onchange = function () {
		newClock({ param: 'seconds', value: this.checked })
	}

	id('i_clockface').onchange = function () {
		newClock({ param: 'face', value: this.value })
	}

	id('i_ampm').onchange = function () {
		newClock({ param: 'ampm', value: this.checked })
	}

	id('i_timezone').onchange = function () {
		newClock({ param: 'timezone', value: this.value })
	}

	id('i_usdate').onchange = function () {
		date(true, this.checked)
	}

	//weather

	id('i_city').onkeypress = function (e) {
		if (!stillActive && e.code === 'Enter') weather('city', this)
	}

	id('i_units').onchange = function () {
		if (!stillActive) weather('units', this)
	}

	id('i_geol').onchange = function () {
		if (!stillActive) weather('geol', this)
	}

	//searchbar
	id('i_sb').onchange = function () {
		id('searchbar_options').classList.toggle('shown')
		if (!stillActive) searchbar('searchbar', this)
		slow(this)
	}

	id('i_sbengine').onchange = function () {
		searchbar('engine', this)
	}

	id('i_sbnewtab').onchange = function () {
		searchbar('newtab', this)
	}

	//settings

	id('submitReset').onclick = function () {
		importExport('reset')
	}

	id('submitExport').onclick = function () {
		importExport('exp', true)
	}

	id('submitImport').onclick = function () {
		importExport('imp', true)
	}

	id('i_import').onkeypress = function (e) {
		if (e.code === 'Enter') importExport('imp', true)
	}

	id('i_export').onfocus = function () {
		importExport('exp')
	}

	id('i_customfont').onchange = function () {
		customFont(null, { family: this.value })
	}

	id('i_weight').oninput = function () {
		customFont(null, { weight: this.value })
	}

	id('i_size').oninput = function () {
		customSize(null, this.value)
	}

	id('i_row').oninput = function () {
		linksrow(null, this.value)
	}

	id('hideelem')
		.querySelectorAll('button')
		.forEach((elem) => {
			elem.onmouseup = function () {
				elem.classList.toggle('clicked')
				hideElem(null, null, this)
			}
		})

	const cssEditor = id('cssEditor')
	const cssResize = new ResizeObserver((e) => customCss(null, { is: 'resize', val: e[0].contentRect.height }))

	cssEditor.addEventListener('keydown', function (e) {
		if (e.code === 'Tab') e.preventDefault()
	})

	cssEditor.addEventListener('keyup', function (e) {
		customCss(null, { is: 'styling', val: e.target.value })
	})

	cssResize.observe(cssEditor)
}

function initParams(data) {
	const initInput = (dom, cat, base) => (id(dom).value = cat !== undefined ? cat : base)
	const initCheckbox = (dom, cat) => (id(dom).checked = cat ? true : false)
	const isThereData = (cat, sub) => (data[cat] ? data[cat][sub] : undefined)

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
	hideElem(null, document.querySelectorAll('#hideelem button'), null)

	// Font family default
	safeFont(id('i_customfont'))

	// Font weight
	if (data.font) modifyWeightOptions(data.font.availWeights)

	// Clock
	if (data.clock) toggleClockOptions(data.clock.analog)

	// Input translation
	id('i_title').setAttribute('placeholder', tradThis('Name'))
	id('i_greeting').setAttribute('placeholder', tradThis('Name'))
	id('i_import').setAttribute('placeholder', tradThis('Import code'))
	id('i_export').setAttribute('placeholder', tradThis('Export code'))
	id('cssEditor').setAttribute('placeholder', tradThis('Type in your custom CSS'))

	//bg
	if (data.background_type === 'custom') {
		id('custom').style.display = 'block'
		localBackgrounds(null, true)
	} else {
		id('dynamic').style.display = 'block'
	}

	//weather settings
	if (data.weather && Object.keys(data).length > 0) {
		let cityPlaceholder = data.weather.city ? data.weather.city : 'City'
		id('i_city').setAttribute('placeholder', cityPlaceholder)

		clas(id('sett_city'), data.weather.location, 'hidden')
	} else {
		clas(id('sett_city'), true, 'hidden')
		id('i_geol').checked = true
	}

	//searchbar display settings
	clas(id('searchbar_options'), data.searchbar, 'shown')

	//searchbar display settings
	if (data.cssHeight) id('cssEditor').style.height = data.cssHeight + 'px'

	//langue
	id('i_lang').value = data.lang || 'en'

	//firefox export
	if (!navigator.userAgent.includes('Chrome')) {
		id('submitExport').style.display = 'none'
		id('i_export').style.width = '100%'
	}
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

function showSettings() {
	function display() {
		const edit = id('edit_linkContainer')
		const settings = id('settings')
		const isShown = has(settings, 'shown')

		clas(settings, !isShown, 'shown')
		clas(domshowsettings, !isShown, 'shown')
		clas(dominterface, !isShown, 'pushed')
		clas(edit, !isShown, 'pushed')
	}

	function functions() {
		chrome.storage.sync.get(null, (data) => {
			initParams(data)
			traduction(true, data.lang)

			setTimeout(() => {
				display()
				showall(data.showall)
				settingsEvents()
				signature()

				setTimeout(() => {
					clas(id('settings'), false, 'init')
					customFont(null, { autocomplete: true })
				}, 100)
			}, 10)
		})
	}

	function init() {
		function settingsCreator(html) {
			const dom = document.createElement('div')
			dom.id = 'settings'
			dom.innerHTML = html
			dom.setAttribute('class', 'init')
			document.body.appendChild(dom)

			functions()
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
			case 'chrome-extension:': {
				fetch('settings.html').then((resp) => resp.text().then(settingsCreator))
			}
		}
	}

	if (!id('settings')) init()
	else display()
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

domshowsettings.onclick = () => showSettings()
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
