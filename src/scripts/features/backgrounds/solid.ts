import { SYNC_DEFAULT } from '../../defaults'
import { eventDebounce } from '../../utils/debounce'

export default function solidBackgrounds(init?: string, update?: string) {
	const color = init ?? update ?? SYNC_DEFAULT.background_solid

	document.documentElement.style.setProperty('--solid-background', color)

	if (update) {
		eventDebounce({ background_solid: update })
	}
}
