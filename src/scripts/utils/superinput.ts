export default function superinput(inputtarget: string) {
	let input: HTMLInputElement
	let wrapper: HTMLDivElement
	let indicator: HTMLDivElement

	setTimeout(() => {
		input = document.getElementById(inputtarget) as HTMLInputElement
		wrapper = input.parentElement as HTMLDivElement
		indicator = input.nextElementSibling as HTMLDivElement

		input.addEventListener('blur', () => toggle(false))
		input.addEventListener('input', () => toggle(true))
	}, 400)

	function toggle(force?: boolean) {
		wrapper.classList.toggle('active', force)
		wrapper.title = ''

		if (force) {
			wrapper.className = 'superinput active'
			indicator.textContent = '...'
		}
	}

	function load() {
		wrapper.className = 'superinput active load'
		wrapper.title = 'loading'
		indicator.textContent = '↺'
	}

	function fail(err: string) {
		wrapper.className = 'superinput active fail'
		indicator.textContent = '⨉'
		wrapper.title = err
	}

	function warn(err: string) {
		wrapper.className = 'superinput active warn'
		indicator.textContent = '⚠'
		wrapper.title = err
	}

	return {
		toggle,
		load,
		warn,
		fail,
	}
}
