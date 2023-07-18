import storage from '../storage'

export default async function errorMessage(error: unknown) {
	const dominterface = document.getElementById('interface')
	console.error(error)

	function reduceErrorStack() {
		try {
			const stack = (error as Error).stack || ''
			const lines = stack.split('\n')

			lines.forEach((line, i) => {
				const start = line.indexOf(' (')
				const end = line.indexOf('main.js')

				if (start > 0 && end > 0) {
					lines[i] = line.replace(line.substring(start + 1, end), '').replace(')', '')
				}
			})

			return lines.join('\n')
		} catch (error) {
			return 'No error stack found'
		}
	}

	function displayMessage(dataStr: string) {
		const warning = document.createElement('div')
		const title = document.createElement('h1')
		const subtitle = document.createElement('p')
		const errorpre = document.createElement('pre')
		const storagetext = document.createElement('textarea')
		const explain = document.createElement('p')
		const resetButton = document.createElement('button')
		const closeError = document.createElement('button')
		const buttonWrap = document.createElement('div')

		title.textContent = `Oops Bonjourr failed 😖`
		subtitle.textContent = `Copy the error and your settings below and contact us !`
		explain.textContent =
			'Sharing your settings with us helps a lot in debugging. You can also reset Bonjourr, or close this window for now if you think it is a false alert.'

		explain.className = 'error-explain'

		errorpre.textContent = reduceErrorStack()

		storagetext.textContent = dataStr
		storagetext.setAttribute('spellcheck', 'false')

		resetButton.textContent = 'Reset Bonjourr'
		resetButton.addEventListener('click', () => {
			warning.style.opacity = '0'
			storage.clear()
			localStorage.clear()
		})

		closeError.className = 'error-buttons-close'
		closeError.textContent = 'Close this window'
		closeError.addEventListener('click', () => {
			sessionStorage.errorMessage = 'removed'
			warning.style.opacity = '0'
			setTimeout(() => (warning.style.display = 'none'), 400)
		})

		buttonWrap.className = 'error-buttons'
		buttonWrap.appendChild(resetButton)
		buttonWrap.appendChild(closeError)

		warning.appendChild(title)
		warning.appendChild(subtitle)
		warning.appendChild(errorpre)
		warning.appendChild(storagetext)
		warning.appendChild(explain)
		warning.appendChild(buttonWrap)

		warning.id = 'error'
		document.body.prepend(warning)

		dominterface ? (dominterface.style.opacity = '1') : ''

		setTimeout(() => (warning.style.opacity = '1'), 20)
	}

	if (sessionStorage.errorMessage === 'removed' && dominterface) {
		dominterface.style.opacity = '1'
		return false
	}

	try {
		const data = await storage.get()
		document.querySelector('#error')?.remove()
		displayMessage(JSON.stringify(data, null, 4))
	} catch (e) {
		displayMessage('')
	}
}
