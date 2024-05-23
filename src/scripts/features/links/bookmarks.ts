import { bundleLinks, getHTMLTemplate, randomString } from '../../utils'
import { tradThis } from '../../utils/translations'
import { PLATFORM } from '../../defaults'
import quickLinks from '.'
import storage from '../../storage'
import { isLink } from './helpers'

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

export default async function linksImport() {
	let treenode = await getBookmarkTree()

	const permission = treenode ? true : await getPermissions()
	const data = await storage.sync.get()

	if (!permission) treenode = await getBookmarkTree()
	if (!treenode) return

	document.querySelectorAll('.bookmarks-folder')?.forEach((node) => {
		node.remove()
	})

	createBookmarksDialog(treenode[0], data)
}

export async function syncNewBookmarks(init?: number) {
	if (PLATFORM === 'online' || PLATFORM === 'safari') {
		return
	}

	const treenode = await getBookmarkTree()
	const data = await storage.sync.get()

	if (!treenode || !init) {
		return
	}

	const lastCheck = init ?? Date.now()
	const folders = bookmarkTreeToFolderList(treenode[0], data)
	const flatList = folders.map((folder) => folder.bookmarks).flat()
	const newBookmarks = flatList.filter((bookmark) => bookmark.dateAdded > lastCheck)

	if (newBookmarks.length > 0) {
		storage.sync.set({ syncbookmarks: Date.now() })
		setTimeout(() => quickLinks(undefined, { addLinks: newBookmarks }))
	}
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

		if (isGroup && allUsed) {
			folders[folder].used = true
		}
	}

	return Object.values(folders)
}

// Bookmarks Dialog

async function createBookmarksDialog(treenode: Treenode, data: Sync.Storage) {
	const bookmarkFolders = bookmarkTreeToFolderList(treenode, data)

	let bookmarksdom = document.querySelector<HTMLDialogElement>('#bookmarks')
	let container = document.querySelector<HTMLElement>('#bookmarks-container')

	if (!bookmarksdom) {
		bookmarksdom = getHTMLTemplate<HTMLDialogElement>('bookmarks-dialog-template', 'dialog')
		container = bookmarksdom.querySelector('#bookmarks-container')

		const closebutton = bookmarksdom.querySelector<HTMLButtonElement>('#bmk_close')
		const applybutton = bookmarksdom.querySelector<HTMLButtonElement>('#bmk_apply')

		applybutton?.addEventListener('click', () => importSelectedBookmarks(bookmarkFolders))
		closebutton?.addEventListener('click', () => bookmarksdom?.close())
		bookmarksdom.addEventListener('pointerdown', closeDialog)

		document.body.appendChild(bookmarksdom)
	}

	for (const bookmarkList of bookmarkFolders) {
		const folder = getHTMLTemplate<HTMLDivElement>('bookmarks-folder-template', 'div')
		const selectButton = folder.querySelector('.b_bookmarks-folder-select')
		const syncButton = folder.querySelector('.b_bookmarks-folder-sync')
		const ol = folder.querySelector('ol')
		const h2 = folder.querySelector('h2')

		if (!ol || !h2) {
			continue
		}

		h2.textContent = bookmarkList.title
		selectButton?.addEventListener('click', () => toggleFolderSelect(folder))
		syncButton?.addEventListener('click', () => toggleFolderSync(folder))
		folder?.classList?.toggle('used', bookmarkList.used)
		container?.appendChild(folder)

		for (const bookmark of bookmarkList.bookmarks) {
			const li = getHTMLTemplate<HTMLLIElement>('bookmarks-item-template', 'li')
			const li_button = li.querySelector<HTMLButtonElement>('button')
			const li_title = li.querySelector('.bookmark-title')
			const li_url = li.querySelector('.bookmark-url')
			const li_img = li.querySelector('img')

			if (!li_title || !li_button || !li_url || !li_img || !bookmark.url.startsWith('http')) {
				continue
			}

			const url = new URL(bookmark.url)

			li_img.src = 'https://api.bonjourr.lol/favicon/blob/' + url.origin
			li_title.textContent = bookmark.title
			li_url.textContent = url.href.replace(url.protocol, '').replace('//', '').replace('www.', '')
			li_button.addEventListener('click', () => selectBookmark(li))

			if (bookmark.used) {
				li_button.setAttribute('disabled', '')
			}

			li.id = bookmark.id
			ol?.appendChild(li)
		}
	}

	document.dispatchEvent(new Event('toggle-settings'))
	setTimeout(() => bookmarksdom.showModal(), 200)
}

function importSelectedBookmarks(folders: BookmarksFolder[]) {
	const bookmarksdom = document.getElementById('bookmarks') as HTMLDialogElement
	const selectedLinks = bookmarksdom.querySelectorAll<HTMLLIElement>('li.selected')
	const selectedFolder = bookmarksdom.querySelectorAll<HTMLLIElement>('.bookmarks-folder.selected')
	const linksIds = Object.values(selectedLinks).map((element) => element.id)
	const folderIds = Object.values(selectedFolder).map((element) => element.querySelector('h2')?.textContent)

	const links: { title: string; url: string; group?: string }[] = []
	const groups: string[] = []

	folders.forEach((folder) => {
		const isFolderSelected = folderIds.includes(folder.title)

		if (isFolderSelected) {
			groups.push(folder.title)
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

	if (groups.length > 0) {
		quickLinks(undefined, { addGroups: groups })
	}

	setTimeout(() => {
		quickLinks(undefined, { addLinks: links })
		bookmarksdom.close()
	}, 10)
}

function selectBookmark(li: HTMLLIElement) {
	li.classList.toggle('selected')

	const applybutton = document.getElementById('bmk_apply') as HTMLElement
	const selected = document.querySelectorAll('li.selected')
	let counter = selected.length

	// Change submit button text & class on selections
	if (counter === 0) applybutton.textContent = tradThis('Select bookmarks')
	if (counter === 1) applybutton.textContent = tradThis('Import this bookmark')
	if (counter > 1) applybutton.textContent = tradThis('Import these bookmarks')

	applybutton.classList.toggle('none', false)
}

function closeDialog(event: PointerEvent) {
	const path = event.composedPath() as Element[]
	const id = path[0]?.id ?? ''

	if (id === 'bookmarks') {
		document.querySelector<HTMLDialogElement>('#bookmarks')?.close()
	}
}

function toggleFolderSelect(folder: HTMLElement) {
	const selectButton = folder.querySelector('.b_bookmarks-folder-select')
	const syncButton = folder.querySelector('.b_bookmarks-folder-sync')

	if (!selectButton || !syncButton) {
		return
	}

	if (folder.classList.contains('selected')) {
		selectButton.textContent = tradThis('Select group')
		folder.classList.remove('selected', 'synced')
		syncButton?.classList.remove('selected')
		syncButton?.setAttribute('disabled', '')
	} else {
		selectButton.textContent = tradThis('Unselect group')
		folder.classList.add('selected')
		// syncButton?.removeAttribute('disabled')
		folder.querySelectorAll('li').forEach((li) => li?.classList.remove('selected'))
	}
}

function toggleFolderSync(folder: HTMLElement) {
	if (folder.classList.contains('synced')) {
		folder.classList.remove('synced')
	} else {
		folder.classList.add('synced')
	}
}

// webext stuff

async function getPermissions(): Promise<boolean> {
	const namespace = PLATFORM === 'firefox' ? browser : chrome
	const permission = await namespace.permissions.request({ permissions: ['bookmarks'] })
	return permission
}

async function getBookmarkTree(): Promise<Treenode[] | undefined> {
	const namespace = PLATFORM === 'firefox' ? browser : chrome

	if (!namespace.bookmarks) {
		return
	}

	const treenode = await namespace.bookmarks.getTree()

	if (PLATFORM === 'chrome') {
		treenode[0].children?.push({
			id: '',
			title: 'Google Apps',
			children: [
				{ id: '', title: 'Account', url: 'https://myaccount.google.com' },
				{ id: '', title: 'Search', url: 'https://www.google.com' },
				{ id: '', title: 'Youtube', url: 'https://youtube.com' },
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

	return treenode
}
