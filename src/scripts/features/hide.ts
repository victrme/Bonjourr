import storage from '../storage'
import { Hide } from '../types/sync'

export default async function hideElements(hidelist: Hide = {}, options?: { isEvent: true }) {
	//
	if (options?.isEvent) {
		const { hide } = await storage.sync.get('hide')
		const isOld = Array.isArray(hide) && hide.length === 4
		if (isOld) return

		hidelist = { ...hidelist, ...hide }
		storage.sync.set({ hide: hidelist })
	}

	for (const [key, val] of Object.entries(hidelist)) {
		document.querySelector(`[data-hide="${key}"]`)?.classList.toggle('he_hidden', val)
	}
}
