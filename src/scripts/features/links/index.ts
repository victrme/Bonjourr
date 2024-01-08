import { isFolder, getLiFromEvent, getDefaultIcon, createTitle } from './helpers'
import { getHTMLTemplate, randomString, stringMaxSize } from '../../utils'
import displayEditDialog from './edit'
import { eventDebounce } from '../../utils/debounce'
import onSettingsLoad from '../../utils/onsettingsload'
import transitioner from '../../utils/transitioner'
import errorMessage from '../../utils/errormessage'
import { tradThis } from '../../utils/translations'
import { BROWSER } from '../../defaults'
import startDrag from './drag'
import initTabs from './tabs'
import storage from '../../storage'

type Link = Links.Link
type Elem = Links.Elem
type Folder = Links.Folder

type LinksUpdate = {
	bookmarks?: { title: string; url: string }[]
	newtab?: boolean
	style?: string
	row?: string
	tab?: boolean
	addTab?: boolean
	removeTab?: number
	addLink?: boolean
	addFolder?: string[]
	groupTitle?: string
	addToFolder?: AddToFolder
	removeFromFolder?: string[]
	deleteLinks?: string[]
}

type AddToFolder = {
	ids: string[]
	target: string
	source?: string
}

type Bookmarks = {
	title: string
	url: string
}[]

type SubmitLink = { type: 'link' }
type SubmitLinkFolder = { type: 'folder'; ids: string[] }
type ImportBookmarks = { type: 'import'; bookmarks: Bookmarks }
type LinkSubmission = SubmitLink | SubmitLinkFolder | ImportBookmarks

const domlinkblocks = document.getElementById('linkblocks') as HTMLUListElement
let selectallTimer = 0

export default async function quickLinks(init?: Sync.Storage, event?: LinksUpdate) {
	if (event) {
		linksUpdate(event)
		return
	}

	if (!init) {
		errorMessage('No data for quick links !')
		return
	}

	// set class before appendBlock, cannot be moved
	domlinkblocks.className = init.linkstyle ?? 'large'
	domlinkblocks.classList.toggle('hidden', !init.quicklinks)

	initblocks(init)
	initTabs(init)
	initRows(init.linksrow, init.linkstyle)
}

onSettingsLoad(() => {
	document.body.addEventListener('stop-select-all', () => clearTimeout(selectallTimer))
	document.body.addEventListener('click', dismissSelectAllAndFolder)
})

//
// Initialisation
//

export async function initblocks(data: Sync.Storage): Promise<true> {
	const tabList = document.querySelector<HTMLUListElement>('#link-list')
	const children = document.querySelectorAll('#link-list > li')
	const folderid = domlinkblocks.dataset.folderid

	// Remove all links

	if (tabList && children.length > 0) {
		children.forEach((child) => {
			child.remove()
		})
	}

	// Choose links to display

	const linkids = []

	if (!!folderid) {
		linkids.push(...((data[folderid] as Links.Folder)?.ids ?? []))
	} else {
		linkids.push(...data.tabslist[data.linktabs ?? 0].ids)
	}

	// Exit early if no links
	if (linkids.length === 0) {
		document.dispatchEvent(new CustomEvent('interface', { detail: 'links' }))
		return true
	}

	// Create links DOM

	const links = linkids.map((id) => data[id] as Link)
	const folders = links.filter((link) => isFolder(link))
	const idsInFolders = folders.map((link) => (link as Folder).ids).flat()
	const linksInFolders = idsInFolders.map((id) => data[id] as Elem)
	const fragment = document.createDocumentFragment()

	for (const link of links) {
		let li: HTMLLIElement

		if (idsInFolders.includes(link._id)) {
			continue
		}

		if (isFolder(link)) {
			li = createLinkFolder(link, linksInFolders)
		} else {
			li = createLinkElem(link, data.linknewtab)
		}

		li.addEventListener('keyup', displayEditDialog)
		li.addEventListener('click', selectAll)
		li.addEventListener('pointerdown', selectAll)
		li.addEventListener('pointerdown', startDrag)

		fragment.appendChild(li)
	}

	tabList?.appendChild(fragment)
	document.dispatchEvent(new CustomEvent('interface', { detail: 'links' }))

	return true
}

function createLinkFolder(link: Links.Folder, linksInFolder: Links.Elem[]): HTMLLIElement {
	const linksInThisFolder = linksInFolder.filter((l) => link.ids.includes(l._id))
	const li = getHTMLTemplate<HTMLLIElement>('link-folder', 'li')
	const imgs = li.querySelectorAll('img')!
	const span = li.querySelector('span')!

	li.id = link._id
	span.textContent = stringMaxSize(link.title, 64)
	li.addEventListener('click', openFolder)

	for (let i = 0; i < linksInThisFolder.length; i++) {
		const img = imgs[i]
		if (img) {
			img.src = linksInThisFolder[i].icon ?? getDefaultIcon(linksInThisFolder[i].url)
		}
	}

	return li
}

function createLinkElem(link: Links.Elem, openInNewtab: boolean) {
	const li = getHTMLTemplate<HTMLLIElement>('link-elem', 'li')
	const span = li.querySelector('span')!
	const anchor = li.querySelector('a')!
	const img = li.querySelector('img')!

	li.id = link._id
	anchor.href = stringMaxSize(link.url, 512)
	span.textContent = createTitle(stringMaxSize(link.title, 64), link.url)
	createIcons(img, link)

	if (openInNewtab) {
		if (BROWSER === 'safari') {
			anchor.onclick = handleSafariNewtab
		} else {
			anchor.target = '_blank'
		}
	}

	return li
}

async function createIcons(img: HTMLImageElement, link: Links.Elem) {
	img.src = link.icon ?? getDefaultIcon(link.url)

	if (img.src.includes('loading.svg')) {
		await waitForIconLoad(link.url)
		img.src = getDefaultIcon(link.url)

		link.icon = undefined
		storage.sync.set({ [link._id]: link })
	}
}

async function waitForIconLoad(url: string): Promise<true> {
	const img = document.createElement('img')

	img.src = getDefaultIcon(url)
	new Promise((r) => img.addEventListener('load', r))

	return true
}

function initRows(amount: number, style: string) {
	const linklist = document.getElementById('link-list')
	const sizes = {
		large: { width: 4.8, gap: 2.3 },
		medium: { width: 3.5, gap: 2 },
		small: { width: 2.5, gap: 2 },
		inline: { width: 12, gap: 2 }, // arbitrary width because width is auto
		text: { width: 5, gap: 2 }, // arbitrary width because width is auto
	}

	if (linklist && style in sizes) {
		const { width, gap } = sizes[style as keyof typeof sizes]
		document.documentElement.style.setProperty('--links-width', (width + gap) * amount + 'em')
	}
}

//
//	Events
//

async function openFolder(event: Event) {
	if (domlinkblocks.className.includes('select-all')) {
		return
	}

	clearTimeout(selectallTimer)
	const li = getLiFromEvent(event)

	if (!li || li.classList.contains('folder') === false) {
		return
	}

	const data = await storage.sync.get()
	const folder = data[li.id] as Links.Folder

	transitioner(
		function hide() {
			domlinkblocks.dataset.folderid = li.id
			domlinkblocks.classList.add('hiding')
			domlinkblocks.classList.remove('in-folder')
		},
		async function changeToFolder() {
			toggleTabsTitleType(folder.title)
			await initblocks(data)
		},
		function show() {
			domlinkblocks.classList.replace('hiding', 'in-folder')
		},
		200
	)
}

async function closeFolder() {
	const data = await storage.sync.get()

	transitioner(
		function hide() {
			domlinkblocks.dataset.folderid = ''
			domlinkblocks.classList.add('hiding')
		},
		async function changeToTab() {
			toggleTabsTitleType(data.tabslist[0].name, data.linktabs)
			await initblocks(data)
		},
		function show() {
			domlinkblocks.classList.remove('in-folder')
			domlinkblocks.classList.remove('hiding')
		},
		200
	)
}

function dismissSelectAllAndFolder(event: Event) {
	const path = (event.composedPath() ?? [document.body]) as Element[]
	const onOpenSettings = path.some((el) => el.id === 'showSettings')
	const onSettings = path.some((el) => el.id === 'settings')
	const onEditLink = path.some((el) => el.id === 'editlink')
	const onLink = path.some((el) => el.tagName === 'LI' && el.classList.contains('block'))
	const doNothingWhenClicking = onEditLink || onOpenSettings || onSettings || onLink

	if (doNothingWhenClicking) {
		return
	}

	const states = [...domlinkblocks.classList.values()]

	// Remove first select all
	if (states.includes('select-all')) {
		domlinkblocks.classList.remove('select-all')
		document.querySelectorAll('.block').forEach((b) => b.classList.remove('selected'))
	}
	//
	else if (path.some((el) => el === domlinkblocks)) {
		return
	}
	// then close folder
	else if (!states.includes('dropping') && states.includes('in-folder')) {
		closeFolder()
	}
}

function toggleTabsTitleType(title: string, linktabs?: number): void {
	const folderid = domlinkblocks.dataset.folderid
	const firstinput = document.querySelector<HTMLInputElement>('#link-title input')
	const showTitles = folderid ? true : linktabs !== undefined

	domlinkblocks?.classList.toggle('with-tabs', showTitles)

	if (firstinput) {
		firstinput.value = title
		firstinput.style.width = title.length + 'ch'
		firstinput.placeholder = !!folderid ? tradThis('folder') : tradThis('tab')
	}
}

function selectAll(event: MouseEvent) {
	clearTimeout(selectallTimer)

	const selectAllActive = domlinkblocks.className.includes('select-all')
	const li = getLiFromEvent(event)

	// toggle selection
	if (selectAllActive && event.type.match(/pointerup|click/)) {
		if (!event.button || event.button === 0) {
			li?.classList.toggle('selected')
		}

		event.preventDefault()
		return
	}

	// start select all debounce
	if (!selectAllActive && event.type === 'pointerdown') {
		selectallTimer = setTimeout(() => {
			domlinkblocks.classList.add('select-all')
		}, 600)
	}
}

//
// Updates
//

export async function linksUpdate(update: LinksUpdate) {
	if (update.addLink) {
		linkSubmission({ type: 'link' })
	}

	if (update.addFolder) {
		linkSubmission({ type: 'folder', ids: update.addFolder })
	}

	if (update.bookmarks) {
		linkSubmission({ type: 'import', bookmarks: update.bookmarks })
	}

	if (update.addToFolder) {
		addLinkToFolder(update.addToFolder)
	}

	if (update.removeFromFolder) {
		removeFromFolder(update.removeFromFolder)
	}

	if (update.deleteLinks) {
		deleteLinks(update.deleteLinks)
	}

	if (update.tab !== undefined) {
		setTab(update.tab)
	}

	if (update.addTab !== undefined) {
		addTab()
	}

	if (update.removeTab !== undefined) {
		removeTab(update.removeTab)
	}

	if (update.groupTitle !== undefined) {
		setGroupTitle(update.groupTitle)
	}

	if (update.newtab !== undefined) {
		setOpenInNewTab(update.newtab)
	}

	if (update.style) {
		setLinkStyle(update.style)
	}

	if (update.row) {
		setRows(update.row)
	}
}

async function linkSubmission(arg: LinkSubmission) {
	const data = await storage.sync.get()
	const tab = data.tabslist[data.linktabs ?? 0]
	const folderid = domlinkblocks.dataset.folderid
	let links: Link[] = []
	let newlinks: Link[] = []

	switch (arg.type) {
		case 'link': {
			newlinks = addLink()
			links = getLinksInTab(data)
			break
		}

		case 'folder': {
			newlinks = addLinkFolder(arg.ids)
			links = getAllLinksInFolder(data, newlinks[0]._id)
			break
		}

		case 'import': {
			newlinks = (arg.bookmarks ?? []).map((b) => validateLink(b.title, b.url))
			links = getLinksInTab(data)
			break
		}
	}

	for (const link of newlinks) {
		data[link._id] = link
		links.push(link)
		tab.ids.push(link._id)

		if (folderid) {
			const folder = data[folderid] as Link

			if (isFolder(folder)) {
				folder.ids.push(link._id)
				data[folderid] = folder
			}
		}
	}

	data.tabslist[data.linktabs ?? 0] = tab
	storage.sync.set(data)

	initblocks(data)
}

function addLink(): Links.Elem[] {
	const titledom = document.getElementById('e_title') as HTMLInputElement
	const urldom = document.getElementById('e_url') as HTMLInputElement
	const title = titledom.value
	const url = urldom.value

	if (url.length < 3) {
		return []
	}

	titledom.value = ''
	urldom.value = ''

	return [validateLink(title, url)]
}

function addLinkFolder(ids: string[]): Links.Folder[] {
	const titledom = document.getElementById('e_title') as HTMLInputElement
	const title = titledom.value

	titledom.value = ''

	for (let i = 0; i < ids.length; i++) {
		const dom = document.getElementById(ids[i])
		const isFolder = dom?.classList.contains('folder')

		if (isFolder) {
			ids.splice(i, 1)
		}
	}

	return [
		{
			_id: 'links' + randomString(6),
			ids: ids,
			title: title,
		},
	]
}

async function addLinkToFolder({ ids, target, source }: AddToFolder) {
	const data = await storage.sync.get()
	const folder = data[target] as Links.Folder

	if (!folder) {
		return
	}

	if (source) {
		const tab = data.tabslist[data.linktabs ?? 0]
		data.tabslist[data.linktabs ?? 0].ids = tab.ids.filter((id) => id !== source)
		storage.sync.remove(source)
	}

	folder.ids.push(...ids)
	data[target] = folder

	storage.sync.set(data)
	initblocks(data)
}

async function removeFromFolder(ids: string[]) {
	if (!domlinkblocks.dataset.folderid) {
		return
	}

	const data = await storage.sync.get()
	const tab = data.tabslist[data.linktabs ?? 0]
	const folderid = domlinkblocks.dataset.folderid

	if (folderid) {
		const folder = data[folderid] as Links.Folder

		for (const id of ids) {
			folder.ids = folder.ids.filter((linkid) => linkid !== id)
		}

		data[folderid] = folder
		data.tabslist[data.linktabs ?? 0] = tab

		storage.sync.set(data)

		animateLinksRemove(ids)
	}
}

async function deleteLinks(ids: string[]) {
	let data = await storage.sync.get()
	const tab = data.tabslist[data.linktabs ?? 0]
	const folderId = domlinkblocks.dataset.folderid
	const currentlyInFolder = !!folderId

	for (const id of ids) {
		const toRemove = data[id] as Links.Link

		// Also remove link from folder
		if (currentlyInFolder) {
			const folder = data[folderId] as Links.Folder
			folder.ids = folder.ids.filter((id) => !ids.includes(id))
			data[folder._id] = folder
		}

		// Also remove folder content from data
		if (isFolder(toRemove)) {
			for (const id of toRemove.ids) {
				tab.ids = tab.ids.filter((id) => !toRemove.ids.includes(id))
				delete data[id]
			}
		}

		tab.ids = tab.ids.filter((item) => item !== id)
		data.tabslist[data.linktabs ?? 0] = tab
		delete data[id]
	}

	storage.sync.clear()
	storage.sync.set(data)

	animateLinksRemove(ids)
}

async function setGroupTitle(title: string) {
	const folderid = domlinkblocks.dataset.folderid

	if (folderid) {
		const data = await storage.sync.get()
		const folder = data[folderid] as Links.Folder | undefined

		if (folder) {
			folder.title = title
			data[folderid] = folder
			storage.sync.set(data)
		}

		return
	}

	const data = await storage.sync.get()

	data.tabslist[data.linktabs ?? 0].name = title

	storage.sync.set(data)
}

async function setTab(tab: boolean) {
	if (tab) {
		storage.sync.set({ linktabs: 0 })
		domlinkblocks?.classList.toggle('with-tabs', true)
		document.querySelectorAll<HTMLDivElement>('#link-title > div')?.forEach((div, i) => {
			div.classList.toggle('selected', i === 0)
		})
	} else {
		storage.sync.remove('linktabs')
		domlinkblocks?.classList.toggle('with-tabs', false)
	}
}

async function addTab() {
	const data = await storage.sync.get(['tabslist', 'linktabs'])
	data.tabslist.push({ name: '', ids: [] })
	storage.sync.set({ tabslist: data.tabslist })
	initTabs(data)
}

async function removeTab(index: number) {
	const data = await storage.sync.get(['tabslist', 'linktabs'])
	const isRemovingFirst = index === 0 || data.tabslist.length === 1

	if (isRemovingFirst) {
		return
	}

	data.tabslist = data.tabslist.toSpliced(index, 1)

	if (index === data.linktabs) {
		data.linktabs -= 1
		initblocks(data)
	}

	initTabs(data)

	storage.sync.set({
		tabslist: data.tabslist,
		linktabs: data.linktabs,
	})
}

async function setOpenInNewTab(newtab: boolean) {
	const anchors = document.querySelectorAll<HTMLAnchorElement>('.block a')

	for (const anchor of anchors) {
		if (BROWSER === 'safari') {
			if (newtab) {
				anchor.addEventListener('click', handleSafariNewtab)
			} else {
				anchor.removeEventListener('click', handleSafariNewtab)
			}
		} else {
			if (newtab) {
				anchor.setAttribute('target', '_blank')
			} else {
				anchor.removeAttribute('target')
			}
		}
	}

	storage.sync.set({ linknewtab: newtab })
}

async function setLinkStyle(style: string) {
	const data = await storage.sync.get()
	const links = getLinksInTab(data)

	for (const link of links) {
		const span = document.querySelector<HTMLSpanElement>(`#links${link._id} span`)
		const isElem = isFolder(link) === false

		if (span && isElem) {
			span.textContent = createTitle(link.title, link.url)
		}
	}

	style = style ?? 'large'
	domlinkblocks.classList.remove('large', 'medium', 'small', 'inline', 'text')
	domlinkblocks.classList.add(style)

	initRows(data.linksrow, style)

	storage.sync.set({ linkstyle: style })
}

function setRows(row: string) {
	const style = domlinkblocks.classList[0] || 'large'
	const val = parseInt(row ?? '6')
	initRows(val, style)
	eventDebounce({ linksrow: row })
}

function handleSafariNewtab(e: Event) {
	const anchor = e.composedPath().filter((el) => (el as Element).tagName === 'A')[0]
	window.open((anchor as HTMLAnchorElement)?.href)
	e.preventDefault()
}

//
// Helpers
//

function validateLink(title: string, url: string): Links.Elem {
	const startsWithEither = (strs: string[]) => strs.some((str) => url.startsWith(str))

	url = stringMaxSize(url, 512)

	const isConfig = startsWithEither(['about:', 'chrome://', 'edge://'])
	const noProtocol = !startsWithEither(['https://', 'http://'])
	const isLocalhost = url.startsWith('localhost') || url.startsWith('127.0.0.1')

	let prefix = isConfig ? '#' : isLocalhost ? 'http://' : noProtocol ? 'https://' : ''

	url = prefix + url

	return {
		_id: 'links' + randomString(6),
		title: stringMaxSize(title, 64),
		icon: 'src/assets/interface/loading.svg',
		url: url,
	}
}

function getAllLinksInFolder(data: Sync.Storage, id: string): Links.Elem[] {
	const folder = data[id] as Link | undefined
	const links: Links.Elem[] = []

	if (folder && isFolder(folder)) {
		for (const id of folder.ids) {
			const link = data[id] as Link
			if (isFolder(link) === false) {
				links.push(link)
			}
		}
	}

	return links
}

function getLinksInTab(data: Sync.Storage, index?: number): Link[] {
	index = index ?? data.linktabs ?? 0

	const tab = data.tabslist[index]
	const links: Link[] = []

	if (!tab || (tab && tab.ids.length === 0)) {
		return []
	}

	for (const id of tab.ids) {
		const link = data[id] as Link

		if (link) {
			links.push(link)
		}
	}

	return links
}

function animateLinksRemove(ids: string[]) {
	for (const id of ids) {
		document.getElementById(id)?.classList.add('removed')
		setTimeout(() => document.getElementById(id)?.remove(), 600)
	}
}
