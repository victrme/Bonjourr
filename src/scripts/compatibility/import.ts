import { removeLinkgroupDuplicates, removeWorldClocksDuplicate, toggleMoveWidgets } from './filters.ts'
import { CURRENT_VERSION, PLATFORM } from '../defaults.ts'
import { applyCompatibilityFilters } from './index.ts'
import { deepmergeAll } from '@victr/deepmerge'
import { toSemVer } from '../utils/semver.ts'

import type { Sync } from '../../types/sync.ts'

export function filterImportData(current: Sync, target: Partial<Sync>) {
	let newtarget = target
	let newcurrent = current

	// Prepare imported data compatibility
	newtarget = applyCompatibilityFilters(newtarget, toSemVer(undefined))

	// Detect if merging between settings is needed
	const currentKeyAmount = Object.keys(newcurrent).length
	const targetKeyAmount = Object.keys(newtarget).length
	const needMerging = targetKeyAmount !== currentKeyAmount

	if (needMerging) {
		newcurrent = deepmergeAll(newcurrent, newtarget) as Sync

		// After merge only
		newcurrent = removeLinkgroupDuplicates(newcurrent)
		newcurrent = removeWorldClocksDuplicate(newcurrent, newtarget)
		newcurrent = toggleMoveWidgets(newcurrent, newtarget)
	}

	newcurrent.about = {
		browser: PLATFORM,
		version: CURRENT_VERSION,
	}

	// Remove old fields
	delete newcurrent.settingssync
	delete newcurrent.custom_every
	delete newcurrent.custom_time
	delete newcurrent.searchbar_newtab
	delete newcurrent.searchbar_newtab
	delete newcurrent.searchbar_engine
	delete newcurrent.cssHeight
	delete newcurrent.linktabs
	delete newcurrent.links
	delete newcurrent.dynamic
	delete newcurrent.unsplash
	delete newcurrent.background_blur
	delete newcurrent.background_bright
	delete newcurrent.background_type
	delete newcurrent.usdate

	return newcurrent
}
