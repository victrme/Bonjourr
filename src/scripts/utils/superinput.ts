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

		form?.addEventListener('blur', () => toggle(false))
		form?.addEventListener('input', () => (form?.classList.contains('warn') ? toggle(true) : ''))
	})

	function toggle(force?: boolean) {
		form.classList.remove('load', 'warn', 'offline')
		form.classList.toggle('valid', force)
		button.removeAttribute('disabled')
		button.title = ''
	}

	function load() {
		form.classList.add('load')
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

	return {
		toggle,
		load,
		warn,
	}
}
