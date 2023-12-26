import { randomString, stringMaxSize, closeEditLink } from '../utils'
import { SYSTEM_OS, BROWSER, IS_MOBILE, MAIN_API } from '../defaults'
import { eventDebounce } from '../utils/debounce'
import onSettingsLoad from '../utils/onsettingsload'
import { tradThis } from '../utils/translations'
import transitioner from '../utils/transitioner'
import errorMessage from '../utils/errormessage'
import storage from '../storage'

type Link = Links.Link

type Keyval<T> = { [key: string]: T }

type LinksUpdate = {
	bookmarks?: { title: string; url: string }[]
	newtab?: boolean
	style?: string
	row?: string
	tab?: boolean
	addLink?: boolean
	addFolder?: string[]
	groupTitle?: string
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
const dominterface = document.getElementById('interface') as HTMLDivElement
const domeditlink = document.getElementById('editlink') as HTMLDivElement

let mobileLongpressTimer = 0
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
	domlinkblocks.className = init.linkstyle
	domlinkblocks.classList.toggle('hidden', !init.quicklinks)

	initTabs(init.tabs)
	initRows(init.linksrow, init.linkstyle)
	initblocks(getAllLinksInTab(init, init.tabs.selected), init.linknewtab)
}

onSettingsLoad(() => {
	if (SYSTEM_OS === 'ios' || !IS_MOBILE) {
		window.addEventListener('resize', () => {
			if (domeditlink?.classList.contains('shown')) closeEditLink()
		})
	}
})

//
// Initialisation
//

async function initblocks(links: Link[], openInNewtab: boolean): Promise<true> {
	const tabList = document.querySelector<HTMLUListElement>('#link-list')

	if (tabList && tabList?.children) {
		Object.values(tabList?.children).forEach((child) => {
			child.remove()
		})
	}

	if (links.length === 0) {
		document.dispatchEvent(new CustomEvent('interface', { detail: 'links' }))
		return true
	}

	const parser = new DOMParser()
	const fragment = document.createDocumentFragment()

	// Extract icon url from links inside folders
	const folderIcons: Keyval<string[]> = {}
	const folderIds: string[] = []

	for (const folder of links.filter(isFolder)) {
		folderIcons[folder._id] = []

		for (const id of folder.ids) {
			const link = links.find(({ _id }) => _id === id)

			if (link && !isFolder(link)) {
				folderIcons[folder._id].push(link.icon ?? getDefaultIcon(link.url))
				folderIds.push(link._id)
			}
		}
	}

	// Create links DOM

	for (const link of links) {
		if (folderIds.includes(link._id)) {
			continue
		}

		let li: HTMLLIElement

		if (isFolder(link)) {
			li = createLinkFolder(link, folderIcons[link._id], parser)
		} else {
			li = createLinkElem(link, openInNewtab, parser)
		}

		li.addEventListener('keyup', openEdit)
		li.addEventListener('contextmenu', openEdit)
		li.addEventListener('click', selectAll)
		li.addEventListener('mousedown', selectAll)
		li.addEventListener('mouseup', selectAll)
		li.addEventListener('dragstart', startDrag)
		li.addEventListener('touchstart', openEditMobile, { passive: false })
		li.addEventListener('touchmove', openEditMobile, { passive: false })
		li.addEventListener('touchend', openEditMobile, { passive: false })

		fragment.appendChild(li)
	}

	tabList?.appendChild(fragment)

	document.dispatchEvent(new CustomEvent('interface', { detail: 'links' }))
	return true
}

function createLinkFolder(link: Links.Folder, icons: string[], parser: DOMParser): HTMLLIElement {
	const folderhtml = `
		<li class="block folder" draggable="true">
			<div></div>
			<span></span
		</li>`

	const doc = parser.parseFromString(folderhtml, 'text/html')
	const li = doc.querySelector('li')!
	const span = doc.querySelector('span')!
	const folder = doc.querySelector('div')!
	const title = stringMaxSize(link.title, 64)

	span.textContent = title

	for (let i = 0; i < icons.length; i++) {
		const img = document.createElement('img')
		img.alt = ''
		img.draggable = false
		img.src = icons[i]
		folder.appendChild(img)
	}

	li.id = link._id
	li.addEventListener('click', openFolder)

	return li
}

function createLinkElem(link: Links.Elem, openInNewtab: boolean, parser: DOMParser) {
	const linkhtml = `
		<li class="block" draggable="true">
			<a draggable="false" rel="noreferrer noopener">
				<img alt="" src="" draggable="false">
				<span></span>
			</a>
		</li>`

	const url = stringMaxSize(link.url, 512)
	const doc = parser.parseFromString(linkhtml, 'text/html')
	const li = doc.querySelector('li')!
	const span = doc.querySelector('span')!
	const anchor = doc.querySelector('a')!
	const img = doc.querySelector('img')!
	const isText = domlinkblocks.className === 'text'
	const title = linkElemTitle(stringMaxSize(link.title, 64), link.url, isText)

	if (openInNewtab) {
		if (BROWSER === 'safari') {
			anchor.addEventListener('click', handleSafariNewtab)
		} else {
			anchor.setAttribute('target', '_blank')
		}
	}

	span.textContent = title
	li.id = link._id
	anchor.href = url
	createIcons(img, link)

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
		text: { width: 5, gap: 2 }, // arbitrary width because width is auto
	}

	if (linklist && style in sizes) {
		const { width, gap } = sizes[style as keyof typeof sizes]
		linklist.style.maxWidth = (width + gap) * amount + 'em'
	}
}

//
//	Events
//

onSettingsLoad(() => {
	document.body.addEventListener('click', dismissSelectAllAndFolder)
})

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
			await initblocks(getAllLinksInFolder(data, li.id), false)
		},
		function show() {
			domlinkblocks.classList.replace('hiding', 'in-folder')
		},
		200
	)
}

async function closeFolder() {
	const data = await storage.sync.get()
	const { selected, list } = data.tabs

	transitioner(
		function hide() {
			domlinkblocks.dataset.folderid = ''
			domlinkblocks.classList.add('hiding')
		},
		async function changeToTab() {
			toggleTabsTitleType(list[0].title)
			await initblocks(getAllLinksInTab(data, selected), false)
		},
		function show() {
			domlinkblocks.classList.remove('in-folder')
			domlinkblocks.classList.remove('hiding')
		},
		200
	)
}

function dismissSelectAllAndFolder(event: Event) {
	if (!clicksOnInterface(event)) {
		return
	}

	// Remove first select all
	if (domlinkblocks.classList.contains('select-all')) {
		domlinkblocks.classList.remove('select-all')
		document.querySelectorAll('.block').forEach((b) => b.classList.remove('selected'))
	}
	// then close folder
	else if (domlinkblocks.classList.contains('in-folder')) {
		closeFolder()
	}
}

function openEdit(event: Event) {
	const li = getLiFromEvent(event)
	let x = 0
	let y = 0

	if (event.type === 'keyup' && (event as KeyboardEvent)?.key === 'e') {
		x = (event.target as HTMLElement).offsetLeft
		y = (event.target as HTMLElement).offsetTop
	}

	if (event.type === 'contextmenu') {
		x = (event as PointerEvent).x
		y = (event as PointerEvent).y
	}

	if (li && x && y) {
		displayEditDialog(li, x, y)
		li?.classList.add('selected')
		event.preventDefault()
	}
}

function openEditMobile(event: TouchEvent) {
	if (event.type === 'touchstart') {
		mobileLongpressTimer = setTimeout(() => open(), 600)
	} else {
		clearTimeout(mobileLongpressTimer)
	}

	function open() {
		const li = getLiFromEvent(event)

		if (li) {
			displayEditDialog(li, 0, 0)
			event.preventDefault()
		}
	}
}

function selectAll(event: MouseEvent) {
	clearTimeout(selectallTimer)

	const selectAllActive = domlinkblocks.className.includes('select-all')
	const li = getLiFromEvent(event)

	// toggle selection
	if (selectAllActive && event.type === 'click') {
		li?.classList.toggle('selected')
		event.preventDefault()
		return
	}

	// disable link when selecting all
	if (selectAllActive && event.type.match(/mouseup|click/)) {
		event.preventDefault()
		return
	}

	// start select all debounce
	if (!selectAllActive && event.type === 'mousedown') {
		selectallTimer = setTimeout(() => {
			domlinkblocks.classList.add('select-all')
		}, 600)
	}
}

//
// Tabs
//

function initTabs(tabs: Links.Tabs) {
	tabs.list.forEach((tab, i) => {
		appendNewTab(tab.title, tabs.selected === i)
	})

	onSettingsLoad(() => {
		document.getElementById('b_addlinktab')?.addEventListener('click', function () {
			linksUpdate({ tab: true })
		})

		document.getElementById('b_remlinktab')?.addEventListener('click', function () {
			linksUpdate({ tab: false })
		})

		const observer = new MutationObserver(toggleHiddenTab)
		observer.observe(domlinkblocks, { attributes: true, attributeFilter: ['class'] })
	})

	toggleHiddenTab()
}

function toggleHiddenTab() {
	const tabwrapper = document.getElementById('link-title')
	const tabs = document?.querySelectorAll('#link-title > div')
	const notInFolder = !domlinkblocks.classList.contains('in-folder')
	tabwrapper?.classList.toggle('hidden', notInFolder && (tabs?.length ?? 1) === 1)
}

function toggleTabsTitleType(title: string, selected?: number): void {
	const folderid = domlinkblocks.dataset.folderid
	const firstinput = document.querySelector<HTMLInputElement>('#link-title input')

	if (!!folderid) {
		document.querySelector<HTMLInputElement>('#link-title')?.click()
	}

	if (firstinput) {
		firstinput.value = title
		firstinput.style.width = title.length + 'ch'
		firstinput.placeholder = !!folderid ? tradThis('folder') : tradThis('tab')
	}
}

function appendNewTab(title: string, selected?: boolean): void {
	const linktitle = document.getElementById('link-title')
	const input = document.createElement('input')
	const div = document.createElement('div')

	input.ariaLabel = tradThis('Change link group title')
	input.placeholder = tradThis('tab')
	input.maxLength = 32
	input.value = title
	input.style.width = input.value.length + 'ch'

	div.tabIndex = 0
	div.classList.toggle('selected', selected)

	input?.addEventListener('change', function () {
		linksUpdate({ groupTitle: this.value })
		this.blur()
	})

	div?.addEventListener('click', function () {
		changeTab(div)
	})

	input.addEventListener('input', function () {
		this.style.width = this.value.length + 'ch'
	})

	div.appendChild(input)
	linktitle?.appendChild(div)
}

function changeTab(div: HTMLDivElement) {
	if (!!domlinkblocks.dataset.folderid || div.classList.contains('selected')) {
		return
	}

	transitioner(
		function hideCurrentTab() {
			domlinkblocks.classList.remove('in-folder')
			domlinkblocks.classList.add('hiding')
		},
		async function recreateLinksFromNewTab() {
			const divs = Object.values(document.querySelectorAll('#link-title div'))
			const data = await storage.sync.get()

			divs?.forEach((div) => div.classList.remove('selected'))
			div.classList.add('selected')
			data.tabs.selected = divs.indexOf(div)
			storage.sync.set({ tabs: data.tabs })

			await initblocks(getAllLinksInTab(data, data.tabs.selected), false)
		},
		function showNewTab() {
			domlinkblocks.classList.remove('hiding')
		},
		100
	)
}

//
//	Drag
//

type Coords = { x: number; y: number }

const clones: Map<string, HTMLLIElement> = new Map()
let [cox, coy, lastIndex, interfacemargin] = [0, 0, 0, 0]
let draggedId = ''
let ids: string[] = []
let initids: string[] = []
let coords: Coords[] = []

const deplaceElem = (dom?: HTMLElement, x = 0, y = 0) => {
	if (dom) {
		dom.style.transform = `translate3d(${x - interfacemargin}px, ${y}px, 0)`
	}
}

function startDrag(event: DragEvent) {
	const lilist = Object.values(document.querySelectorAll<HTMLLIElement>('#linkblocks li'))
	const element = lilist.filter((li) => li === event.target)[0]

	//
	// Reset shared variables by these events

	draggedId = element?.id ?? ''
	clearTimeout(selectallTimer)
	dominterface.style.cursor = 'grabbing'
	interfacemargin = dominterface.getBoundingClientRect().left

	ids = []
	coords = []
	initids = []
	clones.clear()

	//
	// Create visible links clones
	// And add all drag & drop events

	const fragment = document.createDocumentFragment()

	for (const li of lilist) {
		const clone = li.cloneNode(true) as HTMLLIElement
		const { x, y } = li.getBoundingClientRect()
		const id = li.id

		ids.push(id)
		initids.push(id)
		coords.push({ x, y })

		clone.removeAttribute('id')
		clone.classList.add('dragging-clone')
		clones.set(id, clone)
		deplaceElem(clone, x, y)
		fragment.appendChild(clone)

		if (id === draggedId) {
			cox = event.clientX - x
			coy = event.clientY - y
			clone.classList.add('on')
		}

		li.addEventListener('dragenter', () => applyDrag(lilist.indexOf(li)))
		li.addEventListener('drag', moveDrag)
		li.addEventListener('drop', endDrag)
	}

	domlinkblocks?.classList.add('dragging')
	document.querySelector('#link-list')?.appendChild(fragment)

	//
	// Firefox keeps clientX/Y ondrag to 0 because of, checks notes, a 15yo bug
	// https://bugzilla.mozilla.org/show_bug.cgi?id=505521

	if (BROWSER === 'firefox') {
		document.documentElement.addEventListener('dragover', moveDragFirefox)
		document.documentElement.addEventListener('dragend', endDrag)
	}

	//
	// Hide drag preview
	// https://stackoverflow.com/questions/27989602/hide-drag-preview-html-drag-and-drop

	const elem = element.cloneNode(true) as HTMLLIElement
	elem.id = 'link-drag-preview'
	elem.style.position = 'absolute'
	elem.style.opacity = '0'
	elem.style.zIndex = '-1'
	domlinkblocks?.appendChild(elem)
	event.dataTransfer?.setDragImage(elem, 0, 0)
}

function moveDrag(event: DragEvent) {
	const x = event.clientX - cox
	const y = event.clientY - coy

	deplaceElem(clones.get(draggedId), x, y)

	// this triggers drop event
	if (BROWSER !== 'firefox' && event.clientX === 0 && event.clientY === 0) {
		;(event.target as HTMLLIElement).dispatchEvent(new DragEvent('drop'))
	}
}

function moveDragFirefox(event: DragEvent) {
	event.preventDefault()
	moveDrag(event)
}

function applyDrag(targetIndex: number) {
	if (lastIndex === targetIndex) {
		return
	}

	lastIndex = targetIndex

	// move dragged element to target position in array
	ids.splice(ids.indexOf(draggedId), 1)
	ids.splice(targetIndex, 0, draggedId)

	// move all clones to new position
	for (let i = 0; i < ids.length; i++) {
		if (ids[i] !== draggedId) {
			deplaceElem(clones.get(ids[i]), coords[i].x, coords[i].y)
		}
	}
}

function endDrag() {
	const newIndex = ids.indexOf(draggedId)
	const clone = clones.get(draggedId)
	const coord = coords[newIndex]

	deplaceElem(clone, coord.x, coord.y)

	clone?.classList.remove('on')
	dominterface.style.cursor = ''
	domlinkblocks.querySelector('#link-drag-preview')?.remove()
	document.documentElement.removeEventListener('dragover', moveDragFirefox)
	document.documentElement.removeEventListener('dragend', endDrag)

	setTimeout(async () => {
		const data = await storage.sync.get()

		// ugly: keep tab links contained in folders with the new order
		// there is probably a more concise way to do this
		const currids = data.tabs.list[data.tabs.selected].ids
		const sortedids = ids.filter((id) => currids.includes(id)).concat(currids.filter((id) => !ids.includes(id)))
		data.tabs.list[data.tabs.selected].ids = sortedids

		storage.sync.set(data)

		initblocks(getAllLinksInTab(data), data.linknewtab)
		domlinkblocks?.classList.remove('dragging')
	}, 200)
}

//
// 	Edit links dialog
//

onSettingsLoad(() => {
	document.getElementById('e_title')?.addEventListener('change', submitLinksChange)
	document.getElementById('e_url')?.addEventListener('change', submitLinksChange)
	document.getElementById('e_iconurl')?.addEventListener('change', submitLinksChange)
	document.getElementById('e_delete')?.addEventListener('click', deleteSelection)
	document.getElementById('e_submit')?.addEventListener('click', submitLinksChange)
	document.getElementById('e_delete-sel')?.addEventListener('click', deleteSelection)
	document.getElementById('e_folder-sel')?.addEventListener('click', addSelectionToNewFolder)
	document.getElementById('e_folder-remove-sel')?.addEventListener('click', removeSelectionFromFolder)
})

async function displayEditDialog(li: HTMLLIElement, x: number, y: number) {
	const linkId = li.id
	const domicon = li.querySelector('img')
	const domedit = document.querySelector('#editlink')
	const opendedSettings = document.getElementById('settings')?.classList.contains('shown') ?? false

	const data = await storage.sync.get(linkId)
	const link = data[linkId] as Link

	const domtitle = document.getElementById('e_title') as HTMLInputElement
	const domurl = document.getElementById('e_url') as HTMLInputElement
	const domiconurl = document.getElementById('e_iconurl') as HTMLInputElement

	domtitle.setAttribute('placeholder', tradThis('Title'))
	domurl.setAttribute('placeholder', tradThis('Link'))
	domiconurl.setAttribute('placeholder', tradThis('Icon'))
	domtitle.value = link.title

	if (isFolder(link) === false) {
		domurl.value = link.url
		domiconurl.value = link.icon ?? ''
	}

	domedit?.classList.add('shown')
	domicon?.classList.add('selected')
	domedit?.classList.toggle('folder', isFolder(link))
	domedit?.classList.toggle('pushed', opendedSettings)

	const { innerHeight, innerWidth } = window

	if (x + 320 > innerWidth) x -= x + 320 - innerWidth // right overflow pushes to left
	if (y + 270 > innerHeight) y -= 270 // bottom overflow pushes above mouse

	// Moves edit link to mouse position
	const domeditlink = document.getElementById('editlink')
	if (domeditlink) domeditlink.style.transform = `translate(${x + 3}px, ${y + 3}px)`

	// Focusing on touch opens virtual keyboard without user action, not good
	if (IS_MOBILE === false) {
		domtitle.focus()
	}
}

async function submitLinksChange(event: Event) {
	const id = getSelectedIds()[0]
	const target = event.target as HTMLElement
	const li = document.querySelector<HTMLLIElement>(`#${id}`)

	if (!id || !li) {
		return
	}

	if (target.tagName === 'INPUT') {
		target.blur()
	} else {
		closeEditLink()
	}

	const data = await storage.sync.get(id)
	const link = data[id] as Link

	const title = {
		val: document.querySelector<HTMLInputElement>('#e_title')?.value,
		dom: document.querySelector<HTMLSpanElement>(`#${id} span`),
	}

	const url = {
		val: document.querySelector<HTMLInputElement>('#e_url')?.value,
		dom: document.querySelector<HTMLAnchorElement>(`#${id} a`),
	}

	const icon = {
		val: document.querySelector<HTMLInputElement>('#e_iconurl')?.value,
		dom: document.querySelector<HTMLImageElement>(`#${id} img`),
	}

	if (title.dom && title.val !== undefined) {
		link.title = stringMaxSize(title.val, 64)
		title.dom.textContent = link.title
	}

	if (isFolder(link) === false) {
		if (icon.dom) {
			link.icon = icon.val ? stringMaxSize(icon.val, 7500) : undefined
			icon.dom.src = link.icon ?? getDefaultIcon(link.url)
		}

		if (title.dom && url.dom && url.val !== undefined) {
			link.url = stringMaxSize(url.val, 512)
			url.dom.href = link.url
			title.dom.textContent = linkElemTitle(link.title, link.url, domlinkblocks.className === 'text')
		}
	}

	storage.sync.set({ [id]: link })
}

function addSelectionToNewFolder() {
	let ids: string[] = getSelectedIds()

	for (let i = 0; i < ids.length; i++) {
		const dom = document.getElementById(ids[i])
		const isFolder = dom?.classList.contains('folder')

		if (isFolder) {
			ids.splice(i, 1)
		}
	}

	domlinkblocks?.classList.remove('select-all')

	linksUpdate({ addFolder: ids })
	closeEditLink()
}

function deleteSelection() {
	const ids = getSelectedIds()

	deleteLinks(ids)
	closeEditLink()

	// Animation
	for (const id of ids) {
		document.getElementById(id)?.classList.add('removed')
		setTimeout(() => document.getElementById(id)?.remove(), 600)
	}
}

function removeSelectionFromFolder() {
	removeLinksFromFolder(getSelectedIds())
	domlinkblocks?.classList.remove('select-all')
	closeEditLink()
}

//
// Updates
//

async function linksUpdate(update: LinksUpdate) {
	const { bookmarks, newtab, style, row, tab, addLink, addFolder, groupTitle } = update

	if (addLink) {
		linkSubmission({ type: 'link' })
	}

	if (addFolder) {
		linkSubmission({ type: 'folder', ids: addFolder })
	}

	if (bookmarks) {
		linkSubmission({ type: 'import', bookmarks: bookmarks })
	}

	if (typeof tab === 'boolean') {
		setTab(tab ? 'add' : 'remove')
	}

	if (groupTitle !== undefined) {
		setGroupTitle(groupTitle)
	}

	if (newtab !== undefined) {
		setOpenInNewTab(newtab)
	}

	if (style) {
		setLinkStyle(style)
	}

	if (row) {
		setRows(row)
	}
}

async function linkSubmission(arg: LinkSubmission) {
	const data = await storage.sync.get()
	const tab = data.tabs.list[data.tabs.selected]
	const folderid = domlinkblocks.dataset.folderid
	let links: Link[] = []
	let newlinks: Link[] = []

	switch (arg.type) {
		case 'link': {
			newlinks = addLink()
			links = getAllLinksInTab(data, data.tabs.selected)
			break
		}

		case 'folder': {
			newlinks = addLinkFolder(arg.ids)
			links = getAllLinksInFolder(data, newlinks[0]._id)
			break
		}

		case 'import': {
			newlinks = (arg.bookmarks ?? []).map((b) => validateLink(b.title, b.url))
			links = getAllLinksInTab(data, data.tabs.selected)
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

	data.tabs.list[data.tabs.selected] = tab
	storage.sync.set(data)

	domlinkblocks.style.visibility = 'visible'

	if (folderid) {
		links = getAllLinksInFolder(data, folderid)
	} else {
		links = getAllLinksInTab(data, data.tabs.selected)
	}

	initblocks(links, data.linknewtab)
}

function addLink(): Links.Elem[] {
	const titledom = document.getElementById('i_title') as HTMLInputElement
	const urldom = document.getElementById('i_url') as HTMLInputElement
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
	const titledom = document.getElementById('i_title') as HTMLInputElement
	const title = titledom.value

	titledom.value = ''

	return [
		{
			_id: 'links' + randomString(6),
			ids: ids,
			title: title,
		},
	]
}

async function deleteLinks(ids: string[]) {
	let data = await storage.sync.get()
	const tab = data.tabs.list[data.tabs.selected]
	const folderId = domlinkblocks.dataset.folderid
	const currentlyInFolder = !!folderId

	for (const id of ids) {
		const toRemove = data[id] as Link

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

		tab.ids = removeFromList(tab.ids, id)
		data.tabs.list[data.tabs.selected] = tab
		delete data[id]
	}

	storage.sync.clear()
	storage.sync.set(data)
}

async function removeLinksFromFolder(ids: string[]) {
	if (!domlinkblocks.dataset.folderid) {
		return
	}

	const data = await storage.sync.get()
	const tab = data.tabs.list[data.tabs.selected]
	const folderid = domlinkblocks.dataset.folderid

	if (!!folderid) {
		const folder = data[folderid] as Links.Folder

		for (const id of ids) {
			folder.ids = folder.ids.filter((linkid) => linkid !== id)
		}

		data[folderid] = folder
		data.tabs.list[data.tabs.selected] = tab

		storage.sync.set(data)
		initblocks(getAllLinksInFolder(data, folder._id), data.linknewtab)
	}
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

	const { tabs } = await storage.sync.get('tabs')
	const { selected } = tabs

	tabs.list[selected].title = title

	storage.sync.set({ tabs })
}

async function setTab(action: 'add' | 'remove') {
	const data = await storage.sync.get()
	const tabs = data.tabs
	const { list } = tabs

	if (action === 'add') {
		tabs.selected = list.length - 1

		tabs.list.push({ title: '', ids: [] })

		const divs = Object.values(document.querySelectorAll('#link-title div'))
		divs?.forEach((div) => div.classList.remove('selected'))

		appendNewTab('', true)
		initblocks([], false)
	}

	if (action === 'remove' && tabs.list.length > 1) {
		tabs.selected = tabs.selected === tabs.list.length - 1 ? tabs.selected - 1 : tabs.selected
		tabs.list.pop()

		document.querySelector('#link-title div:last-child')?.remove()
		initblocks(getAllLinksInTab(data, tabs.selected), false)
	}
	toggleHiddenTab()

	data.tabs = tabs
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

async function setLinkStyle(style: string) {
	const data = await storage.sync.get()
	const links = getAllLinksInTab(data, data.tabs.selected)

	for (const link of links) {
		const span = document.querySelector<HTMLSpanElement>(`#links${link._id} span`)
		const isElem = isFolder(link) === false

		if (span && isElem) {
			span.textContent = linkElemTitle(link.title, link.url, style === 'text')
		}
	}

	style = style ?? 'large'
	domlinkblocks.classList.remove('large', 'medium', 'small', 'text')
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

function isFolder(link: Link): link is Links.Folder {
	return (link as Links.Folder).ids !== undefined
}

function getDefaultIcon(url: string) {
	return `${MAIN_API}/favicon/blob/${url}`
}

function removeFromList(arr: string[], id: string): string[] {
	return arr.filter((item) => item !== id)
}

function getLiFromEvent(event: Event): HTMLLIElement | undefined {
	const path = event.composedPath() as Element[]
	const filtered = path.filter((el) => el.tagName === 'LI' && el.className?.includes('block'))
	const li = !!filtered[0] ? (filtered[0] as HTMLLIElement) : undefined
	return li
}

function getSelectedIds(): string[] {
	const selected = document.querySelectorAll<HTMLLIElement>('#linkblocks li.selected')
	return Array.from(selected).map((li) => li.id)
}

function linkElemTitle(title: string, url: string, textOnly: boolean): string {
	try {
		url = new URL(url)?.origin
	} catch (_) {}
	return textOnly && title === '' ? url : title
}

function clicksOnInterface(event: Event) {
	const path = event.composedPath() ?? [document.body]
	const node = path[0] as Element | undefined
	const clicksOnInterface = node?.id === 'interface' || node?.tagName === 'BODY'

	return clicksOnInterface
}

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

function getAllLinksInTab(data: Sync.Storage, index?: number): Link[] {
	index = index ?? data.tabs.selected

	const tab = data.tabs.list[index]
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
