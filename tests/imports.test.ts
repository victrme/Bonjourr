import './document.ts'
import 'clickdown'

import { assertEquals } from 'jsr:@std/assert'
import { filterImports } from '../src/scripts/imports.ts'
import { LOCAL_DEFAULT, SYNC_DEFAULT } from '../src/scripts/defaults.ts'

Deno.test('Filter imports is working', async () => {
	filterImports
})

// Deno.test('read file test',
// 	fn: () => {
// 		// const data = Deno.readTextFileSync('./somefile.txt')
// 		assertEquals(JSON.stringify(SYNC_DEFAULT), JSON.stringify(SYNC_DEFAULT))
// 	},
// })
