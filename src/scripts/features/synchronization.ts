import onSettingsLoad from '../utils/onsettingsload'
import networkForm from '../utils/networkform'
import storage from '../storage'
import parse from '../utils/parse'

type SyncType = Sync.SettingsSync['type']
type SyncFreq = Sync.SettingsSync['freq']
type Tokens = Pick<Local.Storage, 'gistToken' | 'pastebinToken'>

interface SyncUpdate {
	type?: string
	freq?: string
	url?: string
	gistToken?: string
	down?: true
	up?: true
}

const gistsyncform = networkForm('f_gistsync')
const urlsyncform = networkForm('f_urlsync')

export default function synchronization(init?: Sync.Storage, update?: SyncUpdate) {
	if (init) {
		onSettingsLoad(() => toggleSyncSettingsOption(init.settingssync))
	}

	if (update) {
		updateSyncOption(update)
	}
}

async function updateSyncOption(update: SyncUpdate) {
	const data = await storage.sync.get()
	const local = await storage.local.get(['gistToken', 'pastebinToken'])
	const sync = data.settingssync

	if (update.down) {
		if (sync.type === 'gist') {
			const id = sync.gistid
			const token = local?.gistToken

			if (!id || !token) {
				console.warn('error in gist id or token', id, token)
			} else {
				const response = await retrieveGist(token, id)

				if (response) {
					storage.sync.set(response)
					setTimeout(() => window.location.reload(), 100)
				}
			}
		}

		return
	}

	if (update.up) {
		if (sync.type === 'gist') {
			const id = sync.gistid
			const token = local?.gistToken

			if (!id || !token) {
				console.warn('error in gist id or token', id, token)
			} else {
				data.settingssync.last = new Date().toISOString()

				const response = await updateGist(token, id, data)
				console.log(response)

				storage.sync.set(data)
			}
		}

		return
	}

	if (update.gistToken === '') {
		storage.local.remove('gist')
		return
	}

	if (update.url === '') {
		sync.url = undefined
	}

	if (update.gistToken) {
		gistsyncform.load()

		const isValid = await isGistTokenValid(update.gistToken)

		if (isValid === false) {
			gistsyncform.warn('Error !!!!')
		}

		sync.gistid = await createGist(update.gistToken)

		document.getElementById('gist-sync')?.classList.remove('shown')
		gistsyncform.accept()

		storage.local.set({ gistToken: update.gistToken })
	}

	if (update.url) {
		urlsyncform.load()

		const config = await getConfigFromUrl(update.url)

		if (config) {
			urlsyncform.accept('i_urlsync', update.url)
			sync.url = update.url
		} else {
			urlsyncform.warn('Cannot get JSON')
		}
	}

	if (update.type && isSyncType(update.type)) {
		const toLocal = sync.type !== 'off' && update.type === 'off'
		const toSync = sync.type === 'off' && update.type !== 'off'

		sync.type = update.type

		// <!> Set & return here because
		// <!> awaits in if() doesn't have priority

		if (toLocal) {
			await chrome.storage.sync.clear()
			await chrome.storage.local.set({ sync: data })
			sessionStorage.setItem('WEBEXT_LOCAL', 'yes')
			toggleSyncSettingsOption(sync)
			return
		}

		if (toSync) {
			await chrome.storage.local.remove('sync')
			await chrome.storage.sync.set(data)
			sessionStorage.removeItem('WEBEXT_LOCAL')
			toggleSyncSettingsOption(sync)
			return
		}
	}

	// if (update.freq && isSyncFreq(update.freq)) {
	// 	sync.freq = update.freq
	// }

	toggleSyncSettingsOption(sync)
	storage.sync.set({ settingssync: sync })
}

export async function controlSync(sync: Sync.SettingsSync, tokens?: Tokens): Promise<Sync.Storage | undefined> {
	if (sync.type === 'gist') {
		const id = sync.gistid
		const token = tokens?.gistToken

		if (id && token) {
			return await retrieveGist(token, id)
		}
	}
}

async function toggleSyncSettingsOption(sync: Sync.SettingsSync) {
	switch (sync.type) {
		case 'off':
		case 'auto': {
			document.getElementById('url-sync')?.classList.remove('shown')
			document.getElementById('sync-freq')?.classList.remove('shown')
			document.getElementById('gist-sync')?.classList.remove('shown')
			document.getElementById('manual-sync')?.classList.remove('shown')
			break
		}

		case 'gist': {
			const token = (await storage.local.get('gistToken')).gistToken
			const gistid = (await storage.sync.get('settingssync')).settingssync.gistid
			const isValid = !!token && !!gistid && !!(await retrieveGist(token, gistid))

			document.getElementById('gist-sync')?.classList.toggle('shown', isValid === false)
			document.getElementById('manual-sync')?.classList.toggle('shown', isValid === true)
			document.getElementById('b_upsync')?.removeAttribute('disabled')
			document.getElementById('url-sync')?.classList.remove('shown')
			break
		}

		case 'url': {
			document.getElementById('b_upsync')?.setAttribute('disabled', '')
			document.getElementById('url-sync')?.classList.add('shown')
			document.getElementById('manual-sync')?.classList.add('shown')
			document.getElementById('gist-sync')?.classList.remove('shown')
			break
		}
	}
}

// Distant URL

async function getConfigFromUrl(url: string): Promise<Sync.Storage | undefined> {
	console.log('Got config, thanks !!!')

	// try {
	// 	const resp = await fetch(url)

	// 	console.log(resp)

	// 	if (json) {
	// 		// ...
	// 		// verify json

	// 		return json
	// 	}
	// } catch (error) {
	// 	console.warn(error)
	// }

	return
}

// Github Gist

async function isGistTokenValid(token?: string): Promise<boolean> {
	if (!token) {
		return false
	}

	const ISODate = new Date()?.toISOString()
	const resp = await fetch(`https://api.github.com/gists?since=${ISODate}`, {
		headers: gistHeaders(token),
	})

	return resp.status === 200
}

async function retrieveGist(token: string, id: string): Promise<Sync.Storage | undefined> {
	type GistGet = { files: { content: string }[] }

	const req = await fetch(`https://api.github.com/gists/${id}`, {
		headers: gistHeaders(token),
	})

	if (req.status === 200) {
		const gist = (await req.json()) as GistGet
		const content = Object.values(gist?.files ?? {})[0]?.content ?? ''
		return parse(content)
	}
}

async function updateGist(token: string, id: string, data: Sync.Storage): Promise<boolean> {
	const description = 'File automatically generated by Bonjourr. Learn more on https://bonjourr.fr/docs/overview/#sync'
	const files = { 'bonjourr-export.json': { content: JSON.stringify(data, undefined, 2) } }

	const req = await fetch(`https://api.github.com/gists/${id}`, {
		method: 'PATCH',
		headers: gistHeaders(token),
		body: JSON.stringify({ files, description }),
	})

	return req.status === 200
}

async function createGist(token: string): Promise<string> {
	const data = await storage.sync.get()

	const files = { 'bonjourr-export.json': { content: JSON.stringify(data, undefined, 2) } }
	const description = 'File automatically generated by Bonjourr. Learn more on https://bonjourr.fr/docs/overview/#sync'

	const sent = await fetch('https://api.github.com/gists', {
		body: JSON.stringify({ files, description, public: false }),
		headers: gistHeaders(token),
		method: 'POST',
	})

	const gist = await sent.json()
	const id = gist.id

	data.settingssync.last = new Date().toISOString()
	data.settingssync.gistid = id

	updateGist(token, id, data)

	return id
}

function gistHeaders(token: string) {
	return {
		Authorization: `Bearer ${token}`,
		Accept: 'application/vnd.github+json',
		'X-GitHub-Api-Version': '2022-11-28',
	}
}

// Type check

function isSyncType(val: string): val is SyncType {
	return ['auto', 'gist', 'url', 'off'].includes(val)
}

function isSyncFreq(val: string): val is SyncFreq {
	return ['newtabs', 'start', 'manual'].includes(val)
}
