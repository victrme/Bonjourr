import { storage } from '../storage'
import { $, deleteBrowserStorage } from '../utils'

export default function errorMessage(error: unknown) {
	const dominterface = $('interface')
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
		const storage = document.createElement('textarea')
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

		storage.textContent = dataStr
		storage.setAttribute('spellcheck', 'false')

		resetButton.textContent = 'Reset Bonjourr'
		resetButton.addEventListener('click', () => {
			warning.style.opacity = '0'
			deleteBrowserStorage()
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
		warning.appendChild(storage)
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
	} else {
		storage.sync.get(null, (data) => {
			try {
				document.querySelector('#error')?.remove()
				displayMessage(JSON.stringify(data, null, 4))
			} catch (e) {
				displayMessage('')
			}
		})
	}
}
