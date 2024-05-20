import { getHTMLTemplate, randomString } from '../../utils'
import { tradThis } from '../../utils/translations'
import { PLATFORM } from '../../defaults'
import quickLinks from '.'
import storage from '../../storage'

type Treenode = chrome.bookmarks.BookmarkTreeNode

type BookmarkFolder = {
	title: string
	bookmarks: {
		id: string
		title: string
		url: string
		dateAdded: number
	}[]
}

export default async function linksImport() {
	const foldersdom = Object.values(document.querySelectorAll<HTMLDivElement>('.bookmarks-folder'))
	let treenode = await getBookmarkTree()

	if (!treenode && (await getPermissions())) {
		treenode = await getBookmarkTree()
	}

	if (!treenode) {
		return
	}

	foldersdom?.forEach((node) => node.remove())

	createBookmarksDialog(treenode[0])
}

export async function syncNewBookmarks(init?: number) {
	if (PLATFORM === 'online' || PLATFORM === 'safari') {
		return
	}

	const treenode = await getBookmarkTree()

	if (!treenode || !init) {
		return
	}

	const lastCheck = init ?? Date.now()
	const folders = bookmarkTreeToFolderList(treenode[0])
	const flatList = folders.map((folder) => folder.bookmarks).flat()
	const newBookmarks = flatList.filter((bookmark) => bookmark.dateAdded > lastCheck)

	if (newBookmarks.length > 0) {
		storage.sync.set({ syncbookmarks: Date.now() })
		setTimeout(() => quickLinks(undefined, { bookmarks: newBookmarks }))
	}
}

function bookmarkTreeToFolderList(treenode: Treenode) {
	function createListFromTree(treenode: Treenode) {
		const folder: BookmarkFolder = {
			title: treenode.title,
			bookmarks: [],
		}

		if (!treenode.children) {
			return
		}

		for (const child of treenode.children) {
			if (child.children) {
				createListFromTree(child)
			}

			if (!child.url) {
				continue
			}

			folder.bookmarks?.push({
				id: randomString(6),
				title: child.title,
				url: child.url,
				dateAdded: child.dateAdded ?? 0,
			})
		}

		if (folder.bookmarks.length > 0) {
			folderList.push(folder)
		}
	}

	const folderList: BookmarkFolder[] = []
	createListFromTree(treenode)

	// todo:
	// merge duplicates
	// tag already used

	return folderList
}

// Bookmarks Dialog

function createBookmarksDialog(treenode: Treenode) {
	let bookmarksdom = document.querySelector<HTMLDialogElement>('#bookmarks')
	let container = document.querySelector<HTMLElement>('#bookmarks-container')

	if (!bookmarksdom) {
		bookmarksdom = getHTMLTemplate<HTMLDialogElement>('bookmarks-dialog-template', 'dialog')
		container = bookmarksdom.querySelector('#bookmarks-container')

		const closebutton = bookmarksdom.querySelector<HTMLButtonElement>('#bmk_close')
		const applybutton = bookmarksdom.querySelector<HTMLButtonElement>('#bmk_apply')

		applybutton?.addEventListener('click', () => importSelectedBookmarks(treenode))
		closebutton?.addEventListener('click', () => bookmarksdom?.close())
		bookmarksdom.addEventListener('click', (e) => (e.composedPath()[0] === bookmarksdom ? bookmarksdom.close() : null))

		document.body.appendChild(bookmarksdom)
	}

	for (const bookmarkList of bookmarkTreeToFolderList(treenode)) {
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
			li_button?.addEventListener('click', () => selectBookmark(li))

			li.id = bookmark.id
			ol?.appendChild(li)
		}
	}

	bookmarksdom.showModal()
}

function importSelectedBookmarks(treenode: Treenode) {
	const bookmarksdom = document.getElementById('bookmarks') as HTMLDialogElement
	const selected = document.querySelectorAll<HTMLLIElement>('li.selected')

	const folders = bookmarkTreeToFolderList(treenode)
	const flatList = folders.map((folder) => folder.bookmarks).flat()
	const ids = Object.values(selected).map((li) => li.id)
	const list: { [key: string]: { url: string; title: string } } = {}
	const selectedLinks = []

	flatList.forEach(({ id, title, url }) => {
		list[id] = { title, url }
	})

	for (const id of ids) {
		selectedLinks.push(list[id])
	}

	quickLinks(undefined, { bookmarks: selectedLinks })
	document.getElementById('bmk_apply')?.classList.toggle('none', true)
	bookmarksdom.close()
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

	applybutton.classList.toggle('none', counter === 0)
}

function toggleFolderSelect(folder: HTMLElement) {
	const syncButton = folder.querySelector('.b_bookmarks-folder-sync')

	if (folder.classList.contains('selected')) {
		folder.classList.remove('selected', 'synced')
		syncButton?.classList.remove('selected')
		syncButton?.setAttribute('disabled', '')
	} else {
		folder.classList.add('selected')
		syncButton?.removeAttribute('disabled')
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
