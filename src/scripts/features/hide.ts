import storage from '../storage'

export default async function hideElements(hide: Sync.Hide = {}, options?: { isEvent: true }) {
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
		document.querySelectorAll(`[data-hide="${key}"]`).forEach((element) => {
			element?.classList.toggle('he_hidden', val)
		})
	}
}
