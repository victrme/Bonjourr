import storage from '../storage'

export default async function hideElements(hide: Sync.Hide = {}, options?: { isEvent: true }) {
	//
	if (options?.isEvent) {
		const sync = await storage.sync.get('hide')

		hide = {
			...sync.hide, // ⚠️ sync must be first. If not, event doesn't save
			...hide,
		}

		storage.sync.set({ hide })
	}

	for (const [key, val] of Object.entries(hide)) {
		document.querySelector(`[data-hide="${key}"]`)?.classList.toggle('he_hidden', val)
	}
}
