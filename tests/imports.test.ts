import { assert } from 'jsr:@std/assert'
import './init.test.ts'

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

Deno.test('1.10', () => {
	const text = Deno.readTextFileSync('./tests/configs/1.10.0.json')
	const old = JSON.parse(text)
	const res = filterImports(defaults, old)

	assert(Array.isArray(res.hide) === false)
	assert(old.background_blur === res.backgrounds.blur)
	assert(old.searchbar_engine === res.searchbar.engine)
	assert(JSON.stringify(res).includes('https://www.youtube.com/'))
	assert(JSON.stringify(res).includes('https://api.faviconkit.com/www.youtube.com/144'))
})
