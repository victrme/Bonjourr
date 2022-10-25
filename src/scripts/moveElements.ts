export default function moveElements() {
	const selectables = document.querySelectorAll('#interface #time, #interface #main, #interface #widgets')
	let selected: HTMLElement

	// Activate moving mode
	document.addEventListener('keypress', (e: KeyboardEvent) => {
		if (e.key === 'm') {
			document.querySelector('#interface')?.classList.toggle('move-edit')
		}
	})

	// Select (Toggle) movable elements
	selectables.forEach((elem) => {
		elem.addEventListener('click', () => {
			selectables.forEach((d) => d.classList.remove('move-selected')) // remove all
			elem.classList.add('move-selected') // add clicked

			selected = elem as HTMLElement
		})
	})

	// Align selected element inside grid cell
	document.querySelectorAll('#alignment-mover button').forEach((button) => {
		button.addEventListener('click', () => {
			if (selected) {
				selected.style.placeSelf = `${button.getAttribute('data-align')} ${button.getAttribute('data-justify')}`
			}
		})
	})
}
