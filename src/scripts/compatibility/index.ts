import * as filter from './filters.ts'
import type { Sync } from '../../types/sync.ts'
import type { SemVer } from '../utils/semver.ts'

//
//	1. Create compatibility filter in compatibility/filters.ts
//  2. Add your filter to here with correct versionning
//

export function applyCompatibilityFilters(data: Partial<Sync>, version: SemVer): Partial<Sync> {
	const { major, minor } = version

	if (major < 21) {
		data = filter.newBackgroundsField(data)
		data = filter.manualTimezonesToIntl(data)
	}

	if (major < 20) {
		data = filter.analogClockOptions(data)

		if (minor < 1) {
			data = filter.validateLinkGroups(data)
		}

		if (minor < 4) {
			data = filter.addSupporters(data)
			data = filter.toIsoLanguageCode(data)
		}
	}

	if (major < 19) {
		data = filter.newFontSystem(data)
		data = filter.newReviewData(data)
		data = filter.quotesJsonToCsv(data)

		if (minor < 2) {
			data = filter.linksDataMigration(data)
		}
	}

	if (major < 18) {
		data = filter.booleanSearchbarToObject(data)
		data = filter.linkListToFlatObjects(data)
		data = filter.hideArrayToObject(data)
		data = filter.improvedWeather(data)
		data = filter.clockDateFormat(data)
	}

	return data
}
