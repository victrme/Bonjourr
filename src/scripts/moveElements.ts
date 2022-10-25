import clamp from 'lodash.clamp'

export default function moveElements() {
	const selectables = document.querySelectorAll('#interface #time, #interface #main, #interface #widgets')
	let selected: HTMLElement

	const removeSelections = () => selectables.forEach((d) => d.classList.remove('move-selected'))

	// Sets default grid values for Interface elements
	// (To be removed when storage is here)
	;(document.querySelector('#time') as HTMLElement).style.gridArea = '1 / 2 / span 1 / span 1'
	;(document.querySelector('#main') as HTMLElement).style.gridArea = '2 / 2 / span 1 / span 1'
	;(document.querySelector('#widgets') as HTMLElement).style.gridArea = '3 / 2 / span 1 / span 1'

	//
	// Elements Selection
	//

	// Activate moving mode
	document.addEventListener('keypress', (e: KeyboardEvent) => {
		if (e.key === 'm') {
			document.querySelector('#interface')?.classList.toggle('move-edit')
			removeSelections()
		}
	})

	// Select (Toggle) movable elements
	selectables.forEach((elem) => {
		elem.addEventListener('click', () => {
			removeSelections()
			elem.classList.add('move-selected') // add clicked

			selected = elem as HTMLElement
		})
	})

	//
	// Grid Move
	//

	document.querySelectorAll('#grid-mover button').forEach((button) => {
		button.addEventListener('click', () => {
			if (selected) {
				// Get current row / col
				const domGridStart = {
					row: parseInt(selected.style.gridRowStart) || 0,
					col: parseInt(selected.style.gridColumnStart) || 0,
				}

				// Get button move amount
				const moveAmout = {
					row: parseInt(button.getAttribute('data-row') || '0'),
					col: parseInt(button.getAttribute('data-col') || '0'),
				}

				// Update row / col
				const row = clamp(domGridStart.row + moveAmout.row, 0, selectables.length)
				const col = clamp(domGridStart.col + moveAmout.col, 0, selectables.length)

				// Apply changes
				selected.style.gridColumn = col.toString() + '/ span 1'
				selected.style.gridRow = row.toString() + '/ span 1'
			}
		})
	})

	//
	// Box Alignment
	//

	document.querySelectorAll('#box-alignment-mover button').forEach((button) => {
		button.addEventListener('click', () => {
			if (selected) {
				selected.style.placeSelf = `${button.getAttribute('data-align')} ${button.getAttribute('data-justify')}`
			}
		})
	})

	//
	// Text Alignment
	//

	document.querySelectorAll('#text-alignment-mover button').forEach((button) => {
		button.addEventListener('click', () => {
			if (selected) {
				selected.style.textAlign = button.getAttribute('data-align') || ''
			}
		})
	})
}
