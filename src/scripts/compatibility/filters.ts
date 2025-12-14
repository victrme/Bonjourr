import { addGridWidget, defaultLayouts, gridParse, gridStringify, removeGridWidget } from '../features/move/helpers.ts'
import { countryCodeToLanguageCode } from '../utils/translations.ts'
import { API_DOMAIN, SYNC_DEFAULT } from '../defaults.ts'
import { oldJSONToCSV } from '../features/quotes.ts'
import { randomString } from '../shared/generic.ts'
import { bundleLinks } from '../utils/bundlelinks.ts'

import type { LinkElem, OldSync, Widgets } from '../../types/shared.ts'
import type { Sync } from '../../types/sync.ts'

type Import = Partial<Sync>

export function fixNullBrightness(data: Import): Import {
	if (data.backgrounds?.bright === null) {
		data.backgrounds.bright = SYNC_DEFAULT.backgrounds.bright
	}

	return data
}

export function addSupporters(data: Import): Import {
	if (data.supporters === undefined) {
		data.supporters = {
			enabled: true,
		}
	}

	return data
}

export function hideArrayToObject(data: Import): Import {
	const newhide: Sync['hide'] = {}

	if (Array.isArray(data.hide)) {
		if (data.hide[0]?.[0]) {
			newhide.clock = true
		}
		if (data.hide[0]?.[1]) {
			newhide.date = true
		}
		if (data.hide[1]?.[0]) {
			newhide.greetings = true
		}
		if (data.hide[1]?.[1]) {
			newhide.weatherdesc = true
		}
		if (data.hide[1]?.[2]) {
			newhide.weathericon = true
		}
		if (data.hide[3]?.[0]) {
			newhide.settingsicon = true
		}

		data.hide = newhide
		data.time = !(data.hide.clock && data.hide.date)
		data.main = !(data.hide.weatherdesc && data.hide.weathericon && data.hide.weathericon)
	}

	return data
}

export function booleanSearchbarToObject(data: Import): Import {
	if (typeof data.searchbar === 'boolean') {
		data.searchbar = {
			...SYNC_DEFAULT.searchbar,
			on: data.searchbar as boolean,
			newtab: data.searchbar_newtab as boolean,
			engine: (data.searchbar_engine as string | undefined)?.replace('s_', '') || 'google',
			suggestions: false,
		}
	}

	return data
}

export function linkListToFlatObjects(data: Import): Import {
	if (Array.isArray(data.links)) {
		if (data.links.length > 0 && data.quicklinks === undefined) {
			data.quicklinks = true
		}

		data.links?.forEach(({ title, url, icon }, i) => {
			const id = `links${randomString(6)}`
			const filteredIcon = icon?.startsWith('alias:') ? data[icon] : icon

			data[id] = {
				_id: id,
				parent: 'default',
				order: i,
				title,
				url,
				icon: filteredIcon,
			}
		})

		const aliasKeyList = Object.keys(data).filter((key) => key.match('alias:'))

		for (const key of aliasKeyList) {
			data[key] = undefined
		}
	}

	return data
}

export function newFontSystem(data: Import): Import {
	if (data.font) {
		data.font.weightlist = data.font?.availWeights ?? []
		data.font.url = undefined
		data.font.availWeights = undefined

		// Always assume it is NOT a system font, unless specified
		if (data.font.system === undefined) {
			data.font.system = false
		}
	}

	return data
}

export function newReviewData(data: Import): Import {
	if (data.reviewPopup) {
		data.review = data.reviewPopup === 'removed' ? -1 : +data.reviewPopup
	}

	return data
}

export function quotesJsonToCsv(data: Import): Import {
	if (Array.isArray(data?.quotes?.userlist)) {
		data.quotes.userlist = oldJSONToCSV(data.quotes.userlist)
	}
	return data
}

export function toIsoLanguageCode(data: Import): Import {
	data.lang = countryCodeToLanguageCode(data.lang ?? 'en')
	return data
}

export function clockDateFormat(data: Import): Import {
	const old = data as Partial<OldSync>

	if (old.usdate) {
		data.dateformat = 'us'
	} else {
		data.dateformat = 'auto'
	}

	return data
}

export function removeWorldClocksDuplicate(current: Sync, target: Import): Sync {
	if (target.worldclocks && current.worldclocks) {
		current.worldclocks = target.worldclocks
	}

	return current
}

export function manualTimezonesToIntl(data: Import): Import {
	const timezoneMatches: Record<string, string> = {
		'-10': '-10:00',
		'-9': '-09:00',
		'-8': '-08:00',
		'-7': '-07:00',
		'-6': '-06:00',
		'-5': '-05:00',
		'-4': '-04:00',
		'-3': '-03:00',
		'+0': '+00:00',
		'+1': '+01:00',
		'+2': '+02:00',
		'+3': '+03:00',
		'+5:30': '+05:30',
		'+7': '+07:00',
		'+8': '+08:00',
		'+9': '+09:00',
		'+10': '+10:00',
		'+12': '+12:00',
	}

	const oldTimezones = Object.keys(timezoneMatches)

	if (data.clock && oldTimezones.includes(data.clock.timezone)) {
		data.clock.timezone = timezoneMatches[data.clock.timezone]
	}

	data.worldclocks?.forEach(({ timezone }, i) => {
		const isOld = oldTimezones.includes(timezone)

		if (data.worldclocks?.[i] && isOld) {
			data.worldclocks[i].timezone = timezoneMatches[timezone]
		}
	})

	return data
}

export function validateLinkGroups(current: Import): Import {
	// (1)
	let links = bundleLinks(current)
	let parents = [...new Set(links.map((link) => link.parent))]
	let parentGroups = parents.filter((p) => !p?.toString().startsWith('links'))

	const oldNumberParents = parents.filter((parent) => typeof parent === 'number')
	const oldlinktabs = current.linktabs as OldSync['linktabs']

	if (oldlinktabs && oldNumberParents.length > 0) {
		current.linkgroups = {
			on: oldlinktabs.active,
			selected: oldlinktabs.titles[oldlinktabs.selected],
			groups: [...oldlinktabs.titles],
			synced: [],
			pinned: [],
		}

		for (const link of links) {
			if (typeof link?.parent === 'number') {
				link.parent = current.linkgroups.groups[link.parent]
			}

			current[link._id] = link
		}
	}

	if (!current.linkgroups) {
		current.linkgroups = SYNC_DEFAULT.linkgroups
	}

	const { groups, pinned, synced, selected } = current.linkgroups

	// Transform default from old "" or undefined to new "default"
	current.linkgroups.selected = selected ? selected : 'default'
	current.linkgroups.groups = groups.map((val) => (val ? val : 'default'))
	current.linkgroups.pinned = pinned.map((val) => (val ? val : 'default'))
	current.linkgroups.synced = synced.map((val) => (val ? val : 'default'))

	for (const link of links) {
		if (!link?.parent) {
			link.parent = current.linkgroups.selected
			current[link._id] = link
		}
	}

	// (2)
	links = bundleLinks(current)
	parents = [...new Set(links.map((link) => link.parent))]
	parentGroups = parents.filter((p) => !p?.toString().startsWith('links'))

	// Add all groups found in links
	for (const group of parentGroups) {
		if (group) {
			current.linkgroups.groups.push(group.toString())
		}
	}

	// Force enable if multiple groups are hidden
	if (current.linkgroups.groups.length > 1) {
		current.linkgroups.on = true
	}

	// Unselect "default" if empty & groups/links exists
	const parentNoDefault = current.linkgroups.groups.filter((group) => group !== 'default')
	const defaultExists = current.linkgroups.groups.includes('default')
	const defaultIsEmpty = parentGroups.includes('default') === false
	const hasUserGroups = parentNoDefault.length > 0
	const hasLinks = links.length > 0

	if (defaultExists && defaultIsEmpty && hasUserGroups && hasLinks) {
		current.linkgroups.groups = parentNoDefault
		current.linkgroups.selected = parentNoDefault[0]
	}

	return current
}

export function linksDataMigration(data: Import): Import {
	if (data?.linktabs || data?.linkgroups) {
		return data
	}

	const notfoundicon = 'data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9IjI2MiIgdmlld0JveD0iMC'
	const list = (bundleLinks(data as Sync) as LinkElem[]).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

	for (const link of list) {
		if (link.icon?.startsWith(notfoundicon)) {
			link.icon = `${API_DOMAIN}/favicon/blob/`
			data[link._id] = link
		}
	}

	return data
}

export function improvedWeather(data: Import): Import {
	if (data.weather && data.weather?.geolocation === undefined) {
		//@ts-expect-error -> old types
		const oldLocation = data.weather?.location ?? []

		data.weather.geolocation = 'approximate'
		data.weather.geolocation = oldLocation.length === 0 ? 'off' : 'precise'
	}

	return data
}

/** Version 21: migrate from generic fields to a single "backgrounds" object */
export function newBackgroundsField(data: Import): Import {
	const olddata = data as Partial<OldSync>
	const defaults = structuredClone(SYNC_DEFAULT)

	if (!data.backgrounds) {
		data.backgrounds = defaults.backgrounds
	}

	if (olddata.background_blur !== undefined) {
		data.backgrounds.blur = olddata.background_blur
	}
	if (olddata.background_bright !== undefined) {
		data.backgrounds.bright = olddata.background_bright
	}
	if (olddata.background_type !== undefined) {
		data.backgrounds.type = olddata.background_type === 'unsplash' ? 'images' : 'files'
	}
	if (olddata.unsplash) {
		data.backgrounds.frequency = olddata.unsplash?.every ?? 'hour'
	}
	if (olddata.unsplash?.collection) {
		data.backgrounds.images = 'unsplash-images-collections'
		data.backgrounds.queries = { 'unsplash-images-collections': olddata.unsplash.collection }
	}

	return data
}

export function analogClockOptions<Data extends Sync | Import>(data: Data): Data {
	if (data.clock?.style) {
		data.analogstyle = {
			background: '#fff2',
			border: '#ffff',
			face: data?.clock?.face || 'none',
			shape: 'round',
			hands: 'modern',
		}

		if (data.clock.style === 'round' || data.clock.style === 'square') {
			data.analogstyle.shape = data.clock.style
		}

		if (data.clock.style === 'transparent') {
			data.analogstyle.background = '#fff0'
			data.analogstyle.border = '#fff0'
		}
	}

	return data
}

export function removeLinkgroupDuplicates(current: Sync): Sync {
	// 1. Remove duplicate
	current.linkgroups.groups = [...new Set(current.linkgroups.groups)]
	current.linkgroups.pinned = [...new Set(current.linkgroups.pinned)]
	current.linkgroups.synced = [...new Set(current.linkgroups.synced)]

	// 2. Remove default from SYNC_DEFAULT

	const links = bundleLinks(current)
	const parents = links.map((l) => l.parent)
	const defaultGroupAsParent = parents.some((parent) => parent === 'default')
	const multipleGroups = current.linkgroups.groups.length > 1

	if (multipleGroups && !defaultGroupAsParent) {
		current.linkgroups.groups = current.linkgroups.groups.filter((item) => item !== 'default')
		current.linkgroups.pinned = current.linkgroups.pinned.filter((item) => item !== 'default')
		current.linkgroups.synced = current.linkgroups.synced.filter((item) => item !== 'default')
	}

	return current
}

export function toggleMoveWidgets(current: Sync, imported: Import): Sync {
	// When import doesn't have move, other widgets can still be different
	// This updates current grid with the widgets states from import

	if (imported.move) {
		current.move = imported.move

		const layout = current.move.layouts[current.move.selection]
		const grid = layout?.grid ?? defaultLayouts[current.move.selection].grid
		const area = grid.flat().join(' ')

		current.time = area.includes('time')
		current.main = area.includes('main')
		current.quicklinks = area.includes('quicklinks')

		if (current.notes) {
			current.notes.on = area.includes('notes')
		}
		if (current.quotes) {
			current.quotes.on = area.includes('quotes')
		}
		if (current.searchbar) {
			current.searchbar.on = area.includes('searchbar')
		}

		return current
	}

	if (!imported.move) {
		const importStates = {
			time: imported.time ?? current.time,
			main: imported.main ?? current.main,
			notes: imported.notes?.on ?? current.notes?.on,
			quotes: imported.quotes?.on ?? current.quotes?.on,
			searchbar: imported.searchbar?.on ?? current.searchbar?.on,
			quicklinks: imported.quicklinks ?? current.quicklinks,
		}

		const diffWidgets = {
			time: current.time !== importStates.time,
			main: current.main !== importStates.main,
			notes: current.notes?.on !== importStates.notes,
			quotes: current.quotes?.on !== importStates.quotes,
			searchbar: current.searchbar?.on !== importStates.searchbar,
			quicklinks: current.quicklinks !== importStates.quicklinks,
		}

		// Force single layout with old imports
		// Partial imports, for example links list only, will not force single
		if (Object.keys(imported).some((key) => key.match(/time|main|notes|quotes|searchbar|quicklinks/g))) {
			current.move.selection = 'single'
		}

		const selection = current.move.selection
		const layout = structuredClone(current.move.layouts[selection])
		const diffEntries = Object.entries(diffWidgets).filter(([_, diff]) => diff === true)

		if (!layout) {
			return current
		}

		// mutate grid: add or remove widgets that are different from current data
		for (const [key] of diffEntries) {
			const id = key as Widgets
			const state = importStates[id]
			const gridToggle = state ? addGridWidget : removeGridWidget

			layout.grid = gridParse(gridToggle(gridStringify(layout.grid), id, selection))
		}

		current.move.layouts[selection] = layout
	}

	return current
}

export function convertOldCssSelectors(data: Import): Import {
	if (data?.css) {
		data.css = data.css
			.replaceAll('.block', '.link')
			.replaceAll('#clock', '#digital')
			.replaceAll('#analogClock', '#analog')
			.replaceAll('#center', '#analog-center')
			.replaceAll('#hours', '#analog-hours')
			.replaceAll('#minutes', '#analog-minutes')
			.replaceAll('#analogSeconds', '#analog-seconds')
			.replaceAll('#creditContainer', '#credit-container')
	}

	return data
}
