import { clas, convertHideStorage } from '../utils'
import { Hide, HideOld, Sync } from '../types/sync'
import storage from '../storage'

export default function hideElements(hidelist: Hide = {}, options?: { isEvent: true }) {
	function applyHide(list: Hide) {
		Object.entries(list).forEach(([key, val]) => {
			clas(document.querySelector(`[data-hide="${key}"]`), val, 'he_hidden')
		})
	}

	if (options?.isEvent) {
		storage.sync.get(['hide'], (data) => {
			let hide = (data as Sync).hide || {}

			if (Array.isArray(data.hide) && data.hide.length === 4) {
				hide = convertHideStorage(data.hide as HideOld)
			}

			hide = { ...hide, ...hidelist }

			storage.sync.set({ hide })
			applyHide(hidelist)
		})
		return
	}

	// init
	applyHide(hidelist)
}
