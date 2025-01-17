import { applyBackground } from '.'
import { SYNC_DEFAULT } from '../../defaults'
import debounce from '../../utils/debounce'
import storage from '../../storage'

const colorUpdateDebounce = debounce(solidBackgroundUpdate, 600)

export default function solidBackgrounds(init?: string, update?: string) {
	const value = init ?? update ?? SYNC_DEFAULT.backgrounds.color

	if (update) {
		colorUpdateDebounce(update)
	}

	applyBackground({ solid: { value } })
}

async function solidBackgroundUpdate(value: string) {
	const data = await storage.sync.get('backgrounds')

	data.backgrounds.color = value
	storage.sync.set({ backgrounds: data.backgrounds })
}
