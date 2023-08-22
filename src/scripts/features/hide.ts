import { convertHideStorage } from '../utils'
import { Hide, HideOld, Sync } from '../types/sync'
import storage from '../storage'

export default async function hideElements(hidelist: Hide = {}, options?: { isEvent: true }) {
	function applyHide(list: Hide) {
		Object.entries(list).forEach(([key, val]) => {
			document.querySelector(`[data-hide="${key}"]`)?.classList.toggle('he_hidden', val)
		})
	}

	if (options?.isEvent) {
		let { hide } = await storage.sync.get('hide')

		if (Array.isArray(hide) && hide.length === 4) {
			hide = convertHideStorage(hide as HideOld)
		}

		hide = { ...hide, ...hidelist }

		storage.sync.set({ hide })
		applyHide(hidelist)

		return
	}

	// init
	applyHide(hidelist)
}
