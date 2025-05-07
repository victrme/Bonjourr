import { findGistId, isGistTokenValid, retrieveGist, sendGist, setGistStatus } from './gist.ts'
import { isDistantUrlValid, receiveFromURL } from './url.ts'
import { onSettingsLoad } from '../../utils/onsettingsload.ts'
import { networkForm } from '../../shared/form.ts'
import { fadeOut } from '../../shared/dom.ts'
import { storage } from '../../storage.ts'

import type { Local, SyncType } from '../../../types/local.ts'

interface SyncUpdate {
	type?: string
	freq?: string
	url?: string
	status?: string
	gistToken?: string
	firefoxPersist?: boolean
	down?: true
	up?: true
}

const gistsyncform = networkForm('f_gistsync')
const urlsyncform = networkForm('f_urlsync')

export function synchronization(init?: Local, update?: SyncUpdate) {
	if (init) {
		onSettingsLoad(() => {
			toggleSyncSettingsOption(init)
			setTimeout(() => handleStoragePersistence(init.syncType), 200)
		})
	}

	if (update) {
		updateSyncOption(update)
	}
}

async function updateSyncOption(update: SyncUpdate) {
	const local = await storage.local.get(['gistId', 'gistToken', 'distantUrl', 'syncType'])
	const data = await storage.sync.get()

	if (update.down) {
		if (local.syncType === 'gist') {
			gistsyncform.load()

			try {
				const id = local.gistId ?? ''
				const token = local.gistToken ?? ''
				const update = await retrieveGist(token, id)
				storage.sync.set(update)
				fadeOut()
			} catch (err) {
				gistsyncform.warn(err as string)
			}
		}

		if (local.syncType === 'url') {
			urlsyncform.load()

			try {
				const update = await receiveFromURL(local.distantUrl)
				storage.sync.set(update)
				fadeOut()
			} catch (err) {
				urlsyncform.warn(err as string)
			}
		}
	}

	if (update.up) {
		if (local.syncType === 'gist') {
			gistsyncform.load()

			try {
				const token = local.gistToken ?? ''
				const id = await sendGist(token, local.gistId, data)

				gistsyncform.accept()

				local.gistId = id
				storage.local.set({ gistId: id })
				toggleSyncSettingsOption(local)
			} catch (error) {
				gistsyncform.warn(error as string)
			}
		}
	}

	if (update.gistToken === '') {
		local.gistToken = ''
		local.gistId = ''
		storage.local.remove('gistToken')
		storage.local.remove('gistId')
		gistsyncform.accept()
		toggleSyncSettingsOption(local)
		return
	}

	if (update.url === '') {
		local.distantUrl = ''
		storage.local.remove('distantUrl')
		toggleSyncSettingsOption(local)
		return
	}

	if (update.gistToken) {
		gistsyncform.load()

		try {
			local.gistToken = update.gistToken
			local.gistId = await findGistId(local.gistToken)

			storage.local.set({ gistId: local.gistId })
			storage.local.set({ gistToken: local.gistToken })

			gistsyncform.accept()
			toggleSyncSettingsOption(local)
		} catch (error) {
			gistsyncform.warn(error as string)
		}
	}

	if (update.url) {
		urlsyncform.load()

		try {
			await receiveFromURL(update.url)
			urlsyncform.accept('i_urlsync', update.url)

			local.distantUrl = update.url
			storage.local.set({ distantUrl: update.url })
			toggleSyncSettingsOption(local)
		} catch (error) {
			urlsyncform.warn(error as string)
		}
	}

	if (isSyncType(update.type)) {
		local.syncType = update.type
		storage.local.set({ syncType: local.syncType })
		storage.type.change(update.type === 'browser' ? 'sync' : 'local', data)

		toggleSyncSettingsOption(local)
		handleStoragePersistence(update.type)
	}

	if (update.firefoxPersist) {
		localStorage.choseStoragePersistence = 'true'
		toggleSyncSettingsOption(local)
	}
}

async function handleStoragePersistence(type?: SyncType): Promise<boolean | undefined> {
	if (!navigator?.storage?.persisted) {
		return
	}

	const persisted = await navigator.storage.persisted()

	if (type !== 'off') {
		return
	}

	if (!persisted) {
		await navigator.storage.persist()
	}
}

async function toggleSyncSettingsOption(local?: Local) {
	const gistId = local?.gistId
	const gistToken = local?.gistToken
	const distantUrl = local?.distantUrl
	const type = local?.syncType

	const iGistsync = document.querySelector<HTMLInputElement>('#i_gistsync')
	const iUrlsync = document.querySelector<HTMLInputElement>('#i_urlsync')
	const bGistdown = document.querySelector<HTMLInputElement>('#b_gistdown')
	const bGistup = document.querySelector<HTMLInputElement>('#b_gistup')
	const bUrldown = document.querySelector<HTMLInputElement>('#b_urldown')

	bGistdown?.setAttribute('disabled', '')
	bUrldown?.setAttribute('disabled', '')
	bGistup?.setAttribute('disabled', '')

	if (iGistsync && gistToken) {
		iGistsync.value = gistToken
	}
	if (iUrlsync && distantUrl) {
		iUrlsync.value = distantUrl
	}

	const choseStoragePersistence = localStorage.choseStoragePersistence === 'true'
	document.getElementById('disabled-sync')?.classList.toggle('shown', !choseStoragePersistence)

	switch (type) {
		case 'off':
		case 'browser': {
			document.getElementById('url-sync')?.classList.remove('shown')
			document.getElementById('sync-freq')?.classList.remove('shown')
			document.getElementById('gist-sync')?.classList.remove('shown')
			break
		}

		case 'gist': {
			document.getElementById('gist-sync')?.classList.add('shown')
			document.getElementById('url-sync')?.classList.remove('shown')
			document.getElementById('disabled-sync')?.classList.remove('shown')

			const isValid = await isGistTokenValid(gistToken)

			if (isValid) {
				bGistdown?.removeAttribute('disabled')
				bGistup?.removeAttribute('disabled')
			}

			setGistStatus(gistToken, gistId)

			break
		}

		case 'url': {
			document.getElementById('url-sync')?.classList.add('shown')
			document.getElementById('gist-sync')?.classList.remove('shown')
			document.getElementById('disabled-sync')?.classList.remove('shown')

			if (await isDistantUrlValid(distantUrl)) {
				bUrldown?.removeAttribute('disabled')
			}

			break
		}

		default:
	}
}

// Type check

function isSyncType(val = ''): val is SyncType {
	return ['browser', 'gist', 'url', 'off'].includes(val)
}

// function isSyncFreq(val: string): val is SyncFreq {
// 	return ['newtabs', 'start', 'manual'].includes(val)
// }
