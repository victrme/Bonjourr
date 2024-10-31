import { SYNC_DEFAULT } from '../defaults'
import onSettingsLoad from '../utils/onsettingsload'
import storage, { getSyncDefaults, migrateWebExtStorageTo } from '../storage'
import networkForm from '../utils/networkform'
import parse from '../utils/parse'

type SyncType = Sync.SettingsSync['type']
type SyncFreq = Sync.SettingsSync['freq']

interface SyncUpdate {
	type?: string
	freq?: string
	url?: string
	gist?: string
	down?: true
	up?: true
}

const gistsyncform = networkForm('f_gistsync')
const urlsyncform = networkForm('f_urlsync')

export default async function synchronization(init?: Sync.Storage, update?: SyncUpdate): Promise<undefined> {
	if (init) {
		onSettingsLoad(() => toggleSyncSettingsOption(init.settingssync))
	}

	if (update) {
		updateSyncOption(update)
	}
}

async function updateSyncOption(update: SyncUpdate) {
	const data = await storage.sync.get()
	const local = await storage.local.get('gist')
	const sync = data.settingssync ?? { ...SYNC_DEFAULT.settingssync }

	if (update.down) {
		if (sync.type === 'gist') {
			// control sync with gist
			// replace storage
			// reload page
		}
		return
	}

	if (update.up) {
		controlSync(sync, 'up')
		return
	}

	if (update.gist === '') {
		storage.local.remove('gist')
		return
	}

	if (update.url === '') {
		sync.url = undefined
	}

	if (update.gist) {
		gistsyncform.load()

		const isValid = await isGistTokenValid(update.gist)

		if (isValid === false) {
			gistsyncform.warn('Error !!!!')
		}

		document.getElementById('gist-sync')?.classList.remove('shown')
		gistsyncform.accept()

		sync.gistid = await createGist(update.gist)
		storage.local.set({ gist: update.gist })
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
		if (update.type === 'off') await migrateWebExtStorageTo('local')
		if (update.type === 'auto') await migrateWebExtStorageTo('sync')

		sync.type = update.type
	}

	if (update.freq && isSyncFreq(update.freq)) {
		sync.freq = update.freq
	}

	toggleSyncSettingsOption(sync)
	storage.sync.set({ settingssync: sync })
}

async function controlSync(sync: Sync.SettingsSync, gisttoken?: string): Promise<Sync.Storage | undefined> {
	const { gistid, freq, last, type } = sync
	const now = new Date().getTime()

	if (freq === 'manual') {
		return
	}
	if (freq === 'start') {
		// ah ouais probleme
	}
	if (freq === 'newtabs') {
		// do nothing
	}

	console.log('Did something')

	if (sync.type === 'gist' && sync.gistid) {
		const token = gisttoken ?? (await storage.local.get('gist'))?.gist ?? ''
		const newdata = await retrieveGist(token, sync.gistid)
		return newdata
	}
}

async function toggleSyncSettingsOption(sync: Sync.SettingsSync) {
	const { type, freq } = sync

	if (type !== 'gist') document.getElementById('b_upsync')?.setAttribute('disabled', '')
	if (type === 'gist') document.getElementById('b_upsync')?.removeAttribute('disabled')

	document.getElementById('sync-freq')?.classList.toggle('shown', !(type === 'auto' || type === 'off'))
	document.getElementById('manual-sync')?.classList.toggle('shown', freq === 'manual')
	document.getElementById('url-sync')?.classList.toggle('shown', type === 'url')

	if (type === 'gist') {
		const token = (await storage.local.get('gist')).gist
		const gistid = (await storage.sync.get('settingssync')).settingssync.gistid
		const isValid = !!token && !!gistid && !!(await retrieveGist(token, gistid))

		document.getElementById('gist-sync')?.classList.toggle('shown', isValid === false)
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

export async function syncWithGist(token: string, id: string, last = 0): Promise<Sync.Storage> {
	return getSyncDefaults()
}

async function isGistTokenValid(token?: string): Promise<boolean> {
	if (!token) {
		return false
	}

	const ISODate = new Date()?.toISOString()
	const resp = await fetch(`https://api.github.com/gists?since=${ISODate}`, { headers: gistHeaders(token) })

	return resp.status === 200
}

async function retrieveGist(token: string, id: string): Promise<Sync.Storage | undefined> {
	type GistGet = { files: { content: string }[] }

	const req = await fetch(`https://api.github.com/gists/${id}`, { headers: gistHeaders(token) })

	if (req.status === 200) {
		const gist = (await req.json()) as GistGet
		const content = Object.values(gist?.files ?? {})[0]?.content ?? ''
		return parse(content)
	}
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
