import { stringMaxSize, bundleLinks } from '../utils'
import { tradThis } from '../utils/translations'
import quickLinks from './links'
import storage from '../storage'

import { Sync } from '../types/sync'

export default async function linksImport() {
	const container = document.getElementById('bookmarks_container') as HTMLElement
	const closeBtn = document.getElementById('bmk_close') as HTMLElement

	const closeBookmarks = () => {
		container.classList.toggle('hiding', true)
		setTimeout(() => container.removeAttribute('class'), 400)
	}

	function main(links: Link[], bookmarks: chrome.bookmarks.BookmarkTreeNode[]): void {
		const listdom = document.createElement('ol')

		let bookmarksList: chrome.bookmarks.BookmarkTreeNode[] = []
		let selectedList: string[] = []

		bookmarks[0].children?.forEach((cat) => {
			const list = cat.children

			if (Array.isArray(list)) {
				bookmarksList.push(...list)
			}
		})

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

		bookmarksList.forEach((mark, index) => {
			const elem = document.createElement('li')
			const titleWrap = document.createElement('p')
			const title = document.createElement('span')
			const favicon = document.createElement('img')
			const url = document.createElement('pre')
			let hostname = mark.url

			// only append links if url are not empty
			// (temp fix to prevent adding bookmarks folder title ?)
			if (!mark.url || mark.url === '') {
				return
			}

			try {
				hostname = new URL(mark.url).hostname
			} catch (_) {}

			favicon.src = 'https://icons.duckduckgo.com/ip3/' + hostname + '.ico'
			favicon.alt = ''

			title.textContent = mark.title
			url.textContent = mark.url

			titleWrap.appendChild(favicon)
			titleWrap.appendChild(title)

			elem.setAttribute('data-index', index.toString())
			elem.setAttribute('tabindex', '0')
			elem.appendChild(titleWrap)
			elem.appendChild(url)

			elem.onclick = () => selectBookmark(elem)
			elem.onkeydown = (e: KeyboardEvent) => (e.code === 'Enter' ? selectBookmark(elem) : '')

			if (links.filter((x) => x.url === stringMaxSize(mark.url, 512)).length === 0) {
				listdom.appendChild(elem)
			}
		})

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
				closeBookmarks()
				quickLinks(null, { bookmarks: bookmarkToApply })
			}
		}

		const lidom = document.querySelector('#bookmarks ol li') as HTMLLIElement
		lidom.focus()
	}

	// Ask for bookmarks first
	chrome.permissions.request({ permissions: ['bookmarks'] }, async (granted) => {
		if (!granted) return

		const data = await storage.sync.get()
		const extAPI = window.location.protocol === 'moz-extension:' ? browser : chrome
		extAPI.bookmarks.getTree().then((response) => {
			document.getElementById('bookmarks_container')?.classList.toggle('shown', true)
			main(bundleLinks(data as Sync), response)
		})
	})

	closeBtn.addEventListener('click', closeBookmarks)
	container.addEventListener('click', function (e: MouseEvent) {
		if ((e.target as HTMLElement).id === 'bookmarks_container') closeBookmarks()
	})
}
