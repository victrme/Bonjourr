import onSettingsLoad from './onsettingsload'

// <form class="network-form">
//	...
// 	<button type="submit">
// 		<span>✓</span>
//		<i></i>
// 	</button>
// </form>

export default function networkForm(targetId: string) {
	let form: HTMLFormElement
	let button: HTMLButtonElement

	onSettingsLoad(() => {
		form = document.getElementById(targetId) as HTMLFormElement
		button = form?.querySelector('button:last-of-type') as HTMLButtonElement

		form.querySelectorAll('input').forEach((input) => {
			input?.addEventListener('blur', () => {
				if (input.value === '') {
					form.classList.remove('valid')
				}
			})
		})

		form?.addEventListener('input', () => {
			if (form.classList.contains('warn')) {
				form.classList.remove('warn')
			}
		})
	})

	function resetForm() {
		form.classList.remove('load', 'warn', 'offline', 'valid')
		button.removeAttribute('disabled')
		button.title = ''
	}

	function load() {
		form.classList.add('valid', 'load')
		form.classList.remove('warn', 'offline')
		button.setAttribute('disabled', 'disabled')
		button.title = 'loading'
	}

	function warn(err: string) {
		form.classList.add('warn')
		form.classList.remove('load', 'offline')
		button.setAttribute('disabled', 'disabled')
		button.title = err
	}

	function accept(inputId?: string, value?: string) {
		if (inputId && value) {
			form.classList.remove('valid')
			form.querySelectorAll('input').forEach((input) => (input.value = ''))
			document.getElementById(inputId)?.setAttribute('placeholder', value)
		}

		setTimeout(() => resetForm(), 200)
	}

	return {
		load,
		warn,
		accept,
	}
}
