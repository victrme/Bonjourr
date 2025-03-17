import quickLinks, { validateLink } from './index'
import { isLink } from './helpers'

import { EXTENSION, API_DOMAIN, PLATFORM } from '../../defaults'
import { getHTMLTemplate, toggleDisabled } from '../../shared/dom'
import { getLang, tradThis, traduction } from '../../utils/translations'
import { settingsNotifications } from '../../utils/notifications'
import { randomString } from '../../shared/generic'
import { bundleLinks } from '../../utils/bundlelinks'
import getPermissions from '../../utils/permissions'
import storage from '../../storage'

type Treenode = chrome.bookmarks.BookmarkTreeNode

type BookmarksFolder = {
	title: string
	used: boolean
	bookmarks: BookmarksFolderItem[]
}

type BookmarksFolderItem = {
	id: string
	title: string
	url: string
	used: boolean
	dateAdded: number
}

let browserBookmarkFolders: BookmarksFolder[] = []

export default async function linksImport() {
	const data = await storage.sync.get()

	document.querySelectorAll('#bookmarks-container > *')?.forEach((node) => {
		node.remove()
	})

	await initBookmarkSync(data)
	createBookmarksDialog()
}

export async function initBookmarkSync(data: Sync.Storage) {
	let treenode = await getBookmarkTree()
	let permission = !!treenode

	if (!permission) {
		try {
			permission = await getPermissions('topSites', 'bookmarks')
		} catch (error) {
			settingsNotifications({ 'accept-permissions': true })
		}
	}

	if (!permission) {
		return
	}

	treenode = await getBookmarkTree()

	if (treenode) {
		browserBookmarkFolders = bookmarkTreeToFolderList(treenode[0], data)
	}
}

export function syncBookmarks(group: string): Links.Link[] {
	const folder = browserBookmarkFolders.find((folder) => folder.title === group)
	const syncedLinks: Links.Link[] = []

	if (folder) {
		for (const bookmark of folder.bookmarks) {
			syncedLinks.push(validateLink(bookmark.title, bookmark.url, folder.title))
		}
	}

	return syncedLinks
}

// Bookmarks Dialog

function createBookmarksDialog() {
	const bookmarkFolders = browserBookmarkFolders

	let bookmarksdom = document.querySelector<HTMLDialogElement>('#bookmarks')
	let container = document.querySelector<HTMLElement>('#bookmarks-container')

	if (!bookmarksdom) {
		bookmarksdom = getHTMLTemplate<HTMLDialogElement>('bookmarks-dialog-template', 'dialog')
		container = bookmarksdom.querySelector('#bookmarks-container')

		const closebutton = bookmarksdom.querySelector<HTMLButtonElement>('#bmk_close')
		const applybutton = bookmarksdom.querySelector<HTMLButtonElement>('#bmk_apply')

		bookmarksdom?.addEventListener('click', closeDialog)
		applybutton?.onclickdown(importSelectedBookmarks)
		closebutton?.onclickdown(closeDialog)

		document.body.appendChild(bookmarksdom)
	}

	for (const list of bookmarkFolders) {
		const folder = getHTMLTemplate<HTMLDivElement>('bookmarks-folder-template', 'div')
		const selectButton = folder.querySelector('.b_bookmarks-folder-select')
		const syncButton = folder.querySelector('.b_bookmarks-folder-sync')
		const ol = folder.querySelector('ol')
		const h2 = folder.querySelector('.bookmarks-folder-title-content')

		if (!ol || !h2) {
			continue
		}

		h2.textContent = list.title
		selectButton?.onclickdown(() => toggleFolderSelect(folder))
		syncButton?.onclickdown(() => toggleFolderSync(folder))
		folder.classList.toggle('used', list.used)
		folder.dataset.title = list.title
		container?.appendChild(folder)

		if (list.title === 'topsites' && syncButton) {
			h2.textContent = tradThis('Most visited')
			folder.classList.add('synced')
			syncButton.setAttribute('disabled', '')
			syncButton.remove()
		}

		for (const bookmark of list.bookmarks) {
			const li = getHTMLTemplate<HTMLLIElement>('bookmarks-item-template', 'li')
			const li_button = li.querySelector<HTMLButtonElement>('button')
			const li_title = li.querySelector('.bookmark-title')
			const li_url = li.querySelector('.bookmark-url')
			const li_img = li.querySelector('img')

			if (!li_title || !li_button || !li_url || !li_img || !bookmark.url.startsWith('http')) {
				continue
			}

			const url = new URL(bookmark.url)

			li_img.src = `${API_DOMAIN}/favicon/blob/${url.origin}`
			li_title.textContent = bookmark.title
			li_url.textContent = url.href
				.replace(url.protocol, '')
				.replace('//', '')
				.replace('www.', '')
				.slice(0, -1)
				.replace('/', '')

			li_button?.onclickdown(() => li.classList.toggle('selected'))
			li_button?.onclickdown(handleApplyButtonText)

			if (bookmark.used) {
				li_button.setAttribute('disabled', '')
			}

			li.id = bookmark.id
			ol?.appendChild(li)
		}
	}

	document.getElementById('bmk_apply')?.setAttribute('disabled', '')
	document.dispatchEvent(new Event('toggle-settings'))
	traduction(bookmarksdom, getLang())

	bookmarksdom.showModal()
	setTimeout(() => bookmarksdom.classList.add('shown'))
}

function importSelectedBookmarks() {
	const folders = browserBookmarkFolders
	const bookmarksdom = document.getElementById('bookmarks') as HTMLDialogElement
	const selectedLinks = bookmarksdom.querySelectorAll<HTMLLIElement>('.bookmarks-folder li.selected')
	const selectedFolders = bookmarksdom.querySelectorAll<HTMLLIElement>('.bookmarks-folder.selected')
	const syncedFolders = bookmarksdom.querySelectorAll<HTMLLIElement>('.bookmarks-folder.synced')
	const linksIds = Object.values(selectedLinks).map((element) => element.id)
	const folderIds = Object.values(selectedFolders).map((element) => element.dataset.title)
	const syncedIds = Object.values(syncedFolders).map((element) => element.dataset.title)

	const links: { title: string; url: string; group?: string }[] = []
	const groups: { title: string; sync: boolean }[] = []

	folders.forEach((folder) => {
		const isFolderSelected = folderIds.includes(folder.title)
		const isFolderSynced = syncedIds.includes(folder.title)

		if (isFolderSelected) {
			groups.push({
				title: folder.title,
				sync: isFolderSynced,
			})
		}

		if (isFolderSynced && folder.title !== 'topsites') {
			return
		}

		folder.bookmarks.forEach((bookmark) => {
			const isBookmarkSelected = linksIds.includes(bookmark.id)
			const group = isFolderSelected ? folder.title : undefined
			const title = bookmark.title
			const url = bookmark.url

			if (isFolderSelected || isBookmarkSelected) {
				links.push({ title, url, group })
			}
		})
	})

	storage.sync.get('linkgroups').then(({ linkgroups }) => {
		const i_linkgroups = document.querySelector<HTMLInputElement>('#i_linkgroups')
		const allGroups = [...groups, ...linkgroups.groups]
		const toggleGroups = allGroups.length > 1

		quickLinks(undefined, {
			groups: toggleGroups,
			addLinks: links,
			addGroups: groups,
		})

		if (i_linkgroups) {
			i_linkgroups.checked = toggleGroups
		}

		bookmarksdom?.classList.remove('shown')
		bookmarksdom?.close()
		closeDialog()
	})
}

function handleApplyButtonText() {
	const applybutton = document.getElementById('bmk_apply') as HTMLElement
	const links = document.querySelectorAll('#bookmarks li.selected')
	const folders = document.querySelectorAll('#bookmarks .bookmarks-folder.selected')
	const emptySelection = links.length === 0 && folders.length === 0

	toggleDisabled(applybutton, emptySelection)
}

function closeDialog(event?: Event) {
	const path = (event?.composedPath() ?? []) as Element[]
	const id = path[0]?.id ?? ''

	if (!event || id === 'bookmarks' || id === 'bmk_close') {
		const bookmarksdom = document.querySelector<HTMLDialogElement>('#bookmarks')

		bookmarksdom?.close()
		bookmarksdom?.classList.remove('shown')
		bookmarksdom?.querySelectorAll('.selected')?.forEach((node) => node.classList.remove('selected'))
	}
}

function toggleFolderSelect(folder: HTMLElement) {
	const selectButton = folder.querySelector('.b_bookmarks-folder-select')
	const syncButton = folder.querySelector('.b_bookmarks-folder-sync')

	if (!selectButton) {
		return
	}

	if (folder.classList.contains('selected')) {
		folder.classList.remove('selected')
		syncButton?.classList.remove('selected')
		syncButton?.setAttribute('disabled', '')
	} else {
		folder.classList.add('selected')
		folder.querySelectorAll('li').forEach((li) => li?.classList.remove('selected'))
		syncButton?.removeAttribute('disabled')
	}

	handleApplyButtonText()
}

function toggleFolderSync(folder: HTMLElement) {
	if (folder.classList.contains('synced')) {
		folder.classList.remove('synced')
	} else {
		folder.classList.add('synced')
	}
}

// webext stuff

async function getBookmarkTree(): Promise<Treenode[] | undefined> {
	const treenode = window.startupBookmarks ?? (await EXTENSION?.bookmarks?.getTree())
	const topsites = window.startupTopsites ?? (await EXTENSION?.topSites?.get())

	if (!treenode || !topsites) {
		return
	}

	if (PLATFORM === 'chrome') {
		treenode[0].children?.push({
			id: '',
			title: 'Google Apps',
			children: [
				{ id: '', title: 'Youtube', url: 'https://youtube.com' },
				{ id: '', title: 'Account', url: 'https://myaccount.google.com' },
				{ id: '', title: 'Gmail', url: 'https://mail.google.com' },
				{ id: '', title: 'Meet', url: 'https://meet.google.com' },
				{ id: '', title: 'Maps', url: 'https://maps.google.com' },
				{ id: '', title: 'Drive', url: 'https://drive.google.com' },
				{ id: '', title: 'Photos', url: 'https://photos.google.com' },
				{ id: '', title: 'Calendar', url: 'https://calendar.google.com' },
				{ id: '', title: 'Translate', url: 'https://translate.google.com' },
				{ id: '', title: 'News', url: 'https://news.google.com' },
			],
		})
	}

	treenode[0].children?.unshift({
		id: '',
		title: 'topsites',
		children: topsites.map((site) => ({
			id: '',
			title: site.title,
			url: site.url,
		})),
	})

	return treenode
}

function bookmarkTreeToFolderList(treenode: Treenode, data: Sync.Storage): BookmarksFolder[] {
	function createMapFromTree(treenode: Treenode) {
		if (!treenode.children) {
			return
		}

		for (const child of treenode.children) {
			if (child.children) {
				createMapFromTree(child)
			}

			if (!child.url) {
				continue
			}

			if (!folders[treenode.title]) {
				folders[treenode.title] = {
					title: treenode.title,
					used: false,
					bookmarks: [],
				}
			}

			const current = folders[treenode.title].bookmarks
			const urls = current.map((b) => b.url)

			if (urls.includes(child.url)) {
				continue
			}

			folders[treenode.title].bookmarks.push({
				id: randomString(6),
				title: child.title,
				url: child.url,
				used: linksURLs.includes(child.url),
				dateAdded: child.dateAdded ?? 0,
			})
		}
	}

	const linksURLs = bundleLinks(data).map((link) => isLink(link) && (link as Links.Elem).url)
	const folders: Record<string, BookmarksFolder> = {}

	createMapFromTree(treenode)

	for (const [folder, { bookmarks }] of Object.entries(folders)) {
		const allUsed = bookmarks.every((b) => b.used)
		const isGroup = data.linkgroups.groups.includes(folder)
		const isSynced = data.linkgroups.synced.includes(folder)

		if (isSynced || (isGroup && allUsed)) {
			folders[folder].used = true
		}
	}

	return Object.values(folders)
}
