import { tradThis } from '../../utils/translations'
import { apiFetch } from '../../utils'

export async function receiveFromURL(url = ''): Promise<Sync.Storage> {
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
			resp = (await apiFetch('/proxy?query=' + url)) ?? new Response()
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

const DISTANT_ERROR = {
	URL: tradThis('Not a valid URL'),
	FAIL: tradThis('Cannot access resource right now'),
	PROXY: tradThis('Cannot access resource, even with proxy'),
	JSON: tradThis('Response is not valid JSON'),
}
