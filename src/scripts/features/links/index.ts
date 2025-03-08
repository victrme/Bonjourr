import { isElem, getLiFromEvent, getDefaultIcon, createTitle, isLink } from './helpers'
import { getHTMLTemplate, randomString, stringMaxSize } from '../../utils'
import { displayInterface } from '../../index'
import displayEditDialog from './edit'
import { eventDebounce } from '../../utils/debounce'
import transitioner from '../../utils/transitioner'
import errorMessage from '../../utils/errormessage'
import { tradThis } from '../../utils/translations'
import { BROWSER } from '../../defaults'
import startDrag from './drag'
import initTabs from './tabs'
import storage from '../../storage'

type Link = Links.Link
type Elem = Links.Elem

type LinksUpdate = {
	bookmarks?: { title: string; url: string }[]
	newtab?: boolean
	style?: string
	row?: string
	tab?: boolean
	addTab?: string
	deleteTab?: number
	moveLinks?: string[]
	addLink?: AddLink
	addFolder?: string[]
	tabTitle?: TabTitle
	addToFolder?: AddToFolder
	moveToTab?: MoveToTarget
	removeFromFolder?: string[]
	deleteLinks?: string[]
}

type TabTitle = {
	title: string
	index: number
}

type AddLink = {
	title: string
	url: string
}

type AddToFolder = {
	source: string
	target: string
}

type MoveToTarget = {
	ids: string[]
	target: string
	source?: string
}

type Bookmarks = {
	title: string
	url: string
}[]

type SubmitLink = { type: 'link'; title: string; url: string }
type SubmitLinkFolder = { type: 'folder'; ids: string[]; title?: string }
type ImportBookmarks = { type: 'import'; bookmarks: Bookmarks }
type LinkSubmission = SubmitLink | SubmitLinkFolder | ImportBookmarks

type Style = Sync.Storage['linkstyle']

const domlinkblocks = document.getElementById('linkblocks') as HTMLUListElement
let initIconList: [HTMLImageElement, string][] = []
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

//
// Initialisation
//

export async function initblocks(data: Sync.Storage): Promise<true> {
	const tabList = document.querySelector<HTMLUListElement>('#link-list')
	const folderid = domlinkblocks.dataset.folderid

	const allLinks = Object.values(data).filter((val) => isLink(val)) as Link[]
	const links = !!folderid ? getLinksInFolder(data, folderid) : getLinksInTab(data)
	const ids = links.map((link) => link._id)

	const linksInFolders = allLinks.filter((link) => !link.folder && typeof link.parent === 'string')
	const children = document.querySelectorAll<HTMLLIElement>('#link-list > li')
	const childrenIds = [...children].map((li) => li.id)

	for (const child of children) {
		if (ids.includes(child.id) === false) {
			child.remove()
		}
	}

	// Exit early if no links
	if (links.length === 0) {
		displayInterface('links')
		return true
	}

	const fragment = document.createDocumentFragment()

	for (const link of links) {
		const liIndex = childrenIds.indexOf(link._id)
		const liExistsOnInterface = liIndex !== -1
		let li: HTMLLIElement

		if (liExistsOnInterface) {
			li = children[childrenIds.indexOf(link._id)]
			li.removeAttribute('style')
			tabList?.appendChild(li)
		}
		//
		else {
			li = isElem(link)
				? createElem(link, data.linknewtab, data.linkstyle)
				: createFolder(link, linksInFolders, data.linkstyle)

			li.addEventListener('keyup', displayEditDialog)
			li.addEventListener('click', selectAll)
			li.addEventListener('pointerdown', selectAll)
			li.addEventListener('pointerdown', startDrag)
		}

		fragment.appendChild(li)
	}

	tabList?.appendChild(fragment)
	queueMicrotask(createIcons)
	displayInterface('links')

	return true
}

function createFolder(link: Links.Folder, folderChildren: Link[], style: Style): HTMLLIElement {
	const li = getHTMLTemplate<HTMLLIElement>('link-folder', 'li')
	const imgs = li.querySelectorAll('img')!
	const span = li.querySelector('span')!
	const linksInThisFolder = folderChildren
		.filter((l) => !l.folder && l.parent === link._id)
		.toSorted((a, b) => a.order - b.order)

	li.id = link._id
	span.textContent = createTitle(link)
	li.addEventListener('mouseup', folderClickAction)

	for (let i = 0; i < linksInThisFolder.length; i++) {
		const img = imgs[i]
		const elem = linksInThisFolder[i]
		const isIconShown = img && isElem(elem) && style !== 'text'

		if (isIconShown) {
			initIconList.push([img, elem.icon ?? getDefaultIcon(elem.url)])
		}
	}

	return li
}

function createElem(link: Links.Elem, openInNewtab: boolean, style: Style) {
	const li = getHTMLTemplate<HTMLLIElement>('link-elem', 'li')
	const span = li.querySelector('span')!
	const anchor = li.querySelector('a')!
	const img = li.querySelector('img')!

	li.id = link._id
	anchor.href = stringMaxSize(link.url, 512)
	span.textContent = createTitle(link)

	if (style !== 'text') {
		initIconList.push([img, link.icon ?? getDefaultIcon(link.url)])
	}

	if (openInNewtab) {
		if (BROWSER === 'safari') {
			anchor.onclick = handleSafariNewtab
		} else {
			anchor.target = '_blank'
		}
	}

	return li
}

function createIcons() {
	for (const [img, url] of initIconList) {
		img.src = url
	}

	setTimeout(() => {
		const incomplete = initIconList.filter(([img]) => !img.complete)

		for (const [img, url] of incomplete) {
			img.src = 'src/assets/interface/loading.svg'

			const newimg = document.createElement('img')
			newimg.addEventListener('load', () => (img.src = url))
			newimg.src = url
		}

		initIconList = []
	}, 100)
}

function initRows(row: number, style: string) {
	const linklist = document.getElementById('link-list')
	const sizes = {
		large: { width: 4.8, gap: 2.3 },
		medium: { width: 3.5, gap: 2 },
		small: { width: 2.5, gap: 2 },
		inline: { width: 11, gap: 2 },
		text: { width: 5, gap: 2 }, // arbitrary width because width is auto
	}

	if (linklist && style in sizes) {
		const { width, gap } = sizes[style as keyof typeof sizes]
		document.documentElement.style.setProperty('--links-width', Math.ceil((width + gap) * row) + 'em')
	}
}

//
//	Events
//

queueMicrotask(() => {
	document.addEventListener('close-folder', closeFolder)
	document.addEventListener('stop-select-all', () => clearTimeout(selectallTimer))
	document.addEventListener('remove-select-all', removeSelectAll)
})

async function folderClickAction(event: MouseEvent) {
	const li = getLiFromEvent(event)
	const rightClick = event.button === 2
	const inFolder = li?.classList.contains('folder')
	const isSelectAll = domlinkblocks.className.includes('select-all')

	if (!li || !inFolder || rightClick || isSelectAll) {
		return
	}

	clearTimeout(selectallTimer)

	const data = await storage.sync.get()
	const ctrlClick = event.button === 0 && (event.ctrlKey || event.metaKey)
	const middleClick = event.button === 1

	if (ctrlClick || middleClick) {
		openAllLinks(data, li)
	} else {
		openFolder(data, li)
	}
}

function openAllLinks(data: Sync.Storage, li: HTMLLIElement) {
	const links = getLinksInFolder(data, li.id)

	links.forEach((link) => window.open(link.url, '_blank')?.focus())
	window.open(window.location.href, '_blank')?.focus()
	window.close()
}

async function openFolder(data: Sync.Storage, li: HTMLLIElement) {
	const folder = data[li.id] as Links.Folder
	const folderOpenTransition = transitioner()
	const folderTitle = folder?.title || tradThis('Folder')
	const folderTitleBtn = document.querySelector<HTMLButtonElement>('#folder-title button')

	if (folderTitleBtn) {
		folderTitleBtn.textContent = folderTitle
	}

	folderOpenTransition.first(hide)
	folderOpenTransition.then(changeToFolder)
	folderOpenTransition.finally(show)
	folderOpenTransition.transition(200)

	function hide() {
		domlinkblocks.dataset.folderid = li?.id
		domlinkblocks.classList.add('hiding')
		domlinkblocks.classList.remove('in-folder')
	}

	async function changeToFolder() {
		domlinkblocks.classList.toggle('with-tabs', true)
		await initblocks(data)
	}

	function show() {
		domlinkblocks.classList.replace('hiding', 'in-folder')
	}
}

async function closeFolder() {
	if (domlinkblocks.classList.contains('dropping')) {
		return
	}

	const data = await storage.sync.get()
	const folderCloseTransition = transitioner()

	folderCloseTransition.first(hide)
	folderCloseTransition.then(changeToTab)
	folderCloseTransition.finally(show)
	folderCloseTransition.transition(200)

	function hide() {
		domlinkblocks.dataset.folderid = ''
		domlinkblocks.classList.add('hiding')
	}

	async function changeToTab() {
		domlinkblocks.classList.toggle('with-tabs', data.linktabs.active)
		await initblocks(data)
	}

	function show() {
		domlinkblocks.classList.remove('in-folder')
		domlinkblocks.classList.remove('hiding')
	}
}

function selectAll(event: MouseEvent) {
	clearTimeout(selectallTimer)

	const selectAllActive = domlinkblocks.className.includes('select-all')
	const primaryButton = !event.button || event.button === 0
	const li = getLiFromEvent(event)

	// toggle selection
	if (selectAllActive && event.type.match(/pointerup|click/)) {
		if (primaryButton) {
			li?.classList.toggle('selected')
		}

		event.preventDefault()
		return
	}

	// start select all debounce
	if (!selectAllActive && primaryButton && event.type === 'pointerdown') {
		//
		if ((event as PointerEvent)?.pointerType === 'touch') {
			return
		}

		selectallTimer = setTimeout(() => {
			domlinkblocks.classList.add('select-all')
		}, 600)
	}
}

function removeSelectAll() {
	clearTimeout(selectallTimer)
	domlinkblocks.classList.remove('select-all')
	domlinkblocks.querySelectorAll('.block').forEach((li) => li.classList.remove('selected'))
}

//
// Updates
//

export async function linksUpdate(update: LinksUpdate) {
	if (update.addLink) {
		linkSubmission({ type: 'link', title: update.addLink.title, url: update.addLink.url })
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

	if (update.moveToTab) {
		moveToOtherTab(update.moveToTab)
	}

	if (update.moveLinks) {
		moveLinks(update.moveLinks)
	}

	if (update.tab !== undefined) {
		setTab(update.tab)
	}

	if (update.addTab !== undefined) {
		addTab(update.addTab)
	}

	if (update.deleteTab !== undefined) {
		deleteTab(update.deleteTab)
	}

	if (update.tabTitle !== undefined) {
		setTabTitle(update.tabTitle.title, update.tabTitle.index)
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
	const folderid = domlinkblocks.dataset.folderid
	const data = await storage.sync.get()
	let newlinks: Link[] = []

	if (arg.type === 'import') {
		newlinks = (arg.bookmarks ?? []).map((b) => validateLink(b.title, b.url))
	}

	if (arg.type === 'link') {
		if (arg.url.length <= 3) {
			return
		}

		newlinks.push(validateLink(arg.title, arg.url))
	}

	if (arg.type === 'folder') {
		newlinks = addLinkFolder(arg.ids, arg.title)

		for (const id of arg.ids) {
			const elem = data[id] as Link

			if (elem && !elem.folder) {
				elem.parent = newlinks[0]._id
			}
		}
	}

	for (const link of newlinks) {
		if (folderid && !link.folder) {
			link.parent = folderid
		} else {
			link.parent = data.linktabs.selected
		}

		data[link._id] = link
	}

	storage.sync.set(correctLinksOrder(data))
	initblocks(data)
}

function addLinkFolder(ids: string[], title?: string): Links.Folder[] {
	const titledom = document.getElementById('ei_title') as HTMLInputElement

	title = title ?? titledom.value
	titledom.value = ''

	const blocks = [...document.querySelectorAll<HTMLElement>('li.block')]
	const idsOnInterface = blocks.map((block) => block.id)
	const order = idsOnInterface.indexOf(ids[0])

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
			folder: true,
			order: order,
			parent: 0,
			title: title,
		},
	]
}

async function addLinkToFolder({ target, source }: AddToFolder) {
	let data = await storage.sync.get()
	const linktarget = data[target] as Links.Link
	const linksource = data[source] as Links.Link
	const title = linktarget.title
	const ids: string[] = []

	if (!linktarget || !linksource) {
		return
	}

	const getIdsFrom = (id: string) => getLinksInFolder(data, id).map((l) => l._id)
	linktarget.folder ? ids.push(target, ...getIdsFrom(target)) : ids.push(target)
	linksource.folder ? ids.push(source, ...getIdsFrom(source)) : ids.push(source)

	for (const [key, val] of Object.entries(data)) {
		if (isLink(val) === false) {
			continue
		}

		if (ids.includes(val._id) && !val.folder) {
			;(data[key] as Elem).parent = target
			;(data[key] as Elem).order = Date.now()
		}
	}

	;[linksource, linktarget].forEach((link) => {
		if (link.folder) {
			delete data[link._id]
			storage.sync.remove(link._id)
		}
	})

	linkSubmission({ ids, type: 'folder', title })
	animateLinksRemove(ids)
}

async function removeFromFolder(ids: string[]) {
	const folderid = domlinkblocks.dataset.folderid
	let data = await storage.sync.get()

	if (!folderid) {
		return
	}

	for (const id of ids) {
		;(data[id] as Link).parent = data.linktabs.selected
		;(data[id] as Link).order = Date.now()
	}

	data = correctLinksOrder(data)
	storage.sync.set(data)
	initblocks(data)
}

async function deleteLinks(ids: string[]) {
	const data = await storage.sync.get()

	for (const id of ids) {
		const link = data[id] as Link

		if (link.folder) {
			getLinksInFolder(data, link._id).forEach((child) => {
				delete data[child._id]
			})
		}

		delete data[id]
	}

	storage.sync.clear()
	storage.sync.set(correctLinksOrder(data))

	animateLinksRemove(ids)
}

async function moveLinks(ids: string[]) {
	const data = await storage.sync.get()

	ids.forEach((id, i) => {
		;(data[id] as Link).order = i
	})

	storage.sync.set(data)
	initblocks(data)
}

async function moveToOtherTab({ ids, target }: MoveToTarget) {
	let data = await storage.sync.get()

	for (const id of ids) {
		;(data[id] as Link).parent = parseInt(target)
		;(data[id] as Link).order = Date.now()
	}

	data = correctLinksOrder(data)
	storage.sync.set(data)
	initblocks(data)
}

async function setTab(tab: boolean) {
	const data = await storage.sync.get('linktabs')

	data.linktabs.active = tab
	storage.sync.set({ linktabs: data.linktabs })

	domlinkblocks?.classList.toggle('with-tabs', tab)
}

async function setTabTitle(title: string, index: number) {
	const data = await storage.sync.get('linktabs')
	const hasTab = data.linktabs.titles.length >= index

	if (hasTab) {
		data.linktabs.titles[index] = title
		storage.sync.set({ linktabs: data.linktabs })
		initTabs(data)
	}
}

async function addTab(title: string) {
	const data = await storage.sync.get('linktabs')
	data.linktabs.titles.push(title)
	storage.sync.set({ linktabs: data.linktabs })
	initTabs(data)
}

async function deleteTab(index: number) {
	const data = await storage.sync.get()
	const { titles, selected } = data.linktabs
	const isRemovingFirst = index === 0 || titles.length === 1

	if (isRemovingFirst) {
		return
	}

	for (const link of getLinksInTab(data, index)) {
		delete data[link._id]
	}

	data.linktabs.titles = titles.toSpliced(index, 1)
	data.linktabs.selected -= index === selected ? 1 : 0
	initblocks(data)
	initTabs(data)

	storage.sync.clear()
	storage.sync.set(data)
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

async function setLinkStyle(style: string = 'large') {
	if (!isLinkStyle(style)) {
		return
	}

	const wasText = domlinkblocks?.className.includes('text')
	const data = await storage.sync.get()
	const links = getLinksInTab(data)

	domlinkblocks.classList.remove('large', 'medium', 'small', 'inline', 'text')
	domlinkblocks.classList.add(style)

	for (const link of links) {
		const block = document.getElementById(link._id) as HTMLLIElement
		const span = block.querySelector(`span`) as HTMLElement
		span.textContent = createTitle(link)
	}

	data.linkstyle = style
	storage.sync.set(data)

	if (wasText) {
		// remove from DOM to re-draw icons
		document.querySelectorAll('#link-list li')?.forEach((el) => el.remove())
	}

	console.log(wasText)

	initRows(data.linksrow, style)
	initblocks(data)
}

function setRows(row: string) {
	const style = [...domlinkblocks.classList].filter(isLinkStyle)[0] ?? 'large'
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
		order: Date.now(), // big number
		title: stringMaxSize(title, 64),
		url: url,
	}
}

function getLinksInFolder(data: Sync.Storage, id: string): Links.Elem[] {
	const links: Elem[] = []

	for (const value of Object.values(data)) {
		if (isElem(value) && value?.parent === id) {
			links.push(value)
		}
	}

	links.sort((a, b) => a.order - b.order)

	return links
}

function getLinksInTab(data: Sync.Storage, index?: number): Link[] {
	const selection = index ?? data.linktabs.selected ?? 0
	const links: Link[] = []

	for (const value of Object.values(data)) {
		if (isLink(value) && (value?.parent ?? 0) === selection) {
			links.push(value)
		}
	}

	links.sort((a, b) => a.order - b.order)

	return links
}

function animateLinksRemove(ids: string[]) {
	for (const id of ids) {
		document.getElementById(id)?.classList.add('removed')
		setTimeout(() => document.getElementById(id)?.remove(), 600)
	}
}

function correctLinksOrder(data: Sync.Storage): Sync.Storage {
	const allLinks = Object.values(data).filter((val) => isLink(val)) as Link[]
	const folderIds = allLinks.filter((link) => link.folder).map(({ _id }) => _id)

	for (const folderId of folderIds) {
		const linksInFolder = getLinksInFolder(data, folderId)

		linksInFolder.forEach((link, i) => {
			link.order = i
			data[link._id]
		})
	}

	for (let i = 0; i < data.linktabs.titles.length; i++) {
		const linksInTab = getLinksInTab(data, i)

		linksInTab.forEach((link, i) => {
			link.order = i
			data[link._id]
		})
	}

	return data
}

function isLinkStyle(s: string): s is Sync.Storage['linkstyle'] {
	return ['large', 'medium', 'small', 'inline', 'text'].includes(s)
}
