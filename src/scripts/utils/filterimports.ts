import { addGridWidget, gridParse, gridStringify, removeGridWidget, defaultLayouts } from '../features/move/helpers'
import { randomString, bundleLinks, countryCodeToLanguageCode } from '../utils'
import { MAIN_API, SYNC_DEFAULT } from '../defaults'
import { deepmergeAll } from '@victr/deepmerge'
import { oldJSONToCSV } from '../features/quotes'

type Import = Partial<Sync.Storage>

export default function filterImports(current: Sync.Storage, target: Partial<Sync.Storage>) {
	// Prepare imported data compatibility

	target = booleanSearchbarToObject(target) // 9.0
	target = linkListToFlatObjects(target) // 13.0
	target = hideArrayToObject(target) // 16.0
	target = dynamicToUnsplash(target) // 17.0
	target = improvedWeather(target) // 18.1
	target = newFontSystem(target) // 19.0
	target = newReviewData(target) // ..
	target = quotesJsonToCSV(target) // ..
	target = linksDataMigration(target) // 19.2

	// Merge both settings

	current = deepmergeAll(current, target, { about: structuredClone(SYNC_DEFAULT.about) }) as Sync.Storage

	// Lastest version transform

	current = analogClockOptions(current) // 20.0
	current = linkTabsToGroups(current, target) // ..
	current = convertOldCSSSelectors(current) // ..
	current = linkParentsToString(current) // ..
	current = toISOLanguageCode(current) // ..
	current = removeGroupDuplicate(current) // ..

	// current = removeLinkDuplicates(current, target) // all
	current = toggleMoveWidgets(current, target) // all

	delete current.searchbar_newtab
	delete current.searchbar_engine
	delete current.cssHeight
	delete current.linktabs
	delete current.links
	delete current.dynamic

	return current
}

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

function toISOLanguageCode(data: Sync.Storage): Sync.Storage {
	data.lang = countryCodeToLanguageCode(data.lang ?? 'en')
	return data
}

function linkTabsToGroups(current: Sync.Storage, imported: Import): Sync.Storage {
	if (imported.linktabs) {
		current.linkgroups = {
			on: imported.linktabs.active,
			selected: imported.linktabs.titles[imported.linktabs.selected],
			groups: [...imported.linktabs.titles],
			synced: [],
			pinned: [],
		}
	}

	return current
}

function removeGroupDuplicate(current: Sync.Storage): Sync.Storage {
	if (current.linkgroups) {
		current.linkgroups.groups = [...new Set(current.linkgroups.groups)]
		current.linkgroups.pinned = [...new Set(current.linkgroups.pinned)]
		current.linkgroups.synced = [...new Set(current.linkgroups.synced)]
	}

	return current
}

function linkParentsToString<Data extends Sync.Storage | Import>(data: Data): Data {
	const links = bundleLinks(data as Sync.Storage)
	const groups = data?.linkgroups?.groups ?? []

	for (const link of links) {
		if (link.parent === undefined || typeof link.parent !== 'number') {
			continue
		}

		link.parent = groups[link.parent]
		data[link._id] = link
	}

	return data
}

function linksDataMigration(data: Import): Import {
	if (data?.linktabs || data?.linkgroups) {
		return data
	}

	const notfoundicon = 'data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9IjI2MiIgdmlld0JveD0iMC' // ...
	const list = (bundleLinks(data as Sync.Storage) as Links.Elem[]).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

	list.forEach((link) => {
		if (link.icon?.startsWith(notfoundicon)) {
			link.icon = MAIN_API + '/favicon/blob/'
			data[link._id] = link
		}
	})

	return data
}

function dynamicToUnsplash(data: Import): Import {
	// Dynamic/Custom becomes unsplash/local
	if ((data.background_type as string) === 'dynamic') data.background_type = 'unsplash'
	if ((data.background_type as string) === 'custom') data.background_type = 'local'

	// dynamic data renamed to unsplash
	if (data.dynamic as Unsplash.Sync) {
		data.unsplash = {
			...(data.dynamic as Unsplash.Sync),
			pausedImage: undefined,
		}
	}

	return data
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

function analogClockOptions<Data extends Sync.Storage | Import>(data: Data): Data {
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

	if (imported.move) {
		current.move = imported.move

		const layout = current.move.layouts[current.move.selection]
		const grid = layout?.grid ?? defaultLayouts[current.move.selection].grid
		const area = grid.flat().join(' ')

		current.time = area.includes('time')
		current.main = area.includes('main')
		current.quicklinks = area.includes('quicklinks')
		if (current.notes) current.notes.on = area.includes('notes')
		if (current.quotes) current.quotes.on = area.includes('quotes')
		if (current.searchbar) current.searchbar.on = area.includes('searchbar')

		return current
	}

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

function convertOldCSSSelectors<Data extends Sync.Storage | Import>(data: Data): Data {
	if (data?.css) {
		data.css = data.css
			.replaceAll('.block', '.link')
			.replaceAll('#clock', '#digital')
			.replaceAll('#analogClock', '#analog')
			.replaceAll('#center', '#analog-center')
			.replaceAll('#hours', '#analog-hours')
			.replaceAll('#minutes', '#analog-minutes')
			.replaceAll('#analogSeconds', '#analog-seconds')
	}

	return data
}
