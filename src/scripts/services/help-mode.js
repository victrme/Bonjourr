let hasExportedSettings = false
let helpModeShown = false

globalThis.window.addEventListener('load', function () {
	// if Bonjourr hasn't loaded after 5s, shows prompt
	globalThis.setTimeout(() => {
		displayHelpModePrompt()
	}, 5000)

	document.addEventListener('keydown', function (event) {
		// help mode ctrl + shift + ? hotkey
		const { key, shiftKey, ctrlKey, metaKey } = event
		const questionMarkKey = key === ',' || key === '/' || key === '?'
		const helpHotkey = (ctrlKey || metaKey) && shiftKey && questionMarkKey

		if (helpHotkey) {
			toggleHelpMode()
		}

		// when help mode is open, escape to quit
		if (key === 'Escape' && helpModeShown) {
			toggleHelpMode(false)
		}
	})
})

function displayHelpModePrompt() {
	if (!document.body.className.includes('init')) {
		return
	}

	const template = document.getElementById('help-mode-prompt-template')
	const fragment = template.content.cloneNode(true)
	const container = fragment.querySelector('#help-mode-prompt')
	document.documentElement.prepend(container)

	document.getElementById('open-help-mode')?.addEventListener('click', () => toggleHelpMode(true))

	document.querySelector('.export')?.addEventListener('click', downloadSettings)
}

function exportToJsonFile(json) {
	const blob = new Blob([json], { type: 'application/json' })
	const url = URL.createObjectURL(blob)

	const a = document.createElement('a')
	a.href = url
	a.download = `bonjourr-${new Date().toLocaleString()}.json`
	a.click()

	URL.revokeObjectURL(url) // clean up

	if (document.querySelector('.reset')) {
		document.querySelector('.reset').disabled = false
	}
	hasExportedSettings = true
}

async function downloadSettings() {
	exportToJsonFile(await getDataAsString())
}

/**
 * @returns Promise<string>
 */
async function getDataAsString() {
	if (typeof chrome !== 'undefined' && chrome?.storage) {
		return JSON.stringify(await chrome.storage.sync.get(), null, 2)
	}

	return localStorage.bonjourr ?? ''
}

// when reset button is clicked once, asks for confirmation
function resetOnce() {
	const resetBtn = document.querySelector('#help-mode .reset')
	const resetBtnSpan = resetBtn.querySelector('span')

	resetBtn.title = "You're about to reset Bonjourr to its default configuration."
	resetBtn.classList.add('danger')
	resetBtnSpan.textContent = 'Are you sure?'

	resetBtn.addEventListener('click', resetApply)
}

async function resetApply() {
	// const archiveData = btoa(encodeURI(await getDataAsString()))
	const archiveData = await getDataAsString()
	const archiveName = `bonjourr-archive-${new Date().toLocaleString()}`

	// Reset

	if (chrome?.storage) {
		chrome.storage.sync.clear()
		chrome.storage.local.clear()
	}
	if (localStorage) {
		Object.keys(localStorage).forEach((key) => {
			if (key.startsWith('bonjourr-archive-') === false) {
				localStorage.removeItem(key)
			}
		})
	}

	// Apply archive back to localStorage

	localStorage[archiveName] = archiveData

	// Update button

	const resetBtn = document.querySelector('#help-mode .reset')
	const resetBtnSpan = resetBtn.querySelector('span')

	resetBtn.setAttribute('disabled', '')
	resetBtnSpan.textContent = 'Waiting for reload'

	// Reload to all back defaults

	setTimeout(() => {
		globalThis.window.location.reload()
	}, 1000)
}

/**
 * @param {boolean} on
 * @returns {void}
 */
function toggleHelpMode(on = !helpModeShown) {
	// first time
	if (!document.getElementById('help-mode')) {
		createHelpModeDisplay()
	}

	if (on) {
		// not using display: none, otherwise it disables events
		document.querySelector('body')?.setAttribute('style', 'position: fixed; visibility: hidden')
		document.querySelector('#help-mode')?.classList.add('shown')
	} else {
		document.querySelector('body')?.removeAttribute('style')
		document.querySelector('#help-mode')?.classList.remove('shown')
	}

	helpModeShown = !helpModeShown
}

/**
 * @returns {void}
 */
function createHelpModeDisplay() {
	const template = document.getElementById('help-mode-template')
	const fragment = template.content.cloneNode(true)
	const container = fragment.querySelector('#help-mode')
	const startTimer = globalThis.performance.now()

	document.documentElement.prepend(container)

	const resetBtn = this.document.querySelector('.reset')
	this.document.querySelector('.export').addEventListener('click', downloadSettings)
	resetBtn.addEventListener('click', resetOnce)

	if (hasExportedSettings) {
		resetBtn.disabled = false
	}

	function setServerStatus(statusID, resp) {
		const endTimer = Math.round(globalThis.performance.now() - startTimer)
		const text = resp.ok ? ` · ${endTimer}ms` : resp.status
		container.querySelector(`#${statusID}`).textContent = text
		container.querySelector(`li:has(#${statusID})`).classList.add(resp.ok ? 'statusUp' : 'statusDown')
	}

	// Server statuses
	fetch('https://bonjourr.fr/').then((resp) => {
		setServerStatus('help-status-website', resp)
	})
	fetch('https://weather.bonjourr.fr/').then((resp) => {
		setServerStatus('help-status-weather', resp)
	})
	fetch('https://services.bonjourr.fr').then((resp) => {
		setServerStatus('help-status-services', resp)
	})

	// LocalStorage
	if (Object.entries(localStorage).length !== 0) {
		for (const [key, val] of Object.entries(localStorage)) {
			if (val === 'undefined' || val === '' || val === '{}' || val === '0') {
				continue
			}

			const li = document.createElement('li')
			const p = document.createElement('p')
			const pre = document.createElement('pre')

			p.textContent = key
			pre.textContent = val

			li.append(p, pre)
			container.querySelector('#help-localstorage')?.append(li)
		}

		container.querySelector('#localstorage-container')?.classList.remove('hidden')
	}

	// Chrome storage
	if (typeof chrome !== 'undefined' && chrome?.storage) {
		chrome.storage.sync.get().then((data) => {
			container.querySelector('#help-storage-sync').textContent = JSON.stringify(data, undefined, 2)
			container.querySelector('#syncstorage-container')?.classList.remove('hidden')
		})

		chrome.storage.local.get().then((data) => {
			container.querySelector('#help-storage-local').textContent = JSON.stringify(data, undefined, 2)
			container.querySelector('#browserstorage-container')?.classList.remove('hidden')
		})
	}
}
