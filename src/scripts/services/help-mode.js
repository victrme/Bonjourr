globalThis.window.addEventListener('load', function () {
	// document.body.addEventListener('keydown', toggleHelpMode)

	globalThis.setTimeout(() => {
		displayHelpModePrompt()
	}, 5000)
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
}

/**
 * @param {KeyboardEvent} event
 * @returns {void}
 */
function toggleHelpMode(event) {
	// const { key, shiftKey, ctrlKey } = event
	// const questionMarkKey = key === ',' || key === '/' || key === '?'
	// const ctrlShiftQuestion = ctrlKey && shiftKey && questionMarkKey

	// if (!ctrlShiftQuestion) {
	// 	return
	// }

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
