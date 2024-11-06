import { retrieveGist, sendGist, isGistTokenValid } from './gist'
import { receiveFromURL } from './url'
import onSettingsLoad from '../../utils/onsettingsload'
import networkForm from '../../utils/networkform'
import { fadeOut } from '../../utils'
import storage from '../../storage'

type SyncType = Sync.SettingsSync['type']
type SyncFreq = Sync.SettingsSync['freq']

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
			gistsyncform.load()

			try {
				const id = sync.gistid ?? ''
				const token = local.gistToken ?? ''
				const update = await retrieveGist(token, id)

				storage.sync.set(update)
				fadeOut()
			} catch (err) {
				gistsyncform.warn(err as string)
			}
		}

		if (sync.type === 'url') {
			urlsyncform.load()

			try {
				const update = await receiveFromURL(sync.url)

				storage.sync.set(update)
				fadeOut()
			} catch (err) {
				urlsyncform.warn(err as string)
			}
		}
	}

	if (update.up) {
		if (sync.type === 'gist') {
			gistsyncform.load()

			try {
				const id = sync.gistid ?? ''
				const token = local?.gistToken ?? ''
				const update = await sendGist(token, id, data)

				storage.sync.set(update)
				gistsyncform.accept()
			} catch (error) {
				gistsyncform.warn(error as string)
			}
		}
	}

	if (update.gistToken === '') {
		storage.local.remove('gist')
		return
	}

	if (update.url === '') {
		sync.url = undefined
		storage.sync.set({ settingssync: sync })
	}

	if (update.gistToken) {
		gistsyncform.load()

		if (await isGistTokenValid(update.gistToken)) {
			const { settingssync } = await sendGist(update.gistToken, sync.gistid, data)

			sync.gistid = settingssync.gistid
			sync.last = settingssync.last

			gistsyncform.accept()
			toggleSyncSettingsOption(sync)

			storage.sync.set({ settingssync: sync })
			storage.local.set({ gistToken: update.gistToken })
		} else {
			gistsyncform.warn('Error !!!!')
		}
	}

	if (update.url) {
		urlsyncform.load()

		try {
			await receiveFromURL(update.url)
			urlsyncform.accept('i_urlsync', update.url)

			sync.url = update.url
			toggleSyncSettingsOption(sync)
			storage.sync.set({ settingssync: sync })
		} catch (error) {
			urlsyncform.warn(error as string)
		}
	}

	if (update.type && isSyncType(update.type)) {
		const toLocal = sync.type !== 'off' && update.type === 'off'
		const toSync = sync.type === 'off' && update.type !== 'off'

		sync.type = update.type
		toggleSyncSettingsOption(sync)

		// <!> Set & return here because
		// <!> awaits in if() doesn't have priority

		if (toLocal) {
			await chrome.storage.sync.clear()
			await chrome.storage.local.set({ sync: data })
			sessionStorage.setItem('WEBEXT_LOCAL', 'yes')
		}

		if (toSync) {
			await chrome.storage.local.remove('sync')
			await chrome.storage.sync.set(data)
			sessionStorage.removeItem('WEBEXT_LOCAL')
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

// Type check

function isSyncType(val: string): val is SyncType {
	return ['auto', 'gist', 'url', 'off'].includes(val)
}

function isSyncFreq(val: string): val is SyncFreq {
	return ['newtabs', 'start', 'manual'].includes(val)
}
