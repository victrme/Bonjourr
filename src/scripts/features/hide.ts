import { storage } from '../storage'

export async function hideElements(hide: Sync.Hide = {}, options?: { isEvent: true }) {
	//
	if (options?.isEvent) {
		const sync = await storage.sync.get('hide')
		const newhide = {
			...sync.hide, // ⚠️ sync must be first. If not, event doesn't save
			...hide,
		}

		storage.sync.set({ hide: newhide })
	}

	for (const [key, val] of Object.entries(hide)) {
		for (const element of document.querySelectorAll(`[data-hide="${key}"]`)) {
			element?.classList.toggle('he_hidden', val)
		}
	}
}
