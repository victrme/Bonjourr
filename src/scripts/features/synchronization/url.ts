import { tradThis } from '../../utils/translations.ts'
import type { Sync } from '../../../types/sync.ts'

export async function receiveFromURL(url = ''): Promise<Sync> {
	let resp: Response

	try {
		new URL(url)
	} catch (_) {
		throw new Error(DISTANT_ERROR.URL)
	}

	try {
		resp = await fetch(url)
	} catch (_) {
		try {
			resp = await fetch('https://services.bonjourr.fr/proxy', {
				method: 'POST',
				body: url,
			})
		} catch (_) {
			throw new Error(DISTANT_ERROR.PROXY)
		}
	}

	try {
		return JSON.parse(await resp.text())
	} catch (_) {
		throw new Error(DISTANT_ERROR.JSON)
	}
}

export async function isDistantUrlValid(url = ''): Promise<boolean> {
	try {
		await receiveFromURL(url)
		return true
	} catch (_) {
		return false
	}
}

const DISTANT_ERROR = {
	URL: tradThis('Not a valid URL'),
	FAIL: tradThis('Cannot access resource right now'),
	PROXY: tradThis('Cannot access resource, even with proxy'),
	JSON: tradThis('Response is not valid JSON'),
}
