import { addGridWidget, gridParse, gridStringify, removeGridWidget } from '../features/move/helpers'
import { randomString, bundleLinks } from '../utils'
import { SYNC_DEFAULT } from '../defaults'
import { deepmergeAll } from '@victr/deepmerge'
import { oldJSONToCSV } from '../features/quotes'

type Import = Partial<Sync.Storage>

export default function filterImports(current: Sync.Storage, target: Partial<Sync.Storage>) {
	// 9.0
	target = booleanSearchbarToObject(target)

	// 13.0
	target = linkListToFlatObjects(target)

	// 16.0
	target = hideArrayToObject(target)

	// 17.0
	target = dynamicToUnsplash(current, target)

	// 18.1
	target = improvedWeather(target)

	// 19.0
	target = newFontSystem(target)
	target = newReviewData(target)
	target = quotesJsonToCSV(target)

	// 20.0
	target = linkTabsToGroups(current, target)

	// latest version
	current = removeLinkDuplicates(current, target)
	current = toggleMoveWidgets(current, target)
	current = deepmergeAll(current, target) as Sync.Storage
	current = { ...current, about: structuredClone(SYNC_DEFAULT.about) }

	return current
}

// Version sensitive

function hideArrayToObject(data: Import): Import {
	if (Array.isArray(data.hide)) {
		if (data.hide[0][0]) data.hide.clock = true
		if (data.hide[0][1]) data.hide.date = true
		if (data.hide[1][0]) data.hide.greetings = true
		if (data.hide[1][1]) data.hide.weatherdesc = true
		if (data.hide[1][2]) data.hide.weathericon = true
		if (data.hide[3][0]) data.hide.settingsicon = true

		data.time = !(data.hide.clock && data.hide.date)
		data.main = !(data.hide.weatherdesc && data.hide.weathericon && data.hide.weathericon)
	}

	return data
}

function booleanSearchbarToObject(data: Import): Import {
	if (typeof data.searchbar === 'boolean') {
		data.searchbar = {
			...SYNC_DEFAULT.searchbar,
			on: data.searchbar as boolean,
			newtab: (data.searchbar_newtab as boolean) || false,
			engine: ((data.searchbar_engine as string | undefined)?.replace('s_', '') || 'google') as Sync.Searchbar['engine'],
			suggestions: false,
		}

		delete data.searchbar_newtab
		delete data.searchbar_engine
	}

	return data
}

function linkListToFlatObjects(data: Import): Import {
	if (Array.isArray(data.links)) {
		if (data.links.length > 0 && data.quicklinks === undefined) {
			data.quicklinks = true
		}

		data.links?.forEach(({ title, url, icon }: Links.Elem, i: number) => {
			const id = 'links' + randomString(6)
			const filteredIcon = icon?.startsWith('alias:') ? data[icon] : icon

			data[id] = {
				_id: id,
				order: i,
				title,
				url,
				icon: filteredIcon,
			}
		})

		delete data.links

		const aliasKeyList = Object.keys(data).filter((key) => key.match('alias:'))
		aliasKeyList.forEach((key) => delete data[key])
	}

	return data
}

function newFontSystem(data: Import): Import {
	if (data.font) {
		data.font.weightlist = data.font?.availWeights ?? []
		delete data.font.url
		delete data.font.availWeights

		// Always assume it is NOT a system font, unless specified
		if (data.font.system === undefined) {
			data.font.system = false
		}
	}

	return data
}

function newReviewData(data: Import): Import {
	if (data.reviewPopup) {
		data.review = data.reviewPopup === 'removed' ? -1 : +data.reviewPopup
	}

	return data
}

function quotesJsonToCSV(data: Import): Import {
	if (Array.isArray(data?.quotes?.userlist)) {
		data.quotes.userlist = oldJSONToCSV(data.quotes.userlist)
	}

	return data
}

function linkTabsToGroups(current: Sync.Storage, imported: Import): Sync.Storage {
	if (current?.linkgroups?.groups && imported?.linkgroups?.groups) {
		current.linkgroups.groups = []
		current.linkgroups.pinned = []
		current.linkgroups.synced = []
	}

	if (imported.linktabs) {
		current.linkgroups = {
			on: imported.linktabs.active,
			selected: imported.linktabs.titles[imported.linktabs.selected],
			groups: [...imported.linktabs.titles],
			synced: [],
			pinned: [],
		}

		delete imported.linktabs
	}

	return current
}

function dynamicToUnsplash(current: Sync.Storage, imported: Import): Sync.Storage {
	// Dynamic/Custom becomes unsplash/local
	if ((imported.background_type as string) === 'dynamic') current.background_type = 'unsplash'
	if ((imported.background_type as string) === 'custom') current.background_type = 'local'

	// dynamic data renamed to unsplash
	if (imported.dynamic as Unsplash.Sync) {
		current.unsplash = {
			...(current.dynamic as Unsplash.Sync),
			pausedImage: undefined,
		}

		delete imported.dynamic
	}

	return current
}

function improvedWeather(data: Import): Import {
	if (data.weather && data.weather?.geolocation === undefined) {
		const oldLocation = data.weather?.location ?? []

		data.weather.geolocation = 'approximate'
		data.weather.geolocation = oldLocation.length === 0 ? 'off' : 'precise'

		delete data.weather.location
		//@ts-expect-error
		delete data.weather.lastState
		//@ts-expect-error
		delete data.weather.lastCall
	}

	return data
}

//

function removeLinkDuplicates(curr: Sync.Storage, imported: Import): Sync.Storage {
	const currentLinks = bundleLinks(curr)
	const importedLink = bundleLinks(imported as Sync.Storage)
	const importedURLs = importedLink.map((link) => (link.folder ? '' : link.url))

	for (let ii = 0; ii < currentLinks.length; ii++) {
		const link = currentLinks[ii]

		if (!link.folder && link.url === importedURLs[ii]) {
			delete curr[link._id]
		}
	}

	return curr
}

function toggleMoveWidgets(current: Sync.Storage, imported: Import): Sync.Storage {
	// When import doesn't have move, other widgets can still be different
	// This updates current grid with the widgets states from import

	if (!imported.move) {
		let importStates = {
			time: imported.time ?? current.time,
			main: imported.main ?? current.main,
			notes: imported.notes?.on ?? (current.notes?.on || false),
			quotes: imported.quotes?.on ?? current.quotes?.on,
			searchbar: imported.searchbar?.on ?? current.searchbar?.on,
			quicklinks: imported.quicklinks ?? current.quicklinks,
		}

		let diffWidgets = {
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
		diffEntries.forEach(([key, _]) => {
			const id = key as Widgets
			const state = importStates[id]
			const gridToggle = state ? addGridWidget : removeGridWidget

			layout.grid = gridParse(gridToggle(gridStringify(layout.grid), id, selection))
		})

		current.move.layouts[selection] = layout
	}

	return current
}
