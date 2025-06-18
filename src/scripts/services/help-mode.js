globalThis.window.addEventListener('load', function () {
	document.body.addEventListener('keydown', toggleHelpMode)

	globalThis.setTimeout(() => {
		displayHelpModePrompt()
	}, 2000)
})

function displayHelpModePrompt() {
	if (!document.body.className.includes('init')) {
		return
	}

	const template = document.getElementById('help-mode-prompt-template')
	const fragment = template.content.cloneNode(true)
	const container = fragment.querySelector('#help-mode-prompt')
	document.documentElement.prepend(container)
}

/**
 * @param {KeyboardEvent} event
 * @returns {void}
 */
function toggleHelpMode(event) {
	const { key, shiftKey, ctrlKey } = event
	const questionMarkKey = key === ',' || key === '/' || key === '?'
	const ctrlShiftQuestion = ctrlKey && shiftKey && questionMarkKey

	if (!ctrlShiftQuestion) {
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

	// Statuses

	fetch('https://bonjourr.fr/').then((resp) => {
		const endTimer = Math.round(globalThis.performance.now() - startTimer)
		const text = resp.ok ? `OK - ${endTimer}ms` : resp.status
		container.querySelector('#help-status-website').textContent = text
	})
	fetch('https://weather.bonjourr.fr/').then((resp) => {
		const endTimer = Math.round(globalThis.performance.now() - startTimer)
		const text = resp.ok ? `OK - ${endTimer}ms` : resp.status
		container.querySelector('#help-status-weather').textContent = text
	})
	fetch('https://services.bonjourr.fr').then((resp) => {
		const endTimer = Math.round(globalThis.performance.now() - startTimer)
		const text = resp.ok ? `OK - ${endTimer}ms` : resp.status
		container.querySelector('#help-status-services').textContent = text
	})

	// LocalStorage

	for (const [key, val] of Object.entries(localStorage)) {
		const li = document.createElement('li')
		const p = document.createElement('p')
		const textarea = document.createElement('textarea')

		p.textContent = key
		textarea.value = val

		li.append(p, textarea)
		container.querySelector('#help-localstorage')?.append(li)
	}

	// Chrome storage

	if (chrome?.storage) {
		chrome.storage.sync.get().then((data) => {
			container.querySelector('#help-storage-sync').value = JSON.stringify(data, undefined, 2)
		})

		chrome.storage.local.get().then((data) => {
			container.querySelector('#help-storage-local').value = JSON.stringify(data, undefined, 2)
		})
	}
}
