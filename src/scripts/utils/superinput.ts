export default function superinput(inputtarget: string) {
	let input: HTMLInputElement
	let wrapper: HTMLDivElement
	let indicator: HTMLDivElement

	function init() {
		input = document.getElementById(inputtarget) as HTMLInputElement
		wrapper = input.parentElement as HTMLDivElement
		indicator = input.nextElementSibling as HTMLDivElement
		input.addEventListener('blur', () => toggle(false))
	}

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
		indicator.textContent = '↺'
	}

	function warn(err: string) {
		wrapper.className = 'superinput active warn'
		indicator.textContent = '⚠'
		wrapper.title = err
	}

	setTimeout(() => init(), 400)

	return {
		toggle,
		load,
		warn,
	}
}
