import { syncDefaults, convertHideStorage, randomString, bundleLinks } from '../utils'
import { MoveKeys, Sync, Move } from '../types/sync'
import { gridWidget } from '../features/move'
import merge from 'deepmerge'

export default function filterImports(current: Sync, toImport: Sync) {
	//
	// <1.16.0 hide is now ids object, not number array
	if (Array.isArray(toImport.hide)) {
		toImport.hide = convertHideStorage(toImport.hide)

		toImport.time = !(toImport.hide.clock && toImport.hide.date) ?? true
		toImport.main = !(toImport.hide.weatherdesc && toImport.hide.weathericon && toImport.hide.weathericon) ?? true
	}

	// <1.17.0 dynamic/custom becomes unsplash/local
	if ((toImport.background_type as string) === 'dynamic') toImport.background_type = 'unsplash'
	if ((toImport.background_type as string) === 'custom') toImport.background_type = 'local'

	// <1.17.0 dynamic data renamed to unsplash
	if (toImport.dynamic as Sync['unsplash']) {
		toImport.unsplash = {
			...(toImport.dynamic as Sync['unsplash']),
			pausedImage: null,
		}

		delete toImport.dynamic
	}

	// <1.9.0 searchbar options was boolean
	if (typeof toImport.searchbar === 'boolean') {
		toImport.searchbar = {
			...syncDefaults.searchbar,
			on: toImport.searchbar as boolean,
			newtab: (toImport.searchbar_newtab as boolean) || false,
			engine: (toImport.searchbar_engine as string | undefined)?.replace('s_', '') || 'google',
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

		;(toImport.links as Link[])?.forEach(({ title, url, icon }: Link, i: number) => {
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
			current.move.selection = 'single'
		}

		let layout = structuredClone(current.move.layouts[current.move.selection])
		const diffEntries = Object.entries(diffWidgets).filter(([_, diff]) => diff === true)

		// mutate grid: add or remove widgets that are different from current data
		diffEntries.forEach(([key, _]) => {
			layout.grid = gridWidget(
				layout.grid,
				current.move.selection,
				key as MoveKeys,
				importStates[key as keyof typeof importStates]
			)
		})

		current.move.layouts[current.move.selection].grid = layout.grid
		current.move.layouts[current.move.selection].items = layout.items
	}

	// Remove current layouts grid if import has grids
	// because deepmerge of arrays concats them
	if (toImport.move && current.move) {
		Object.entries(toImport.move?.layouts).forEach(([key, layout]) => {
			const keyIsValidLayout = key in current.move.layouts
			const layoutKey = key as keyof Move['layouts']

			if (layout.grid && keyIsValidLayout) {
				current.move.layouts[layoutKey].grid = []
			}
		})
	}

	// To avoid link duplicates: delete current links
	bundleLinks(current).forEach((elem: Link) => {
		delete current[elem._id]
	})

	current = merge(current, toImport)
	current.about = { ...syncDefaults.about }

	return current
}
