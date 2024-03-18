import { addGridWidget, removeGridWidget } from '../features/move/helpers'
import { randomString, bundleLinks } from '../utils'
import { SYNC_DEFAULT } from '../defaults'
import { deepmergeAll } from '@victr/deepmerge'
import { oldJSONToCSV } from '../features/quotes'

export default function filterImports(current: Sync.Storage, toImport: Partial<Sync.Storage>) {
	//
	if (toImport.reviewPopup) {
		toImport.review = toImport.reviewPopup === 'removed' ? -1 : +toImport.reviewPopup
	}

	// 19.0.0 To new font system
	if (toImport.font) {
		toImport.font.weightlist = toImport.font?.availWeights ?? []
		delete toImport.font.url
		delete toImport.font.availWeights

		// Always assume it is NOT a system font, unless specified
		if (toImport.font.system === undefined) {
			toImport.font.system = false
		}
	}

	// <1.18.1 Improved geolocation, removed lastState in sync
	if (toImport.weather && toImport.weather?.geolocation === undefined) {
		const oldLocation = toImport.weather?.location ?? []

		toImport.weather.geolocation = 'approximate'
		toImport.weather.geolocation = oldLocation.length === 0 ? 'off' : 'precise'

		delete toImport.weather.location
		//@ts-ignore
		delete toImport.weather.lastState
		//@ts-ignore
		delete toImport.weather.lastCall
	}

	// <1.16.0 hide is now ids object, not number array
	if (Array.isArray(toImport.hide)) {
		if (toImport.hide[0][0]) toImport.hide.clock = true
		if (toImport.hide[0][1]) toImport.hide.date = true
		if (toImport.hide[1][0]) toImport.hide.greetings = true
		if (toImport.hide[1][1]) toImport.hide.weatherdesc = true
		if (toImport.hide[1][2]) toImport.hide.weathericon = true
		if (toImport.hide[3][0]) toImport.hide.settingsicon = true

		toImport.time = !(toImport.hide.clock && toImport.hide.date)
		toImport.main = !(toImport.hide.weatherdesc && toImport.hide.weathericon && toImport.hide.weathericon)
	}

	// <1.17.0 dynamic/custom becomes unsplash/local
	if ((toImport.background_type as string) === 'dynamic') toImport.background_type = 'unsplash'
	if ((toImport.background_type as string) === 'custom') toImport.background_type = 'local'

	// <1.17.0 dynamic data renamed to unsplash
	if (toImport.dynamic as Unsplash.Sync) {
		toImport.unsplash = {
			...(toImport.dynamic as Unsplash.Sync),
			pausedImage: undefined,
		}

		delete toImport.dynamic
	}

	// <1.9.0 searchbar options was boolean
	if (typeof toImport.searchbar === 'boolean') {
		toImport.searchbar = {
			...SYNC_DEFAULT.searchbar,
			on: toImport.searchbar as boolean,
			newtab: (toImport.searchbar_newtab as boolean) || false,
			engine: ((toImport.searchbar_engine as string | undefined)?.replace('s_', '') ||
				'google') as Sync.Searchbar['engine'],
			suggestions: false,
		}

		delete toImport.searchbar_newtab
		delete toImport.searchbar_engine
	}

	// Convert <1.13.0 links
	if (Array.isArray(toImport.links)) {
		//
		// Display links if any are found
		if (toImport.links.length > 0 && toImport.quicklinks === undefined) {
			toImport.quicklinks = true
		}

		toImport.links?.forEach(({ title, url, icon }: Links.Elem, i: number) => {
			const id = 'links' + randomString(6)
			const filteredIcon = icon?.startsWith('alias:') ? toImport[icon] : icon

			toImport[id] = {
				_id: id,
				order: i,
				title,
				url,
				icon: filteredIcon,
			}
		})

		// removes <1.13.0 links array
		delete toImport.links

		// removes <1.13.0 aliases
		const aliasKeyList = Object.keys(toImport).filter((key) => key.match('alias:'))
		aliasKeyList.forEach((key) => delete toImport[key])
	}

	// <1.19.0 quotes userlist was json
	if (Array.isArray(toImport?.quotes?.userlist)) {
		toImport.quotes.userlist = oldJSONToCSV(toImport.quotes.userlist)
	}

	// When import doesn't have move, other widgets can still be different
	// This updates current grid with the widgets states from import
	if (!toImport.move) {
		let importStates = {
			time: toImport.time ?? current.time,
			main: toImport.main ?? current.main,
			notes: toImport.notes?.on ?? (current.notes?.on || false),
			quotes: toImport.quotes?.on ?? current.quotes?.on,
			searchbar: toImport.searchbar?.on ?? current.searchbar?.on,
			quicklinks: toImport.quicklinks ?? current.quicklinks,
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
		if (Object.keys(toImport).some((key) => key.match(/time|main|notes|quotes|searchbar|quicklinks/g))) {
			current.move.column = 'single'
		}

		const column = current.move.column
		const layout = structuredClone(current.move[column])
		const diffEntries = Object.entries(diffWidgets).filter(([_, diff]) => diff === true)

		// mutate grid: add or remove widgets that are different from current data
		diffEntries.forEach(([key, _]) => {
			const id = key as Widgets
			const state = importStates[id]
			const gridToggle = state ? addGridWidget : removeGridWidget

			layout.grid = gridToggle(layout.grid, id, column)
		})

		current.move[column] = layout
	}

	// Remove link duplicates
	const importedLink = bundleLinks(toImport as Sync.Storage)
	const importedURLs = importedLink.map((link) => (link.folder ? '' : link.url))
	const currentLinks = bundleLinks(current)

	for (let ii = 0; ii < currentLinks.length; ii++) {
		const link = currentLinks[ii]

		if (!link.folder && link.url === importedURLs[ii]) {
			delete current[link._id]
		}
	}

	// Link tabs
	if (toImport.linktabs) {
		const importTitles = toImport.linktabs.titles
		const currentTitles = current.linktabs.titles
		toImport.linktabs.titles = importTitles.filter((title, i) => {
			return title != currentTitles[i]
		})
	}

	current = deepmergeAll(current, toImport, { about: SYNC_DEFAULT.about }) as Sync.Storage

	return current
}
