import { randomString, stringMaxSize, closeEditLink, apiFetch } from '../utils'
import { SYSTEM_OS, BROWSER, IS_MOBILE, MAIN_API } from '../defaults'
import { eventDebounce } from '../utils/debounce'
import onSettingsLoad from '../utils/onsettingsload'
import { tradThis } from '../utils/translations'
import transitioner from '../utils/transitioner'
import errorMessage from '../utils/errormessage'
import storage from '../storage'

type Link = Links.Link

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
	initblocks(getAllLinksInTab(init, init.tabs.selected), init.linknewtab)
	setRows(init.linksrow, init.linkstyle)
	onSettingsLoad(editEvents)
	createGlobalEvents()

	if (SYSTEM_OS === 'ios' || !IS_MOBILE) {
		window.addEventListener('resize', () => {
			if (domeditlink?.classList.contains('shown')) closeEditLink()
		})
	}
}

//
// Initialisation
//

async function initblocks(links: Link[], openInNewtab: boolean): Promise<true> {
	const tabUList = document.querySelector<HTMLUListElement>('#link-list')

	if (tabUList && tabUList?.children) {
		Object.values(tabUList?.children).forEach((child) => {
			child.remove()
		})
	}

	if (links.length === 0) {
		document.dispatchEvent(new CustomEvent('interface', { detail: 'links' }))
		return true
	}

	const linkhtml = `
		<li class="block">
			<a draggable="false" rel="noreferrer noopener">
				<img alt="" src="" loading="lazy" draggable="false">
				<span></span>
			</a>
		</li>`

	const folderhtml = `
		<li class="block folder">
			<div></div>
			<span></span>
		</li>`

	const parser = new DOMParser()
	const liList: HTMLLIElement[] = []
	const imgList: { [key: string]: HTMLImageElement } = {}

	const linkElems: Links.Elem[] = []
	const linkFolders: Links.Folder[] = []

	for (const link of links) {
		if (isFolder(link)) {
			linkFolders.push(link)
		} else {
			linkElems.push(link)
		}
	}

	//
	// Create links folders DOM
	//

	if (linkFolders.length > 0) {
		for (const link of linkFolders) {
			const doc = parser.parseFromString(folderhtml, 'text/html')
			const li = doc.querySelector('li')!
			const span = doc.querySelector('span')!
			const folder = doc.querySelector('div')!
			const title = stringMaxSize(link.title, 64)

			span.textContent = title

			link.ids.forEach(async (id, i) => {
				const elemIndex = linkElems.findIndex((link) => link._id === id)

				// Only add 4 images to folder preview
				if (i < 4) {
					const img = document.createElement('img')
					const elem = linkElems[elemIndex]

					if (!isFolder(elem)) {
						img.draggable = false
						img.src = elem.icon ?? getDefaultIcon(elem.url)
						img.alt = ''
						folder.appendChild(img)
					}
				}

				linkElems.splice(elemIndex, 1)
			})

			li.id = link._id
			liList.push(li)
			tabUList?.appendChild(li)
		}
	}

	//
	// Create links elements DOM
	//

	if (linkElems.length > 0) {
		for (const link of linkElems) {
			const url = stringMaxSize(link.url, 512)
			const doc = parser.parseFromString(linkhtml, 'text/html')
			const li = doc.querySelector('li')!
			const span = doc.querySelector('span')!
			const anchor = doc.querySelector('a')!
			const img = doc.querySelector('img')!
			const isText = domlinkblocks.className === 'text'
			const title = linkElemTitle(stringMaxSize(link.title, 64), link.url, isText)

			imgList[link._id] = img
			span.textContent = title

			li.id = link._id
			anchor.href = url

			if (openInNewtab) {
				BROWSER === 'safari'
					? anchor.addEventListener('click', handleSafariNewtab)
					: anchor.setAttribute('target', '_blank')
			}

			li.id = link._id
			liList.push(li)
			tabUList?.appendChild(li)
		}
	}

	for (const elem of liList) {
		createLinksEvents(elem)
	}

	createDragging(liList)
	createIcons(imgList, links)
	document.dispatchEvent(new CustomEvent('interface', { detail: 'links' }))

	return true
}

async function createIcons(imgs: { [key: string]: HTMLImageElement }, links: Link[]) {
	for (const link of links) {
		const img = imgs[link._id]

		if (!img || isFolder(link)) {
			continue
		}

		img.src = link.icon ?? getDefaultIcon(link.url)

		if (img.src.includes('loading.svg')) {
			await waitForIconLoad(link.url)
			img.src = getDefaultIcon(link.url)

			link.icon = undefined
			storage.sync.set({ [link._id]: link })
		}
	}
}

async function waitForIconLoad(url: string): Promise<true> {
	const img = document.createElement('img')

	img.src = getDefaultIcon(url)
	new Promise((r) => img.addEventListener('load', r))

	return true
}

async function clickOpensFolder(elem: HTMLLIElement) {
	if (elem.classList.contains('folder') === false) {
		return
	}

	const data = await storage.sync.get()
	const folder = data[elem.id] as Links.Folder

	transitioner(
		function hide() {
			domlinkblocks.dataset.folderid = elem.id
			domlinkblocks.classList.add('hiding')
			domlinkblocks.classList.remove('in-folder')
		},
		async function changeToFolder() {
			toggleTabsTitleType(folder.title)
			await initblocks(getAllLinksInFolder(data, elem.id), false)
		},
		function show() {
			domlinkblocks.classList.replace('hiding', 'in-folder')
		},
		200
	)
}

async function clickClosesFolder() {
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

function createGlobalEvents() {
	document.body.addEventListener('click', function (e) {
		if (!clicksOnInterface(e)) {
			return
		}

		// Remove first select all
		if (domlinkblocks.classList.contains('select-all')) {
			domlinkblocks.classList.remove('select-all')
			document.querySelectorAll('.block').forEach((b) => b.classList.remove('selected'))
		}
		// then close folder
		else if (domlinkblocks.classList.contains('in-folder')) {
			clickClosesFolder()
		}
	})
}

function createLinksEvents(elem: HTMLLIElement) {
	let mobileLongpressTimer = 0

	elem.addEventListener('keyup', openEditLink)
	elem.addEventListener('contextmenu', openEditLink)
	elem.addEventListener('click', openFolder)
	elem.addEventListener('click', selectAll)
	elem.addEventListener('mousedown', selectAll)
	elem.addEventListener('mouseup', selectAll)

	function openFolder() {
		if (domlinkblocks.className.includes('select-all')) {
			return
		}

		clearTimeout(selectallTimer)
		clickOpensFolder(elem)
	}

	function openEditLink(e: MouseEvent | KeyboardEvent) {
		const isContextmenu = e.type === 'contextmenu'
		const isKeyup = e.type === 'keyup'
		const pressesE = (e as KeyboardEvent)?.key === 'e'

		if (isKeyup && pressesE) {
			const { offsetLeft, offsetTop } = e.target as HTMLElement
			displayEditWindow(elem, { x: offsetLeft, y: offsetTop })
			elem.classList.add('selected')
			e.preventDefault()
		}

		if (isContextmenu) {
			const { x, y } = e as MouseEvent

			displayEditWindow(elem, { x, y })
			elem.classList.add('selected')
			e.preventDefault()
		}
	}

	function selectAll(event: MouseEvent) {
		clearTimeout(selectallTimer)

		const selectAllActive = domlinkblocks.className.includes('select-all')

		// toggle selection
		if (selectAllActive && event.type === 'click') {
			elem.classList.toggle('selected')
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

	//	Mobile
	//

	if (SYSTEM_OS === 'ios') {
		elem.addEventListener('touchstart', longPressDebounce, { passive: false })
		elem.addEventListener('touchmove', () => clearTimeout(mobileLongpressTimer), { passive: false })
		elem.addEventListener('touchend', () => clearTimeout(mobileLongpressTimer), { passive: false })
	}

	function longPressDebounce(ev: TouchEvent) {
		mobileLongpressTimer = setTimeout(() => {
			ev.preventDefault()

			displayEditWindow(elem, { x: 0, y: 0 }) // edit centered on mobile
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
// Drag events
//

function createDragging(LIList: HTMLLIElement[]) {
	type Coords = {
		x: number
		y: number
		triggerbox_tl: number
		triggerbox_tr: number
		triggerbox_bl: number
		triggerbox_br: number
	}

	let draggedId: string = ''
	let clones: Map<string, HTMLLIElement> = new Map()
	let ids: string[] = []
	let coords: Coords[] = []
	let startsDrag = false
	let [cox, coy] = [0, 0] // (cursor offset x & y)
	let interfacemargin = 0

	const deplaceElem = (dom?: HTMLElement, x = 0, y = 0) => {
		if (dom) {
			dom.style.transform = `translateX(${x}px) translateY(${y}px)`
		}
	}

	function initDrag(ex: number, ey: number, path: EventTarget[]) {
		let block = path.find((t) => (t as HTMLElement).className === 'block') as HTMLLIElement

		if (!block) {
			return
		}

		// Initialise toute les coordonnees
		// Defini l'ID de l'element qui se deplace
		// Defini la position de la souris pour pouvoir offset le deplacement de l'elem

		startsDrag = true
		draggedId = block.id
		dominterface.style.cursor = 'grabbing'
		clearTimeout(selectallTimer)

		ids = []
		coords = []

		for (const li of document.querySelectorAll('#linkblocks li')) {
			const { x, y, width, height } = li.getBoundingClientRect()

			const id = li.id
			const coord: Coords = {
				x,
				y,
				// Creates a box with 10% padding used to trigger
				// the rearrange if mouse position is in-between these values
				triggerbox_tl: x + width * 0.1,
				triggerbox_tr: x + width * 0.9,
				triggerbox_bl: y + height * 0.1,
				triggerbox_br: y + height * 0.9,
			}

			ids.push(id)
			coords.push(coord)

			// hide real
			;(li as HTMLLIElement).style.opacity = '0'

			// create clones
			const clone = li.cloneNode(true) as HTMLLIElement
			clone.id = ''
			clone.classList.add('dragging-clone', 'on')
			document.querySelector('#link-list')?.appendChild(clone)
			clones.set(id, clone)

			deplaceElem(clone, x, y)
		}

		const draggedIndex = ids.indexOf(draggedId)
		const draggedCoord = coords[draggedIndex]

		if (draggedCoord) {
			// offset to cursor position on dragged element
			cox = ex - draggedCoord.x
			coy = ey - draggedCoord.y
		}

		deplaceElem(clones.get(draggedId), ex - cox - interfacemargin, ey - coy)

		domlinkblocks?.classList.add('dragging')
	}

	function applyDrag(ex: number, ey: number) {
		// Dragged element clone follows cursor
		deplaceElem(clones.get(draggedId), ex - cox - interfacemargin, ey - coy)

		coords.forEach((coord, targetIndex) => {
			if (
				coord && // <- for prettier
				ex > coord.triggerbox_tl &&
				ex < coord.triggerbox_tr &&
				ey > coord.triggerbox_bl &&
				ey < coord.triggerbox_br
			) {
				// move dragged id to target position
				ids.splice(ids.indexOf(draggedId), 1)
				ids.splice(targetIndex, 0, draggedId)

				// move all clones to new position
				for (const id of ids) {
					const coord = coords[ids.indexOf(id)]

					if (coord && id !== draggedId) {
						deplaceElem(clones.get(id), coord.x, coord.y)
					}
				}
			}
		})
	}

	function endDrag() {
		if (draggedId && startsDrag) {
			const newIndex = ids.indexOf(draggedId)
			const clone = clones.get(draggedId)
			const coord = coords[newIndex]

			if (clone) {
				deplaceElem(clone, coord.x - interfacemargin, coord.y)
				clone.classList.remove('on')
			}

			dominterface.style.cursor = ''
			domlinkblocks?.classList.remove('dragging')
			document.body.removeEventListener('mousemove', triggerDragging)

			startsDrag = false
			draggedId = ''

			if (newIndex === -1 || ids.length !== coords.length) {
				return
			}

			setTimeout(async () => {
				const data = await storage.sync.get()

				data.tabs.list[data.tabs.selected].ids = ids

				eventDebounce({ ...data })
				initblocks(getAllLinksInTab(data, data.tabs.selected), data.linknewtab)
			}, 200)
		}
	}

	//
	// Event

	let initialpos = [0, 0]
	let shortPressTimeout: number

	function triggerDragging(e: MouseEvent | TouchEvent) {
		const isMouseEvent = 'buttons' in e
		const ex = isMouseEvent ? e.x : e.touches[0]?.clientX
		const ey = isMouseEvent ? e.y : e.touches[0]?.clientY

		// Offset between current and initial cursor position
		const thresholdpos = [Math.abs(initialpos[0] - ex), Math.abs(initialpos[1] - ey)]

		// Only apply drag if user moved by 10px, to prevent accidental dragging
		if (thresholdpos[0] > 10 || thresholdpos[1] > 10) {
			initialpos = [1e7, 1e7] // so that condition is always true until endDrag
			!startsDrag ? initDrag(ex, ey, e.composedPath()) : applyDrag(ex, ey)
		}

		if (isMouseEvent && e.buttons === 0) {
			endDrag() // Ends dragging when no buttons on MouseEvent
		}

		if (!isMouseEvent) {
			e.preventDefault() // prevents scroll when dragging on touches
		}
	}

	function activateDragMove(e: MouseEvent | TouchEvent) {
		interfacemargin = dominterface.getBoundingClientRect().left

		if (e.type === 'touchstart') {
			const { clientX, clientY } = (e as TouchEvent).touches[0]
			initialpos = [clientX || 0, clientY || 0]
			document.body.addEventListener('touchmove', triggerDragging)
		}

		if (e.type === 'mousedown' && (e as MouseEvent)?.button === 0) {
			const { x, y } = e as MouseEvent
			initialpos = [x, y]
			document.body.addEventListener('mousemove', triggerDragging)
		}
	}

	LIList.forEach((li) => {
		// Mobile need a short press to activate drag, to avoid scroll dragging
		li.addEventListener('touchmove', () => clearTimeout(shortPressTimeout), { passive: false })
		li.addEventListener('touchstart', (e) => (shortPressTimeout = setTimeout(() => activateDragMove(e), 220)), {
			passive: false,
		})

		// Desktop
		li.addEventListener('mousedown', activateDragMove)
	})

	document.body.onmouseleave = endDrag
	document.body.addEventListener(
		'touchend',
		function () {
			endDrag() // (touch only) removeEventListener doesn't work when it is in endDrag
			document.body.removeEventListener('touchmove', triggerDragging) // and has to be here
		},
		{ passive: false }
	)
}

//
// Edit links
//

function editEvents() {
	const getSelectedIds = (): string[] => [...document.querySelectorAll('.block.selected')]?.map((b) => b.id)

	function inputSubmitEvent(e: KeyboardEvent) {
		if (e.code === 'Enter') {
			const input = e.target as HTMLInputElement
			input.blur()
			updatesEditedLink(getSelectedIds()[0])
		}
	}

	document.getElementById('e_delete')?.addEventListener('click', function () {
		removeLinks(getSelectedIds())
		closeEditLink()
	})

	document.getElementById('e_delete-sel')?.addEventListener('click', function () {
		removeLinks(getSelectedIds())
		closeEditLink()
	})

	document.getElementById('e_submit')?.addEventListener('click', async function () {
		updatesEditedLink(getSelectedIds()[0])
	})

	document.getElementById('e_folder-sel')?.addEventListener('click', async function () {
		const selectedIds = getSelectedIds()
		const ids: string[] = []

		for (const id of selectedIds) {
			const dom = document.getElementById(id)
			const isFolder = dom?.classList.contains('folder')

			if (isFolder === false) {
				ids.push(id)
			}
		}

		linksUpdate({ addFolder: ids })

		domlinkblocks?.classList.remove('select-all')
		closeEditLink()
	})

	document.getElementById('e_folder-remove-sel')?.addEventListener('click', async function () {
		moveLinksOutOfFolder(getSelectedIds())
		domlinkblocks?.classList.remove('select-all')
		closeEditLink()
	})

	document.getElementById('e_title')?.addEventListener('keyup', inputSubmitEvent)
	document.getElementById('e_url')?.addEventListener('keyup', inputSubmitEvent)
	document.getElementById('e_iconurl')?.addEventListener('keyup', inputSubmitEvent)
}

async function displayEditWindow(domlink: HTMLLIElement, { x, y }: { x: number; y: number }) {
	const linkId = domlink.id
	const domicon = domlink.querySelector('img')
	const domedit = document.querySelector('#editlink')
	const opendedSettings = document.getElementById('settings')?.classList.contains('shown') ?? false

	const data = await storage.sync.get(linkId)
	const link = data[linkId] as Link

	const domtitle = document.getElementById('e_title') as HTMLInputElement
	domtitle.setAttribute('placeholder', tradThis('Title'))
	domtitle.value = link.title

	if (isFolder(link) === false) {
		const domurl = document.getElementById('e_url') as HTMLInputElement
		domurl.setAttribute('placeholder', tradThis('Link'))
		domurl.value = link.url

		const domiconurl = document.getElementById('e_iconurl') as HTMLInputElement
		domiconurl.setAttribute('placeholder', tradThis('Icon'))
		domiconurl.value = link.icon ?? ''
	}

	domedit?.classList.add('shown')
	domicon?.classList.add('selected')
	domedit?.classList.toggle('folder', isFolder(link))
	domedit?.classList.toggle('pushed', opendedSettings)

	const { innerHeight, innerWidth } = window // viewport size

	if (x + 320 > innerWidth) x -= x + 320 - innerWidth // right overflow pushes to left
	if (y + 270 > innerHeight) y -= 270 // bottom overflow pushes above mouse

	// Moves edit link to mouse position
	const domeditlink = document.getElementById('editlink')
	if (domeditlink) domeditlink.style.transform = `translate(${x + 3}px, ${y + 3}px)`

	if (SYSTEM_OS !== 'ios' && !IS_MOBILE) {
		domtitle.focus() // Focusing on touch opens virtual keyboard without user action, not good
	}
}

async function updatesEditedLink(id?: string) {
	if (!id) {
		return
	}

	const e_iconurl = document.getElementById('e_iconurl') as HTMLInputElement
	const e_title = document.getElementById('e_title') as HTMLInputElement
	const e_url = document.getElementById('e_url') as HTMLInputElement
	const domlink = document.getElementById(id) as HTMLLIElement
	const domtitle = domlink.querySelector('span') as HTMLSpanElement

	if (e_iconurl.value.length === 7500) {
		e_iconurl.value = ''
		e_iconurl.setAttribute('placeholder', tradThis('Icon must be < 8kB'))
		return
	}

	const data = await storage.sync.get(id)
	const link = data[id] as Link
	const isElem = isFolder(link) === false

	link.title = stringMaxSize(e_title.value, 64)
	domtitle.textContent = link.title

	if (isElem) {
		const domicon = domlink.querySelector('img') as HTMLImageElement
		const domurl = domlink.querySelector('a') as HTMLAnchorElement

		link.url = stringMaxSize(e_url.value, 512)
		link.icon = stringMaxSize(e_iconurl.value, 7500)

		domtitle.textContent = linkElemTitle(link.title, link.url, domlinkblocks.className === 'text')
		domicon.src = link.icon ?? getDefaultIcon(link.url)
		domurl.href = link.url
	}

	// Updates
	storage.sync.set({ [id]: link })
}

//
// Updates
//

async function removeLinks(ids: string[]) {
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

		// Animation
		document.getElementById(id)?.classList.add('removed')
		setTimeout(() => document.getElementById(id)?.remove(), 600)
	}

	storage.sync.clear()
	storage.sync.set(data)
}

async function moveLinksOutOfFolder(ids: string[]): Promise<void> {
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

function linkElemTitle(title: string, url: string, textOnly: boolean): string {
	try {
		url = new URL(url)?.origin
	} catch (_) {}
	return textOnly && title === '' ? url : title
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

function setRows(amount: number, style: string) {
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

function handleSafariNewtab(e: Event) {
	const anchor = e.composedPath().filter((el) => (el as Element).tagName === 'A')[0]
	window.open((anchor as HTMLAnchorElement)?.href)
	e.preventDefault()
}

async function linksUpdate({ bookmarks, newtab, style, row, addLink, addFolder, tab, groupTitle }: LinksUpdate) {
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
		storage.sync.set({ linknewtab: newtab })

		document.querySelectorAll('.block a').forEach((a) => {
			//
			if (BROWSER === 'safari') {
				if (newtab) a.addEventListener('click', handleSafariNewtab)
				else a.removeEventListener('click', handleSafariNewtab)
				return
			}

			newtab ? a.setAttribute('target', '_blank') : a.removeAttribute('target')
		})
	}

	if (style) {
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

		setRows(data.linksrow, style)

		storage.sync.set({ linkstyle: style })
	}

	if (row) {
		let domStyle = domlinkblocks.classList[0] || 'large'
		let val = parseInt(row ?? '6')
		setRows(val, domStyle)
		eventDebounce({ linksrow: row })
	}
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

function getAllLinksInTab(data: Sync.Storage, index: number): Link[] {
	index = index ?? data.tabs.selected

	const tab = data.tabs.list[index]
	const links: Link[] = []

	if (tab && tab.ids.length > 0) {
		for (const id of tab.ids) {
			const link = data[id] as Link
			if (link) {
				links.push(link)
			}
		}
	}

	return links
}
