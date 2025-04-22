import './document.ts'

import { assert } from 'jsr:@std/assert'
import { stringify } from '../src/scripts/utils/stringify.ts'
import { filterImports } from '../src/scripts/imports.ts'
import { LOCAL_DEFAULT, SYNC_DEFAULT } from '../src/scripts/defaults.ts'

Deno.test('Filter imports is working', async () => {
	filterImports(SYNC_DEFAULT, {})
})

Deno.test('Basic import', async () => {
	const defaults = stringify(SYNC_DEFAULT)
	const config = stringify(filterImports(SYNC_DEFAULT, { time: true, main: true, lang: 'en' }))

	assert(defaults === config)
})

// Deno.test('read file test',
// 	fn: () => {
// 		// const data = Deno.readTextFileSync('./somefile.txt')
// 		assertEquals(JSON.stringify(SYNC_DEFAULT), JSON.stringify(SYNC_DEFAULT))
// 	},
// })
