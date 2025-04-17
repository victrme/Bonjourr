import { getLang, tradThis } from '../../utils/translations'
import { isStorageDefault } from '../../storage'

import type { Sync } from '../../../types/sync'

interface GistItem {
	url: string
	forks_url: string
	commits_url: string
	id: string
	node_id: string
	git_pull_url: string
	git_push_url: string
	html_url: string
	files: Record<string, GistFile>
	public: boolean
}

interface GistFile {
	filename: string
	type: string
	language: string
	raw_url: string
	size: number
}

export async function setGistStatus(token?: string, id?: string): Promise<boolean> {
	const wrapper = document.getElementById('gist-sync-status-wrapper') as HTMLElement
	const base = document.getElementById('gist-sync-status-base') as HTMLSpanElement

	if (!token) {
		document.querySelector('#gist-sync-status')?.remove()
		base.textContent = tradThis('Waiting for authentification')
		return false
	}

	if (!id) {
		document.querySelector('#gist-sync-status')?.remove()
		base.textContent = tradThis('No saved data yet')
		return false
	}

	const resp = await fetch(`https://api.github.com/gists/${id}`, { headers: gistHeaders(token) })

	if (resp.status !== 200) {
		document.querySelector('#gist-sync-status')?.remove()
		base.textContent = tradThis('No saved data yet')
		return false
	}

	const json = await resp.json()
	const isoDate = json.updated_at
	const dateString = new Date(isoDate).toLocaleString(getLang(), {
		day: '2-digit',
		month: '2-digit',
		year: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	})

	document.querySelector('#gist-sync-status')?.remove()

	const link = document.createElement('a')
	link.id = 'gist-sync-status'
	link.href = json.html_url
	link.textContent = dateString

	wrapper?.appendChild(link)

	base.textContent = tradThis('Last update')

	return true
}

export async function retrieveGist(token: string, id?: string): Promise<Sync> {
	type GistGet = { files: { content: string }[] }

	if (!token) {
		throw new Error(GIST_ERROR.TOKEN)
	}
	if (!id) {
		throw new Error(GIST_ERROR.ID)
	}

	const req = await fetch(`https://api.github.com/gists/${id}`, {
		headers: gistHeaders(token),
	})

	if (req.status === 200) {
		const gist = (await req.json()) as GistGet
		const content = Object.values(gist?.files ?? {})[0]?.content ?? ''

		try {
			return JSON.parse(content)
		} catch (_) {
			throw new Error(GIST_ERROR.JSON)
		}
	}

	throw new Error(GIST_ERROR.OTHER)
}

export async function sendGist(token: string, id: string | undefined, data: Sync): Promise<string> {
	const description =
		'File automatically generated by Bonjourr. Learn more on https://bonjourr.fr/docs/overview/#sync'
	const files = { 'bonjourr-export.json': { content: JSON.stringify(data, undefined, 2) } }

	// Check default settings

	if (isStorageDefault(data)) {
		throw new Error(GIST_ERROR.DEFAULT)
	}

	// Create

	if (id === undefined) {
		const resp = await fetch('https://api.github.com/gists', {
			body: JSON.stringify({ files, description, public: false }),
			headers: gistHeaders(token),
			method: 'POST',
		})

		if (resp.status === 401) {
			throw new Error(GIST_ERROR.TOKEN)
		}
		if (resp.status >= 300) {
			throw new Error(GIST_ERROR.OTHER)
		}

		const api = await resp.json()

		return api.id
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

	if (resp.status === 404) {
		throw new Error(GIST_ERROR.NOGIST)
	}
	if (resp.status === 401) {
		throw new Error(GIST_ERROR.TOKEN)
	}
	if (resp.status >= 300) {
		throw new Error(GIST_ERROR.OTHER)
	}

	return id
}

export async function findGistId(token?: string): Promise<string | undefined> {
	if (!token) {
		throw new Error(GIST_ERROR.TOKEN)
	}

	const resp = await fetch('https://api.github.com/gists?per_page=100', { headers: gistHeaders(token) })

	if (resp.status === 401) {
		throw new Error(GIST_ERROR.TOKEN)
	}
	if (resp.status >= 300) {
		throw new Error(GIST_ERROR.OTHER)
	}

	const list = (await resp.json()) as GistItem[]
	const file = list.filter(gist => !gist.public && gist.files['bonjourr-export.json']?.size > 0)[0]

	return file?.id
}

export async function isGistTokenValid(token = ''): Promise<boolean> {
	if (!token) {
		return false
	}

	try {
		const isoDate = new Date()?.toISOString()
		const resp = await fetch(`https://api.github.com/gists?since=${isoDate}`, {
			headers: gistHeaders(token),
		})

		return resp.status === 200
	} catch (_) {
		return false
	}
}

function isGistIdValid(id?: string): boolean {
	if (!id || id.length > 32) {
		return false
	}

	for (const char of id) {
		const code = char.charCodeAt(0)
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
	TOKEN: tradThis('Invalid token'),
	NOGIST: tradThis('Cannot find bonjourr file in gists'),
	NOCONN: tradThis('Cannot access Github servers right now'),
	JSON: tradThis('Response is not valid JSON'),
	OTHER: tradThis('Some Github Gist error happend'),
	DEFAULT: tradThis('Tried to send default config'),
}
