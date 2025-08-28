import {
	addSupporters,
	analogClockOptions,
	booleanSearchbarToObject,
	clockDateFormat,
	hideArrayToObject,
	improvedWeather,
	linkListToFlatObjects,
	linksDataMigration,
	manualTimezonesToIntl,
	newBackgroundsField,
	newFontSystem,
	newReviewData,
	quotesJsonToCsv,
	toIsoLanguageCode,
	validateLinkGroups,
} from './filters.ts'

import type { SemVer } from '../utils/semver.ts'
import type { Sync } from '../../types/sync.ts'

//
//	1. Create compatibility filter in compatibility/filters.ts
//  2. Add your filter to here with correct versionning
//

export function applyCompatibilityFilters(data: Partial<Sync>, version: SemVer): Partial<Sync> {
	const { major, minor } = version

	// 21

	if (major < 21) {
		data = newBackgroundsField(data)
		data = manualTimezonesToIntl(data)
	}

	// 20

	if (major < 20) {
		data = analogClockOptions(data)

		if (minor < 1) {
			data = validateLinkGroups(data)
		}

		if (minor < 4) {
			data = addSupporters(data)
			data = toIsoLanguageCode(data)
		}
	}

	// 19

	if (major < 19) {
		data = newFontSystem(data)
		data = newReviewData(data)
		data = quotesJsonToCsv(data)

		if (minor < 2) {
			data = linksDataMigration(data)
		}
	}

	// OLD

	if (major < 18) {
		data = booleanSearchbarToObject(data)
		data = linkListToFlatObjects(data)
		data = hideArrayToObject(data)
		data = improvedWeather(data)
		data = clockDateFormat(data)
	}

	return data
}
