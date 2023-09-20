import onSettingsLoad from './onsettingsload'

export default function superinput(inputtarget: string) {
	let input: HTMLInputElement
	let wrapper: HTMLDivElement
	let statusicon: HTMLElement

	onSettingsLoad(() => {
		input = document.getElementById(inputtarget) as HTMLInputElement
		wrapper = input?.parentElement as HTMLDivElement
		statusicon = wrapper?.querySelector('i') as HTMLElement

		input?.addEventListener('blur', () => toggle(false))
		input?.addEventListener('input', () => {
			if (wrapper?.classList.contains('warn')) toggle(false)
		})
	})

	function toggle(force?: boolean, value?: string) {
		wrapper.classList.toggle('active', force)
		wrapper.title = ''

		if (value !== undefined) {
			input.setAttribute('placeholder', value)
		}
	}

	function load() {
		wrapper.className = 'superinput active load'
		wrapper.title = 'loading'
		statusicon.className = 'gg-spinner'
	}

	function warn(err: string) {
		wrapper.className = 'superinput active warn'
		wrapper.title = err
		statusicon.className = 'gg-danger'
	}

	return {
		toggle,
		load,
		warn,
	}
}
