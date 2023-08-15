export default function superinput(inputtarget: string) {
	let input: HTMLInputElement
	let wrapper: HTMLDivElement

	setTimeout(() => {
		input = document.getElementById(inputtarget) as HTMLInputElement
		wrapper = input.parentElement as HTMLDivElement

		input.addEventListener('blur', () => toggle(false))
		input.addEventListener('input', () => toggle(true))
	}, 400)

	function toggle(force?: boolean) {
		wrapper.classList.toggle('active', force)

		if (force) {
			wrapper.className = 'superinput active validate'
		}

		wrapper.title = ''
	}

	function load() {
		wrapper.className = 'superinput active loading'
		wrapper.title = 'loading'
	}

	function warn(err: string) {
		wrapper.className = 'superinput active warn'
		wrapper.title = err
	}

	function fail(err: string) {
		wrapper.className = 'superinput active failed'
		wrapper.title = err
	}

	return {
		toggle,
		load,
		warn,
		fail,
	}
}
