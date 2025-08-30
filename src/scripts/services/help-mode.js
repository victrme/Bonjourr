let hasExportedSettings = false

globalThis.window.addEventListener('load', function () {
	document.body.addEventListener('keydown', toggleHelpMode)

	globalThis.setTimeout(() => {
		displayHelpModePrompt()
	}, 50)
})

function displayHelpModePrompt() {
	if (!document.body.className.includes('init')) {
		return
	}

	const template = document.getElementById('help-mode-prompt-template')
	const fragment = template.content.cloneNode(true)
	const container = fragment.querySelector('#help-mode-prompt')
	document.documentElement.prepend(container)

	let helpModeBtn = document.getElementById('open-help-mode')
	helpModeBtn.addEventListener('click', toggleHelpMode)

	this.document.querySelector('.export').addEventListener("click", downloadSettings)
}

function downloadSettings() {
	if (chrome?.storage) {
		chrome.storage.sync.get(null, (items) => {
			const json = JSON.stringify(items, null, 2);
			const blob = new Blob([json], { type: "application/json" });
			const url = URL.createObjectURL(blob);

			const a = document.createElement("a");
			a.href = url;
			a.download = "bonjourr-settings.json";
			a.click();

			URL.revokeObjectURL(url); // clean up
		})

		if (document.querySelector('.reset')) {
			document.querySelector('.reset').disabled = false
		}

		hasExportedSettings = true
	} else {

	}
}

function resetOnce() {
	let resetBtn = document.querySelector('.reset')
	resetBtn.title = "You're about to reset Bonjourr to its default configuration."
	resetBtn.querySelector('span').textContent = "Are you sure?"
	resetBtn.classList.add('danger')
	resetBtn.addEventListener("click", resetApply)
}

function resetApply() {
	alert('goodbye')
}

/**
 * @param {KeyboardEvent | MouseEvent} event
 * @returns {void}
 */
function toggleHelpMode(event) {
	if (event.type === "keydown") {
		const { key, shiftKey, ctrlKey } = event
		const questionMarkKey = key === ',' || key === '/' || key === '?'
		const ctrlShiftQuestion = ctrlKey && shiftKey && questionMarkKey

		if (!ctrlShiftQuestion) {
			return
		}
	} else if (event.type !== 'click') {
		return
	} 

	if (!document.getElementById('help-mode')) {
		createHelpModeDisplay()
	}

	if (document.body.style.display === 'none') {
		document.querySelector('#help-mode')?.setAttribute('style', 'display: none')
		document.querySelector('body')?.removeAttribute('style')
	} else {
		document.querySelector('#help-mode')?.removeAttribute('style')
		document.querySelector('body')?.setAttribute('style', 'display: none')
	}
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
	this.document.querySelector('.export').addEventListener("click", downloadSettings)
	resetBtn.addEventListener("click", resetOnce)
	
	if (hasExportedSettings) {
		resetBtn.disabled = false
	}

	function setStatus(statusID, resp) {
		const endTimer = Math.round(globalThis.performance.now() - startTimer)
		const text = resp.ok ? ` · ${endTimer}ms` : resp.status
		container.querySelector(`#${statusID}`).textContent = text
		container.querySelector(`li:has(#${statusID})`).classList.add(resp.ok ? 'statusUp' : 'statusDown')
	}

	// Statuses

	fetch('https://bonjourr.fr/').then((resp) => {
		setStatus('help-status-website', resp)
	})

	fetch('https://weather.bonjourr.fr/').then((resp) => {
		setStatus('help-status-weather', resp)
	})
	fetch('https://services.bonjourr.fr').then((resp) => {
		setStatus('help-status-services', resp)
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
	if (chrome?.storage) {
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
