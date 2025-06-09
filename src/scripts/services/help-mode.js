globalThis.window.addEventListener('load', function () {
	document.body.addEventListener('keydown', toggleHelpMode)
})

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
		document.body.style.removeProperty('display')
	} else {
		document.body.style.display = 'none'
	}
}

/**
 * @returns {void}
 */
function createHelpModeDisplay() {
	const template = document.getElementById('help-mode-template')
	const fragment = template.content.cloneNode(true)
	const container = fragment.querySelector('#help-mode')

	document.documentElement.prepend(container)

	// Statuses

	fetch('https://bonjourr.fr/').then((resp) => {
		container.querySelector('#help-status-website').textContent = resp.ok ? 'OK' : resp.status
	})
	fetch('https://weather.bonjourr.fr/').then((resp) => {
		container.querySelector('#help-status-weather').textContent = resp.ok ? 'OK' : resp.status
	})
	fetch('https://services.bonjourr.fr').then((resp) => {
		container.querySelector('#help-status-services').textContent = resp.ok ? 'OK' : resp.status
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
