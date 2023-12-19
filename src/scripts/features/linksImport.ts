import { stringMaxSize, bundleLinks } from '../utils'
import { tradThis } from '../utils/translations'
import { PLATFORM } from '../defaults'
import quickLinks from './links'
import storage from '../storage'

type BookmarkFolder = {
	title: string
	bookmarks: {
		title: string
		url: string
	}[]
}

const bookmarkFolders: BookmarkFolder[] = []

export default async function linksImport() {
	const bookmarksdom = document.getElementById('bookmarks') as HTMLDialogElement
	const closeBtn = document.getElementById('bmk_close') as HTMLElement

	function main(links: Links.Link[], bookmarks: chrome.bookmarks.BookmarkTreeNode[]) {
		const listdom = document.createElement('ol')

		// Replace list to filter already added bookmarks
		const oldList = document.querySelector('#bookmarks ol')
		if (oldList) oldList.remove()
		document.getElementById('bookmarks')!.prepend(listdom)

		// Just warning if no bookmarks were found
		if (bookmarksList.length === 0) {
			document.getElementById('bookmarks')?.classList.toggle('noneFound', true)
			return
		}

		// Submit event
		document.getElementById('bmk_apply')!.onclick = function () {
			let bookmarkToApply = selectedList.map((i) => ({
				title: bookmarksList[parseInt(i)].title,
				url: bookmarksList[parseInt(i)].url || '',
			}))

			if (bookmarkToApply.length > 0) {
				bookmarksdom.close()
				quickLinks(undefined, { bookmarks: bookmarkToApply })
			}
		}

		const lidom = document.querySelector('#bookmarks ol li') as HTMLLIElement
		lidom.focus()
	}

	// Ask for bookmarks first
	chrome.permissions.request({ permissions: ['bookmarks'] }, async (granted) => {
		if (!granted) return

		const data = await storage.sync.get()
		const extAPI = PLATFORM === 'firefox' ? browser : chrome
		extAPI.bookmarks.getTree().then((response) => {
			bookmarksdom.showModal()
			// main(bundleLinks(data), response)
			parseThroughImport(response[0])
			addBookmarksFolderToDOM()
		})
	})

	closeBtn.addEventListener('click', () => bookmarksdom.close())
}

function selectBookmark(elem: HTMLLIElement) {
	const applyBtn = document.getElementById('bmk_apply') as HTMLElement
	const isSelected = elem.classList.toggle('selected')
	const index = elem.getAttribute('data-index')
	let counter = listdom.querySelectorAll('li.selected').length

	if (!index) return

	// update list to return
	isSelected ? selectedList.push(index) : selectedList.pop()

	// Change submit button text & class on selections
	if (counter === 0) applyBtn.textContent = tradThis('Select bookmarks to import')
	if (counter === 1) applyBtn.textContent = tradThis('Import this bookmark')
	if (counter > 1) applyBtn.textContent = tradThis('Import these bookmarks')

	applyBtn.classList.toggle('none', counter === 0)
}

function parseThroughImport(treenode: chrome.bookmarks.BookmarkTreeNode) {
	const folder: BookmarkFolder = {
		title: treenode.title,
		bookmarks: [],
	}

	for (const child of treenode.children ?? []) {
		if (child.children) {
			parseThroughImport(child)
		}
		//
		else if (child.url) {
			folder.bookmarks?.push({
				title: child.title,
				url: child.url,
			})
		}
	}

	if (folder.bookmarks.length > 0) {
		bookmarkFolders.push(folder)
	}
}

function addBookmarksFolderToDOM() {
	const container = document.getElementById('bookmarks-container') as HTMLDialogElement

	container.childNodes.forEach((node) => node.remove())

	for (const folder of bookmarkFolders) {
		const listdom = document.createElement('ol')
		const div = document.createElement('div')
		const h2 = document.createElement('h2')

		h2.textContent = folder.title
		div.classList.add('bookmarks-folder')

		for (const bookmark of folder.bookmarks) {
			const li = document.createElement('li')
			const button = document.createElement('button')
			const p_title = document.createElement('p')
			const p_url = document.createElement('p')
			const img = document.createElement('img')

			let url: URL | undefined = undefined

			try {
				url = new URL(bookmark.url)
			} catch (_) {
				return
			}

			img.src = 'https://api.bonjourr.lol/favicon/blob/' + url.origin
			img.draggable = false
			img.alt = ''

			p_title.textContent = bookmark.title
			p_url.textContent = url.href.replace(url.protocol, '').replace('//', '').replace('www.', '')

			button.addEventListener('click', () => selectBookmark(li))
			button.appendChild(img)
			button.appendChild(p_title)
			button.appendChild(p_url)

			li.appendChild(button)
			listdom.appendChild(li)
		}

		div.appendChild(h2)
		div.appendChild(listdom)
		container.appendChild(div)
	}
}
