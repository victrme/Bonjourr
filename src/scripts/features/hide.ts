import storage from '../storage'
import { Hide } from '../types/sync'

export default async function hideElements(hide: Hide = {}, options?: { isEvent: true }) {
	//
	if (options?.isEvent) {
		const sync = await storage.sync.get('hide')
		hide = { ...sync.hide, ...hide }
		storage.sync.set({ hide })
	}

	for (const [key, val] of Object.entries(hide)) {
		document.querySelector(`[data-hide="${key}"]`)?.classList.toggle('he_hidden', val)
	}
}
