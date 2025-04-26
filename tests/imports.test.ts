import { assert } from '@std/assert'
import './init.test.ts'

import type { Link } from '../src/types/shared.ts'

// Import script after test init, document needs to be loaded first
import { SYNC_DEFAULT } from '../src/scripts/defaults.ts'
import { filterImports } from '../src/scripts/imports.ts'

const defaults = structuredClone(SYNC_DEFAULT)

Deno.test('Global exists', () => {
	assert(globalThis.document)
})

Deno.test('Filter imports is working', () => {
	filterImports(defaults, {})
})

Deno.test('Current version small import', () => {
	const config = filterImports(defaults, { time: false, main: false, lang: 'en' })

	assert(defaults.time !== config.time)
	assert(defaults.main !== config.main)
	assert(defaults.lang === config.lang)
})

Deno.test('1.10', async (t) => {
	const text = Deno.readTextFileSync('./tests/configs/old.1.10.0.json')
	const old = JSON.parse(text)
	const res = filterImports(defaults, old)

	await t.step('Hide', () => {
		assert(Array.isArray(res.hide) === false)
	})

	await t.step('Links', () => {
		const allkeys = Object.keys(res)
		const linkkeys = allkeys.filter((key) => key.length === 11 && key.includes('links'))

		// Correct fields
		assert(res.links === undefined)
		assert(linkkeys.length > 0)

		// Correct links
		assert(JSON.stringify(res).includes('https://www.youtube.com/'))
		assert(JSON.stringify(res).includes('https://api.faviconkit.com/www.youtube.com/144'))

		// Links are valid
		const key = linkkeys[0]
		const link = res[key] as Link

		assert(typeof link._id === 'string')
		assert(typeof link.order === 'number')
		assert(link.parent === 'default')
	})

	await t.step('Backgrounds', () => {
		assert(old.background_blur === res.backgrounds.blur)
	})

	await t.step('Searchbar', () => {
		assert(old.searchbar_engine === res.searchbar.engine)
		assert(old.searchbar_newtab === res.searchbar.newtab)
	})
})
