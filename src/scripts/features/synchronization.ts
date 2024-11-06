import onSettingsLoad from '../utils/onsettingsload'
import networkForm from '../utils/networkform'
import storage from '../storage'
import parse from '../utils/parse'
import { apiFetch } from '../utils'
import { tradThis } from '../utils/translations'

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
			const id = sync.gistid ?? ''
			const token = local?.gistToken ?? ''
			const response = await retrieveGist(token, id)

			if (response) {
				storage.sync.set(response)
				setTimeout(() => window.location.reload(), 100)
			}
		}

		return
	}

	if (update.up) {
		if (sync.type === 'gist') {
			const id = sync.gistid ?? ''
			const token = local?.gistToken ?? ''
			const updatedData = await sendGist(token, id, data)

			storage.sync.set(updatedData)
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

		if (await isGistTokenValid(update.gistToken)) {
			const updatedData = await sendGist(update.gistToken, sync.gistid, data)

			sync.gistid = updatedData.settingssync.gistid
			sync.last = updatedData.settingssync.last

			document.getElementById('gist-sync')?.classList.remove('shown')
			gistsyncform.accept()

			storage.local.set({ gistToken: update.gistToken })
		}
		//
		else {
			gistsyncform.warn('Error !!!!')
		}
	}

	if (update.url) {
		urlsyncform.load()

		const config = await getConfigFromUrl(update.url)

		if (config) {
			urlsyncform.accept('i_urlsync', update.url)
			sync.url = update.url
			console.log(config)
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

	data.settingssync = sync

	toggleSyncSettingsOption(sync)
	storage.sync.set(data)
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

			document.getElementById('gist-sync')?.classList.add('shown')
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
	let config: Sync.Storage | undefined = undefined

	try {
		const resp = await fetch(url)
		const text = await resp.text()
		config = parse(text)
	} catch (_) {
		console.log('Failed to get data, CORS ?')

		try {
			const resp = await apiFetch('/proxy?query=' + url)
			const text = await resp?.text()
			config = parse(text)
		} catch (_) {
			console.log('Failed to get data with proxy, Bad request')
		}
	}

	if (config?.about) {
		return config
	}
}

// Github Gist

async function retrieveGist(token: string, id: string): Promise<Sync.Storage | undefined> {
	type GistGet = { files: { content: string }[] }

	if (!token) {
		throw new Error(GIST_ERROR.TOKEN)
	}

	const req = await fetch(`https://api.github.com/gists/${id}`, {
		headers: gistHeaders(token),
	})

	if (req.status === 200) {
		const gist = (await req.json()) as GistGet
		const content = Object.values(gist?.files ?? {})[0]?.content ?? ''
		return parse(content)
	}
}

async function sendGist(token: string, id: string | undefined, data: Sync.Storage): Promise<Sync.Storage> {
	const description = 'File automatically generated by Bonjourr. Learn more on https://bonjourr.fr/docs/overview/#sync'
	const files = { 'bonjourr-export.json': { content: JSON.stringify(data, undefined, 2) } }

	// Create

	if (id === undefined) {
		const resp = await fetch('https://api.github.com/gists', {
			body: JSON.stringify({ files, description, public: false }),
			headers: gistHeaders(token),
			method: 'POST',
		})

		if (resp.status === 401) throw new Error(GIST_ERROR.TOKEN)
		if (resp.status >= 300) throw new Error(GIST_ERROR.OTHER)

		const gist = await resp.json()
		id = gist.id

		data.settingssync.gistid = id
		files['bonjourr-export.json'].content = JSON.stringify(data, undefined, 2)
	}

	if (isGistIdValid(id) === false) {
		throw new Error(GIST_ERROR.ID)
	}

	// Update

	const resp = await fetch(`https://api.github.com/gists/${id}`, {
		body: JSON.stringify({ files, description }),
		headers: gistHeaders(token),
		method: 'PATCH',
	})

	if (resp.status === 404) throw new Error(GIST_ERROR.NOGIST)
	if (resp.status === 401) throw new Error(GIST_ERROR.TOKEN)
	if (resp.status >= 300) throw new Error(GIST_ERROR.OTHER)

	data.settingssync.last = new Date().toISOString()

	return data
}

async function isGistTokenValid(token?: string): Promise<true> {
	if (!token) {
		throw new Error(GIST_ERROR.TOKEN)
	}

	const ISODate = new Date()?.toISOString()
	const resp = await fetch(`https://api.github.com/gists?since=${ISODate}`, {
		headers: gistHeaders(token),
	})

	if (resp.status === 401) throw new Error(GIST_ERROR.TOKEN)
	if (resp.status >= 300) throw new Error(GIST_ERROR.OTHER)

	return true
}

function isGistIdValid(id?: string): boolean {
	if (!id || id.length > 32) {
		return false
	}

	for (let i = 0; i < id.length; i++) {
		const code = id[i].charCodeAt(0)
		const isHex = (code >= 97 && code <= 102) || (code >= 48 && code <= 57)

		if (!isHex) {
			return false
		}
	}

	return true
}

function gistHeaders(token: string) {
	return {
		Authorization: `Bearer ${token}`,
		Accept: 'application/vnd.github+json',
		'X-GitHub-Api-Version': '2022-11-28',
	}
}

const GIST_ERROR = {
	ID: tradThis('Gist id in settings is invalid'),
	TOKEN: tradThis('Invalid authentification token'),
	NOGIST: tradThis('Cannot find bonjourr file in gists'),
	NOCONN: tradThis('Cannot access Github servers right now'),
	OTHER: tradThis('Some Github Gist error happend'),
}

// Type check

function isSyncType(val: string): val is SyncType {
	return ['auto', 'gist', 'url', 'off'].includes(val)
}

function isSyncFreq(val: string): val is SyncFreq {
	return ['newtabs', 'start', 'manual'].includes(val)
}
