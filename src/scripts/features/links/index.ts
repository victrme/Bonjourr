import { isElem, getLiFromEvent, getDefaultIcon, createTitle, isLink, getLinksInGroup, getLinksInFolder } from './helpers'
import { initGroups, addGroup, deleteGroup, toggleGroups, changeGroupTitle, moveGroups } from './groups'
import { initBookmarkSync, syncBookmarks } from './bookmarks'
import { displayInterface } from '../../index'
import displayEditDialog from './edit'
import { folderClick } from './folders'
import startDrag from './drag'

import { getHTMLTemplate, randomString, stringMaxSize } from '../../utils'
import { eventDebounce } from '../../utils/debounce'
import errorMessage from '../../utils/errormessage'
import { tradThis } from '../../utils/translations'
import storage from '../../storage'

type Link = Links.Link
type Elem = Links.Elem
type Style = Sync['linkstyle']
type Sync = Sync.Storage

type AddLinks = {
	title: string
	url: string
	group?: string
}[]

type UpdateLink = {
	id: string
	url?: string
	icon?: string
	title: string
}

type AddGroups = {
	title: string
	sync?: boolean
}[]

type MoveToFolder = {
	source: string
	target: string
}

type MoveToGroup = {
	source?: string
	target: string
	ids: string[]
}

type SubmitLink = {
	type: 'link'
	links: AddLinks
}

type SubmitFolder = {
	type: 'folder'
	ids: string[]
	title?: string
	group?: string
}

type LinksUpdate = {
	row?: string
	newtab?: boolean
	groups?: boolean
	addLinks?: AddLinks
	addGroups?: AddGroups
	addFolder?: { ids: string[]; group?: string }
	updateLink?: UpdateLink
	moveLinks?: string[]
	moveGroups?: string[]
	concatFolders?: MoveToFolder
	moveToFolder?: MoveToFolder
	moveToGroup?: MoveToGroup
	moveOutFolder?: { ids: string[]; group: string }
	deleteGroup?: string
	deleteLinks?: string[]
	refreshIcons?: string[]
	groupTitle?: { old: string; new: string }
	styles?: { style?: string; titles?: boolean; backgrounds?: boolean }
}

type LinkGroups = {
	links: Links.Link[]
	title: string
	pinned: boolean
	synced: boolean
	lis: HTMLLIElement[]
	div: HTMLDivElement | null
}[]

const domlinkblocks = document.getElementById('linkblocks') as HTMLDivElement
let initIconList: [HTMLImageElement, string][] = []
let selectallTimer = 0

export default async function quickLinks(init?: Sync, event?: LinksUpdate) {
	if (event) {
		linksUpdate(event)
		return
	}

	if (!init) {
		errorMessage('No data for quick links !')
		return
	}

	// set class before appendBlock, cannot be moved
	domlinkblocks.classList.add(init.linkstyle ?? 'large')
	domlinkblocks.classList.toggle('titles', init.linktitles)
	domlinkblocks.classList.toggle('backgrounds', init.linkbackgrounds)
	domlinkblocks.classList.toggle('hidden', !init.quicklinks)

	if (init.linkgroups.synced.length > 0) {
		await initBookmarkSync(init)
	}

	initGroups(init, !!init)
	initRows(init.linksrow, init.linkstyle)
	initblocks(init, true)
}

// Initialisation

export function initblocks(data: Sync, isInit?: true): true {
	const allLinks = Object.values(data).filter((val) => isLink(val)) as Link[]
	const { pinned, synced, selected } = data.linkgroups
	const activeGroups: LinkGroups = []

	for (const group of [...pinned, selected]) {
		const div = document.querySelector<HTMLDivElement>(`.link-group[data-group="${group}"]`)
		const folder = div?.dataset.folder
		const lis: HTMLLIElement[] = []
		const links = folder ? getLinksInFolder(data, folder) : getLinksInGroup(data, group)

		activeGroups.push({
			lis,
			div,
			links,
			title: group,
			pinned: group !== selected,
			synced: synced?.includes(group),
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
		const folderid = linkgroup.dataset.folder

		if (group.synced) {
			group.links = syncBookmarks(group.title)
		}

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
			li.addEventListener('keyup', displayEditDialog)

			if (!group.synced) {
				li.addEventListener('click', selectAll)
				li.addEventListener('pointerdown', selectAll)
				li.addEventListener('pointerdown', startDrag)
			}
		}

		if (folderid) {
			linktitle.textContent = (data[folderid] as Links.Folder).title
		} else {
			linktitle.textContent = group.title
		}

		linkgroup.dataset.group = group.title
		linkgroup.classList.toggle('pinned', group.pinned)
		linkgroup.classList.toggle('synced', group.synced)
		linklist.appendChild(fragment)
		domlinkblocks.prepend(linkgroup)

		if (group.title === 'topsites') {
			linktitle.textContent = tradThis('Most visited')
			linktitle.classList.add('topsites-title')
			linkgroup.classList.add('topsites-group')
		}

		if (group.title === 'default') {
			linktitle.textContent = tradThis('Default group')
		}
	}

	createIcons(isInit)
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
		const iconurl = link.icon ?? ''
		const refresh = new Date(parseInt(iconurl))?.getTime()
		const isDefaultRefreshed = Number.isInteger(refresh)
		const isUserDefined = !isDefaultRefreshed && !!link.icon

		const icon = isUserDefined ? link.icon! : getDefaultIcon(link.url, refresh)

		initIconList.push([img, icon])
	}

	if (openInNewtab) {
		anchor.target = '_blank'
	}

	return li
}

function createIcons(isInit?: true) {
	const loadingTimeout = isInit ? 400 : 0

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
	}, loadingTimeout)
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
	domlinkblocks.querySelectorAll('.link').forEach((li) => li.classList.remove('selected'))
}

// Updates

export async function linksUpdate(update: LinksUpdate) {
	let data = await storage.sync.get()

	if (update.addLinks) data = linkSubmission({ type: 'link', links: update.addLinks }, data)
	if (update.addFolder) data = linkSubmission({ type: 'folder', ...update.addFolder }, data)
	if (update.addGroups) data = addGroup(update.addGroups, data)
	if (update.moveLinks) data = moveLinks(update.moveLinks, data)
	if (update.moveGroups) data = moveGroups(update.moveGroups, data)
	if (update.moveToGroup) data = moveToGroup(update.moveToGroup, data)
	if (update.moveToFolder) data = moveToFolder(update.moveToFolder, data)
	if (update.concatFolders) data = concatFolders(update.concatFolders, data)
	if (update.moveOutFolder) data = moveOutFolder(update.moveOutFolder, data)
	if (update.updateLink) data = updateLink(update.updateLink, data)
	if (update.deleteLinks) data = deleteLinks(update.deleteLinks, data)
	if (update.groupTitle) data = changeGroupTitle(update.groupTitle, data)
	if (update.deleteGroup !== undefined) data = deleteGroup(update.deleteGroup, data)
	if (update.groups !== undefined) data = toggleGroups(update.groups, data)
	if (update.newtab !== undefined) data = setOpenInNewTab(update.newtab, data)
	if (update.refreshIcons) data = refreshIcons(update.refreshIcons, data)
	if (update.styles) setLinkStyle(update.styles)
	if (update.row) setRows(update.row)

	if (update.styles || update.row) {
		return
	}

	storage.sync.set(data)
}

function linkSubmission(args: SubmitLink | SubmitFolder, data: Sync): Sync {
	const folderid = domlinkblocks.dataset.folderid
	const type = args.type
	let newlinks: Link[] = []

	if (type === 'link') {
		args.links.forEach((link) => {
			newlinks.push(validateLink(link.title, link.url, link.group))
		})
	}

	if (type === 'folder') {
		const { ids, title, group } = args
		newlinks = addLinkFolder(ids, title, group)

		for (const id of ids) {
			const elem = data[id] as Link

			if (elem && !elem.folder) {
				elem.parent = newlinks[0]._id
			}
		}
	}

	// Adds parent if missing from link validation
	for (const link of newlinks) {
		const addsFromFolder = folderid && !link.folder
		const noParents = link.parent === undefined
		const { selected, synced } = data.linkgroups

		if (addsFromFolder) {
			link.parent = folderid
		}
		//
		else if (noParents && synced.includes(selected)) {
			link.parent = ''
			data.linkgroups.selected = ''
			initGroups(data)
		}
		//
		else if (noParents) {
			link.parent = selected
		}

		data[link._id] = link
	}

	data = correctLinksOrder(data)
	initblocks(data)
	return data
}

function addLinkFolder(ids: string[], title?: string, group?: string): Links.Folder[] {
	const titledom = document.getElementById('e-title') as HTMLInputElement

	title = title ?? titledom.value
	titledom.value = ''

	const blocks = [...document.querySelectorAll<HTMLElement>('.link')]
	const idsOnInterface = blocks.map((block) => block.id)
	const order = idsOnInterface.indexOf(ids[0])

	for (let i = 0; i < ids.length; i++) {
		const dom = document.getElementById(ids[i])
		const isFolder = dom?.classList.contains('link-folder')

		if (isFolder) {
			ids.splice(i, 1)
		}
	}

	return [
		{
			_id: 'links' + randomString(6),
			folder: true,
			order: order,
			parent: group ?? '',
			title: title,
		},
	]
}

function updateLink({ id, title, icon, url }: UpdateLink, data: Sync): Sync {
	const titledom = document.querySelector<HTMLSpanElement>(`#${id} span`)
	const icondom = document.querySelector<HTMLImageElement>(`#${id} img`)
	const urldom = document.querySelector<HTMLAnchorElement>(`#${id} a`)
	const link = data[id] as Links.Link

	if (titledom && title !== undefined) {
		link.title = stringMaxSize(title, 64)
		titledom.textContent = link.title
	}

	if (!link.folder) {
		if (icondom) {
			const url = (icon ? stringMaxSize(icon, 7500) : undefined) ?? getDefaultIcon(link.url)
			const img = document.createElement('img')

			link.icon = url ? url : undefined

			icondom.src = 'src/assets/interface/loading.svg'
			img.onload = () => (icondom!.src = url)
			img.src = url
		}

		if (titledom && urldom && url !== undefined) {
			link.url = stringMaxSize(url, 512)
			urldom.href = link.url
			titledom.textContent = createTitle(link)
		}
	}

	data[id] = link
	return data
}

function concatFolders({ target, source }: MoveToFolder, data: Sync): Sync {
	const linktarget = data[target] as Links.Link
	const linksource = data[source] as Links.Link

	if (!linktarget.folder || !linksource.folder) {
		return data
	}

	const sourceIds = getLinksInFolder(data, source).map(({ _id }) => _id)
	const targetIds = getLinksInFolder(data, target).map(({ _id }) => _id)
	const ids = [...targetIds, ...sourceIds]

	for (const [key, val] of Object.entries(data)) {
		if (isLink(val) === false) {
			continue
		}

		if (ids.includes(val._id) && !val.folder) {
			;(data[key] as Elem).parent = target
			;(data[key] as Elem).order = Date.now()
		}
	}

	delete data[source]
	initblocks(data)

	setTimeout(() => storage.sync.remove(source))

	return data
}

function moveToFolder({ target, source }: MoveToFolder, data: Sync): Sync {
	const isSourceElem = typeof (data[source] as Links.Elem)?.url === 'string'
	const isTargetFolder = (data[target] as Links.Folder)?.folder === true

	if (isSourceElem && isTargetFolder) {
		;(data[source] as Elem).parent = target
		;(data[source] as Elem).order = Date.now()
		initblocks(data)
	}

	return data
}

function moveOutFolder({ ids, group }: { ids: string[]; group: string }, data: Sync): Sync {
	for (const id of ids) {
		;(data[id] as Link).parent = group
		;(data[id] as Link).order = Date.now()
	}

	data = correctLinksOrder(data)
	initblocks(data)
	return data
}

function deleteLinks(ids: string[], data: Sync): Sync {
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
	data = correctLinksOrder(data)
	animateLinksRemove(ids)
	return data
}

function moveLinks(ids: string[], data: Sync): Sync {
	ids.forEach((id, i) => {
		;(data[id] as Link).order = i
	})

	initblocks(data)
	return data
}

function moveToGroup({ ids, target }: MoveToGroup, data: Sync): Sync {
	for (const id of ids) {
		;(data[id] as Link).parent = target
		;(data[id] as Link).order = Date.now()
	}

	data = correctLinksOrder(data)
	initblocks(data)
	return data
}

function refreshIcons(ids: string[], data: Sync): Sync {
	for (const id of ids) {
		const link = data[id] as Links.Elem

		if (link._id) {
			link.icon = Date.now().toString()
			data[id] = link
		}
	}

	initblocks(data)

	return data
}

function setOpenInNewTab(newtab: boolean, data: Sync.Storage): Sync.Storage {
	const anchors = document.querySelectorAll<HTMLAnchorElement>('.link a')

	for (const anchor of anchors) {
		if (newtab) {
			anchor.setAttribute('target', '_blank')
		} else {
			anchor.removeAttribute('target')
		}
	}

	data.linknewtab = newtab

	return data
}

async function setLinkStyle(styles: { style?: string; titles?: boolean; backgrounds?: boolean }) {
	const data = await storage.sync.get()
	const style = styles.style ?? 'large'
	const { titles } = styles
	const { backgrounds } = styles

	if (styles.style && isLinkStyle(style)) {
		const wasText = domlinkblocks?.className.includes('text')

		domlinkblocks.classList.remove('large', 'medium', 'small', 'inline', 'text')
		domlinkblocks.classList.add(style)

		data.linkstyle = style
		storage.sync.set({ linkstyle: style })

		// remove from DOM to re-draw icons
		if (wasText) {
			document.querySelectorAll('#link-list li')?.forEach((el) => {
				el.remove()
			})
		}

		initRows(data.linksrow, style)
		initblocks(data)
	}

	if (typeof titles === 'boolean') {
		data.linktitles = titles
		storage.sync.set({ linktitles: titles })

		document.getElementById('b_showtitles')?.classList?.toggle('on', titles)
		domlinkblocks.classList.toggle('titles', titles)
	}

	if (typeof backgrounds === 'boolean') {
		data.linkbackgrounds = backgrounds
		storage.sync.set({ linkbackgrounds: backgrounds })

		document.getElementById('b_showbackgrounds')?.classList?.toggle('on', backgrounds)
		domlinkblocks.classList.toggle('backgrounds', backgrounds)
	}
}

function setRows(row: string) {
	const style = [...domlinkblocks.classList].filter(isLinkStyle)[0] ?? 'large'
	const val = parseInt(row ?? '6')
	initRows(val, style)
	eventDebounce({ linksrow: row })
}

// Helpers

export function validateLink(title: string, url: string, parent?: string): Links.Elem {
	const startsWithEither = (strs: string[]) => strs.some((str) => url.startsWith(str))

	url = stringMaxSize(url, 512)

	const isConfig = startsWithEither(['about:', 'chrome://', 'edge://'])
	const noProtocol = !startsWithEither(['https://', 'http://'])
	const isLocalhost = url.startsWith('localhost') || url.startsWith('127.0.0.1')
	const prefix = isConfig ? '#' : isLocalhost ? 'http://' : noProtocol ? 'https://' : ''

	url = prefix + url

	return {
		_id: 'links' + randomString(6),
		parent,
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

function correctLinksOrder(data: Sync): Sync {
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

function isLinkStyle(s: string): s is Sync['linkstyle'] {
	return ['large', 'medium', 'small', 'inline', 'text'].includes(s)
}
