import { isElem, getLiFromEvent, getDefaultIcon, createTitle, isLink, getLinksInGroup, getLinksInFolder } from './helpers'
import { initGroups, addGroup, deleteGroup, toggleGroups, changeGroupTitle } from './groups'
import { displayInterface } from '../../index'
import displayEditDialog from './edit'
import { folderClick } from './folders'
import startDrag from './drag'

import { getHTMLTemplate, randomString, stringMaxSize } from '../../utils'
import { eventDebounce } from '../../utils/debounce'
import errorMessage from '../../utils/errormessage'
import { tradThis } from '../../utils/translations'
import { BROWSER } from '../../defaults'
import storage from '../../storage'

type Link = Links.Link
type Elem = Links.Elem

type LinksUpdate = {
	bookmarks?: { title: string; url: string }[]
	newtab?: boolean
	style?: string
	row?: string
	groups?: boolean
	addGroup?: string
	deleteGroup?: string
	groupTitle?: { old: string; new: string }
	moveLinks?: string[]
	addLink?: AddLink
	addFolder?: string[]
	addToFolder?: AddToFolder
	moveToGroup?: MoveToTarget
	unfolder?: { ids: string[]; group: HTMLDivElement }
	deleteLinks?: string[]
	topsites?: boolean
}

type AddLink = {
	title: string
	url: string
	group?: string
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

type LinkGroups = {
	links: Links.Link[]
	title: string
	pinned: boolean
	lis: HTMLLIElement[]
	div: HTMLDivElement | null
}[]

type SubmitLink = { type: 'link'; title: string; url: string; group?: string }
type SubmitLinkFolder = { type: 'folder'; ids: string[]; title?: string; group?: string }
type ImportBookmarks = { type: 'import'; bookmarks: Bookmarks; group?: string }
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
	initGroups(init, !!init)
	initRows(init.linksrow, init.linkstyle)
}

// Initialisation

export async function initblocks(data: Sync.Storage): Promise<true> {
	const allLinks = Object.values(data).filter((val) => isLink(val)) as Link[]
	const { pinned, selected } = data.linkgroups
	const activeGroups: LinkGroups = []

	for (const group of [...pinned, selected]) {
		const div = document.querySelector<HTMLDivElement>(`.link-group[data-group="${group}"]`)
		const folder = div?.dataset.folder
		const lis: HTMLLIElement[] = []
		const inTopSites = group === 'topsites'
		const links = inTopSites
			? topSitesToLinks(await chrome.topSites.get())
			: folder
			? getLinksInFolder(data, folder)
			: getLinksInGroup(data, group)

		activeGroups.push({
			lis,
			div,
			links,
			title: group,
			pinned: group !== selected,
		})
	}

	activeGroups.reverse()

	// Remove links that didn't make the cut
	const divs = activeGroups.map((g) => g.div)
	const usedLis = activeGroups.map((group) => group.lis).flat()

	document.querySelectorAll<HTMLDivElement>('#linkblocks .link-group').forEach((div) => {
		div.querySelectorAll<HTMLLIElement>('li').forEach((li) => {
			if (usedLis.includes(li) === false) {
				li.remove()
			}
		})

		if (divs.includes(div) === false) {
			div.remove()
		}
	})

	for (const group of activeGroups) {
		const linkgroup = group.div ?? getHTMLTemplate<HTMLDivElement>('link-group-template', '.link-group')
		const linksInFolders = allLinks.filter((link) => !link.folder && typeof link.parent === 'string')
		const linklist = linkgroup.querySelector<HTMLUListElement>('ul')!
		const linktitle = linkgroup.querySelector<HTMLButtonElement>('button')!
		const fragment = document.createDocumentFragment()

		for (const link of group.links) {
			let li = group.lis.find((li) => li.id === link._id)

			if (li) {
				li.removeAttribute('style')
				linklist?.appendChild(li)
				continue
			}

			li = isElem(link)
				? createElem(link, data.linknewtab, data.linkstyle)
				: createFolder(link, linksInFolders, data.linkstyle)

			fragment.appendChild(li)

			if (li.id.includes('topsite') === false) {
				li.addEventListener('keyup', displayEditDialog)
				li.addEventListener('click', selectAll)
				li.addEventListener('pointerdown', selectAll)
				li.addEventListener('pointerdown', startDrag)
			}
		}

		linktitle.textContent = group.title
		linkgroup.dataset.group = group.title
		linkgroup.classList.toggle('pinned', group.pinned)
		linklist.appendChild(fragment)
		domlinkblocks.prepend(linkgroup)

		if (group.title === 'topsites') {
			linktitle.textContent = tradThis('Most visited')
			linktitle.classList.add('topsites-title')
			linkgroup.classList.add('topsites-group')
		}

		if (group.title === '') {
			linktitle.textContent = tradThis('Default group')
		}
	}

	queueMicrotask(createIcons)
	displayInterface('links')

	return true
}

function createFolder(link: Links.Folder, folderChildren: Link[], style: Style): HTMLLIElement {
	const li = getHTMLTemplate<HTMLLIElement>('link-folder-template', 'li')
	const imgs = li.querySelectorAll('img')!
	const span = li.querySelector('span')!
	const linksInThisFolder = folderChildren
		.filter((l) => !l.folder && l.parent === link._id)
		.toSorted((a, b) => a.order - b.order)

	li.id = link._id
	span.textContent = createTitle(link)
	li.addEventListener('mouseup', folderClick)

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
	const li = getHTMLTemplate<HTMLLIElement>('link-elem-template', 'li')
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
	const sizes = {
		large: { width: 4.8, gap: 2.3 },
		medium: { width: 3.5, gap: 2 },
		small: { width: 2.5, gap: 2 },
		inline: { width: 11, gap: 2 },
		text: { width: 5, gap: 2 }, // arbitrary width because width is auto
	}

	if (style in sizes) {
		const { width, gap } = sizes[style as keyof typeof sizes]
		document.documentElement.style.setProperty('--links-width', Math.ceil((width + gap) * row) + 'em')
	}
}

//	Select All

queueMicrotask(() => {
	document.addEventListener('stop-select-all', () => clearTimeout(selectallTimer))
	document.addEventListener('remove-select-all', removeSelectAll)
})

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

// Updates

export async function linksUpdate(update: LinksUpdate) {
	if (update.addLink) {
		linkSubmission({ type: 'link', ...update.addLink })
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

	if (update.unfolder) {
		unfolder(update.unfolder)
	}

	if (update.deleteLinks) {
		deleteLinks(update.deleteLinks)
	}

	if (update.moveToGroup) {
		moveToOtherTab(update.moveToGroup)
	}

	if (update.moveLinks) {
		moveLinks(update.moveLinks)
	}

	if (update.groups !== undefined) {
		toggleGroups(update.groups)
	}

	if (update.addGroup !== undefined) {
		addGroup(update.addGroup)
	}

	if (update.deleteGroup !== undefined) {
		deleteGroup(update.deleteGroup)
	}

	if (update.groupTitle !== undefined) {
		changeGroupTitle(update.groupTitle)
	}

	if (update.newtab !== undefined) {
		setOpenInNewTab(update.newtab)
	}

	if (update.topsites !== undefined) {
		setTopSites(update.topsites)
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
			link.parent = arg.group ?? data.linkgroups.selected
		}

		data[link._id] = link
	}

	storage.sync.set(correctLinksOrder(data))
	initblocks(data)
}

function addLinkFolder(ids: string[], title?: string): Links.Folder[] {
	const titledom = document.getElementById('e-title') as HTMLInputElement

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

async function unfolder({ ids, group }: { ids: string[]; group: HTMLDivElement }) {
	const folderid = group.dataset.folder
	const index = parseInt(group.dataset.index ?? '-1')
	let data = await storage.sync.get()

	if (!folderid) {
		return
	}

	for (const id of ids) {
		;(data[id] as Link).parent = index
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
	const links = getLinksInGroup(data)

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

async function setTopSites(toggle: boolean) {
	const permitted = await chrome.permissions.request({ permissions: ['topSites'] })
	const i_topsites = document.querySelector<HTMLInputElement>('#i_topsites')!

	if (!permitted) {
		i_topsites.checked = false
	}

	const data = await storage.sync.get()

	data.topsites = toggle
	storage.sync.set({ topsites: toggle })
	;(toggle ? addGroup : deleteGroup)('topsites', true)
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

// Helpers

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

	for (const group of data.linkgroups.groups) {
		const linksInGroup = getLinksInGroup(data, group)

		linksInGroup.forEach((link, i) => {
			link.order = i
			data[link._id]
		})
	}

	return data
}

function isLinkStyle(s: string): s is Sync.Storage['linkstyle'] {
	return ['large', 'medium', 'small', 'inline', 'text'].includes(s)
}

function topSitesToLinks(sites: chrome.topSites.MostVisitedURL[]): Links.Elem[] {
	const links = []

	for (let i = 0; i < sites.length; i++) {
		const site = sites[i]

		links.push({
			_id: 'topsite-' + i,
			order: i,
			title: site.title,
			url: site.url,
		})
	}

	return links
}
