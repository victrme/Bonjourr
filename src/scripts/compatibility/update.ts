import { CURRENT_VERSION, PLATFORM } from '../defaults.ts'
import { applyCompatibilityFilters } from './index.ts'
import { toSemVer } from '../utils/semver.ts'

import type { Sync } from '../../types/sync.ts'

export function filterUpdateData(data: Sync): Sync {
	//
	const user = toSemVer(data.about.version)
	let partial = data as Partial<Sync>

	partial = applyCompatibilityFilters(partial, user)

	partial.about = {
		browser: PLATFORM,
		version: CURRENT_VERSION,
	}

	return data
}
