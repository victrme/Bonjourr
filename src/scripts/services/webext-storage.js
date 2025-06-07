globalThis.startupBookmarks
globalThis.startupTopsites
globalThis.startupStorage = {
	sync: undefined,
	local: undefined,
}

globalThis.window.onload = () => {
	document.body.addEventListener('keydown', toggleHelpMode)
}

chrome.storage.sync.get().then((data) => {
	globalThis.startupStorage.sync = data

	if (globalThis.pageReady) {
		document.dispatchEvent(
			new CustomEvent('webextstorage', { detail: 'sync' }),
		)
	}
})

chrome.storage.local.get().then((data) => {
	globalThis.startupStorage.local = data

	if (globalThis.pageReady) {
		document.dispatchEvent(
			new CustomEvent('webextstorage', { detail: 'local' }),
		)
	}
})

chrome.bookmarks?.getTree().then((data) => {
	globalThis.startupBookmarks = data
})

chrome.topSites?.get().then((data) => {
	globalThis.startupTopsites = data
})

function toggleHelpMode(event) {
	const { key, shiftKey, ctrlKey } = event
	const questionMarkKey = key === ',' || key === '/' || key === '?'
	const ctrlShiftQuestion = ctrlKey && shiftKey && questionMarkKey

	if (!ctrlShiftQuestion) {
		return
	}

	document.body.insertAdjacentHTML('beforebegin', `<h1>Bonjourr help mode</h1>`)

	document.body.insertAdjacentHTML(
		'beforebegin',
		`
        <h2>Links & contacts</h2>
        <ul>
            <li>Documentation: <a href="https://bonjourr.fr/docs">bonjour.fr/docs</a></li>
            <li>By email: bonjourr.app@protonmail.com</li>
            <li>On telegram: @BonjourrStartpage</li>
        </ul>
	`,
	)

	document.body.insertAdjacentHTML('beforebegin', '<h2>LocalStorage</h2>')

	for (const [key, val] of Object.entries(localStorage)) {
		document.body.insertAdjacentHTML(
			'beforebegin',
			`${key}: ${val}</textarea>`,
		)
	}

	if (globalThis.chrome) {
		document.body.insertAdjacentHTML('beforebegin', `<h2>Extension storage</h2>`)
		chrome.storage.sync.get().then((data) => {
			document.body.insertAdjacentHTML('beforebegin', `<h3>Sync</h3>`)
			document.body.insertAdjacentHTML('beforebegin', `<pre>${JSON.stringify(data ?? '{}')}</pre>`)
		})

		chrome.storage.local.get().then((data) => {
			document.body.insertAdjacentHTML('beforebegin', `<h3>Local</h3>`)
			document.body.insertAdjacentHTML('beforebegin', `<pre>${JSON.stringify(data ?? '{}')}</pre>`)
		})
	}

	document.body.insertAdjacentHTML('beforebegin', `<h2>Status</h2>`)

	fetch('https://bonjourr.fr/').then((resp) => {
		document.body.insertAdjacentHTML('beforebegin', `<p>Website: ${resp.ok ? 'OK' : resp.status}`)
	})

	fetch('https://weather.bonjourr.fr/').then((resp) => {
		document.body.insertAdjacentHTML('beforebegin', `<p>Weather: ${resp.ok ? 'OK' : resp.status}`)
	})

	fetch('https://services.bonjourr.fr').then((resp) => {
		document.body.insertAdjacentHTML('beforebegin', `<p>Services: ${resp.ok ? 'OK' : resp.status}`)
	})

	if (document.body.style.display === 'none') {
		document.body.style.removeProperty('display')
	} else {
		document.body.style.display = 'none'
	}
}
