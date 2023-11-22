import { bundleLinks, randomString, stringMaxSize, closeEditLink, apiFetch } from '../utils'
import { SYSTEM_OS, BROWSER, IS_MOBILE } from '../defaults'
import { canDisplayInterface } from '../index'
import { eventDebounce } from '../utils/debounce'
import onSettingsLoad from '../utils/onsettingsload'
import { tradThis } from '../utils/translations'
import errorMessage from '../utils/errormessage'
import storage from '../storage'

import { Sync, Link, LinkElem, LinkFolder, Tab } from '../types/sync'

type LinksUpdate = {
	bookmarks?: { title: string; url: string }[]
	newtab?: boolean
	style?: string
	row?: string
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

//
//
//

const domlinkblocks = document.getElementById('linkblocks') as HTMLUListElement
const dominterface = document.getElementById('interface') as HTMLDivElement
const domeditlink = document.getElementById('editlink')

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
	domlinkblocks.className = init.linkstyle
	domlinkblocks.classList.toggle('hidden', !init.quicklinks)

	initblocks(bundleLinks(init), init.tabs[0].title, init.linknewtab)

	// setRows(init.linksrow, init.linkstyle)
	onSettingsLoad(editEvents)

	if (SYSTEM_OS === 'ios' || !IS_MOBILE) {
		window.addEventListener('resize', () => {
			if (domeditlink?.classList.contains('shown')) closeEditLink()
		})
	}

	document.getElementById('link-group-title')?.addEventListener('change', function () {
		linksUpdate({ groupTitle: (this as HTMLInputElement).value })
		this.blur()
	})
}

async function initblocks(links: Link[], groupTitle: string, openInNewtab: boolean) {
	const tabtitle = document.querySelector<HTMLInputElement>('#link-group-title')
	const tabUList = document.querySelector<HTMLUListElement>('.link-group ul')
	const inFolder = !!domlinkblocks.dataset.folder

	if (tabtitle) {
		tabtitle.value = groupTitle
	}

	if (links.length === 0) {
		return canDisplayInterface('links')
	}

	//
	// Vals
	//

	if (tabUList && tabUList?.children) {
		Object.values(tabUList?.children).forEach((child) => {
			child.remove()
		})
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

	const linkElems: LinkElem[] = []
	const linkFolders: LinkFolder[] = []

	for (const link of links) {
		switch (link?.type) {
			case 'elem':
				linkElems.push(link)
				break

			case 'folder':
				linkFolders.push(link)
				break
		}
	}

	//
	// Create links folders DOM
	//

	if (!inFolder && linkFolders.length > 0) {
		for (const link of linkFolders) {
			const doc = parser.parseFromString(folderhtml, 'text/html')
			const li = doc.querySelector('li')!
			const span = doc.querySelector('span')!
			const folder = doc.querySelector('div')!
			const title = stringMaxSize(link.title, 64)

			span.textContent = title

			for (const id of link.ids) {
				const img = document.createElement('img')
				const elemIndex = linkElems.findIndex((link) => link._id === id)
				const elem = linkElems[elemIndex]

				if (elem.type === 'elem') {
					img.draggable = false
					img.src = elem?.icon
					img.alt = ''
					folder.appendChild(img)
				}

				linkElems.splice(elemIndex, 1)
			}

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

			imgList[link._id] = img
			span.textContent = linkElemTitle(stringMaxSize(link.title, 64), link.url, domlinkblocks.className === 'text')

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

	// createDragging(liList)
	createEvents(liList)
	createIcons(imgList, links)
	canDisplayInterface('links')
}

async function createIcons(imgs: { [key: string]: HTMLImageElement }, links: Link[]) {
	for (const link of links) {
		const img = imgs[link._id]

		if (img && link.type === 'elem') {
			if (link.icon.includes('loading.svg')) {
				link.icon = await loadIcon(img, link.url)
				storage.sync.set({ [link._id]: link })
			} else {
				img.src = link.icon
			}
		}
	}

	async function loadIcon(img: HTMLImageElement, url: string): Promise<string> {
		img.src = 'src/assets/interface/loading.svg'

		const image = new Image()
		const hostname = new URL(url)?.hostname ?? ''
		const response = await apiFetch('/favicon/' + url)
		const result = (await response?.text()) ?? `https://icons.duckduckgo.com/ip3/${hostname}.ico`

		image.addEventListener('load', function () {
			img.src = result
		})

		image.src = result
		image.remove()

		return result
	}
}

function createEvents(elems: HTMLLIElement[]) {
	let timer = 0

	for (const elem of elems) {
		elem.addEventListener('keyup', (ev) => keyUp(elem, ev))
		elem.addEventListener('contextmenu', (ev) => contextMenu(elem, ev))
		elem.addEventListener('click', () => clickOpensFolder(elem))

		if (SYSTEM_OS === 'ios') {
			elem.addEventListener('touchstart', (ev) => longPressDebounce(elem, ev), { passive: false })
			elem.addEventListener('touchmove', () => clearTimeout(timer), { passive: false })
			elem.addEventListener('touchend', () => clearTimeout(timer), { passive: false })
		}
	}

	function clickOpensFolder(elem: HTMLLIElement) {
		if (elem.classList.contains('folder')) {
			domlinkblocks.dataset.folder = elem.id
			domlinkblocks.classList.add('opening-folder')
			domlinkblocks.classList.remove('in-folder')

			setTimeout(async () => {
				const data = await storage.sync.get()
				const folder = data[elem.id] as LinkFolder
				initblocks(getAllLinksInFolder(data, elem.id), folder.title, false)
				domlinkblocks.classList.replace('opening-folder', 'in-folder')
			}, 200)
		}
	}

	function clickClosesFolder() {
		domlinkblocks.classList.replace('in-folder', 'opening-folder')
		delete domlinkblocks.dataset.folder

		setTimeout(async () => {
			const data = await storage.sync.get()
			const tab = data.tabs[0]
			initblocks(getAllLinksInTab(data, 0), tab.title, false)
			domlinkblocks.classList.remove('opening-folder')
		}, 200)
	}

	document.body.addEventListener('click', function (e) {
		if (domlinkblocks.classList.contains('in-folder')) {
			const path = e.composedPath() ?? [document.body]
			const pathIds = path.map((el) => (el as HTMLElement).id)

			if (!pathIds.includes('linkblocks') && !pathIds.includes('editlink')) {
				clickClosesFolder()
			}
		}
	})

	function longPressDebounce(elem: HTMLLIElement, ev: TouchEvent) {
		timer = setTimeout(() => {
			ev.preventDefault()
			removeLinkSelection()
			displayEditWindow(elem, { x: 0, y: 0 }) // edit centered on mobile
		}, 600)
	}

	function contextMenu(elem: HTMLLIElement, ev: MouseEvent) {
		ev.preventDefault()
		removeLinkSelection()
		displayEditWindow(elem, { x: ev.x, y: ev.y })
	}

	function keyUp(elem: HTMLLIElement, ev: KeyboardEvent) {
		if (ev.key === 'e') {
			const { offsetLeft, offsetTop } = ev.target as HTMLElement
			displayEditWindow(elem, { x: offsetLeft, y: offsetTop })
		}
	}
}

function createDragging(LIList: HTMLLIElement[]) {
	type Coords = {
		order: number
		pos: { x: number; y: number }
		triggerbox: { x: [number, number]; y: [number, number] }
	}

	let draggedId: string = ''
	let draggedClone: HTMLLIElement
	let updatedOrder: { [key: string]: number } = {}
	let coords: { [key: string]: Coords } = {}
	let coordsEntries: [string, Coords][] = []
	let startsDrag = false
	let [cox, coy] = [0, 0] // (cursor offset x & y)
	let interfacemargin = 0

	const deplaceElem = (dom: HTMLElement, x: number, y: number) => {
		dom.style.transform = `translateX(${x}px) translateY(${y}px)`
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

		document.querySelectorAll('#linkblocks li').forEach((block, i) => {
			const { x, y, width, height } = block.getBoundingClientRect()
			const blockid = block.id

			updatedOrder[blockid] = i

			coords[blockid] = {
				order: i,
				pos: { x, y },
				triggerbox: {
					// Creates a box with 10% padding used to trigger
					// the rearrange if mouse position is in-between these values
					x: [x + width * 0.1, x + width * 0.9],
					y: [y + height * 0.1, y + height * 0.9],
				},
			}
		})

		// Transform coords in array here to improve performance during mouse move
		coordsEntries = Object.entries(coords)

		const draggedDOM = document.getElementById(draggedId)
		const draggedCoord = coords[draggedId]

		if (draggedDOM) {
			draggedDOM.style.opacity = '0'
			draggedClone = draggedDOM.cloneNode(true) as HTMLLIElement // create fixed positionned clone of element
			draggedClone.id = ''
			draggedClone.className = 'block dragging-clone on'

			domlinkblocks.appendChild(draggedClone) // append to linkblocks to get same styling
		}

		if (draggedCoord) {
			cox = ex - draggedCoord.pos.x // offset to cursor position
			coy = ey - draggedCoord.pos.y // on dragged element
		}

		deplaceElem(draggedClone, ex - cox - interfacemargin, ey - coy)

		domlinkblocks?.classList.add('dragging') // to apply pointer-events: none
	}

	function applyDrag(ex: number, ey: number) {
		// Dragged element clone follows cursor
		deplaceElem(draggedClone, ex - cox - interfacemargin, ey - coy)

		// Element switcher
		coordsEntries.forEach(function parseThroughCoords([key, val]) {
			if (
				// Mouse position is inside a block trigger box
				// And it is not the dragged block box
				// Nor the switched block (to trigger switch once)
				ex > val.triggerbox.x[0] &&
				ex < val.triggerbox.x[1] &&
				ey > val.triggerbox.y[0] &&
				ey < val.triggerbox.y[1]
			) {
				const drgO = coords[draggedId]?.order || 0 // (dragged order)
				const keyO = coords[key]?.order || 0 // (key order)
				let interval = [drgO, keyO] // interval of links to move
				let direction = 0

				if (drgO < keyO) direction = -1 // which direction to move links
				if (drgO > keyO) direction = 1

				if (direction > 0) interval[0] -= 1 // remove dragged index from interval
				if (direction < 0) interval[0] += 1

				interval = interval.sort((a, b) => a - b) // sort to always have [small, big]

				coordsEntries.forEach(([keyBis, coord], index) => {
					const neighboor = document.getElementById(keyBis)

					if (!neighboor) {
						return
					}

					// Element index between interval
					if (index >= interval[0] && index <= interval[1]) {
						const ox = coordsEntries[index + direction][1].pos.x - coord.pos.x
						const oy = coordsEntries[index + direction][1].pos.y - coord.pos.y

						updatedOrder[keyBis] = index + direction // update order w/ direction
						deplaceElem(neighboor, ox, oy) // translate it to its neighboors position
						return
					}

					updatedOrder[keyBis] = index // keep same order
					deplaceElem(neighboor, 0, 0) // Not in interval (anymore) ? reset translate
				})

				updatedOrder[draggedId] = keyO // update dragged element order with triggerbox order
			}
		})
	}

	function endDrag() {
		if (draggedId && startsDrag) {
			const neworder = updatedOrder[draggedId]
			const { x, y } = coordsEntries[neworder][1].pos // last triggerbox position
			startsDrag = false
			draggedId = ''
			coords = {}
			coordsEntries = []

			deplaceElem(draggedClone, x - interfacemargin, y)
			draggedClone.className = 'block dragging-clone' // enables transition (by removing 'on' class)
			dominterface.style.cursor = ''

			document.body.removeEventListener('mousemove', triggerDragging)

			setTimeout(async () => {
				const data = await storage.sync.get()

				Object.entries(updatedOrder).forEach(([key, val]) => {
					const link = data[key] as Link
					link.order = val // Updates orders
				})

				domlinkblocks?.classList.remove('dragging') // to apply pointer-events: none

				eventDebounce({ ...data })
				Object.values(domlinkblocks.children).forEach((li) => li.remove())
				initblocks(getAllLinksInTab(data), data.tabs[0].title, data.linknewtab)
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

function editEvents() {
	async function submitEvent() {
		const linkid = document.getElementById('editlink')?.dataset.linkid || ''
		return await updatesEditedLink(linkid)
	}

	function inputSubmitEvent(e: KeyboardEvent) {
		if (e.code === 'Enter') {
			const input = e.target as HTMLInputElement
			input.blur()
			submitEvent()
		}
	}

	document.getElementById('e_delete')?.addEventListener('click', function () {
		const editlink = document.getElementById('editlink')
		const linkid = editlink?.dataset.linkid || ''

		removeLinkSelection()
		removeblock(linkid)
		editlink?.classList.remove('shown')
	})

	document.getElementById('e_submit')?.addEventListener('click', async function () {
		const noErrorOnEdit = await submitEvent() // returns false if saved icon data too big
		if (noErrorOnEdit) {
			closeEditLink() // only auto close on apply changes button
			removeLinkSelection()
		}
	})

	document.getElementById('e_folder')?.addEventListener('click', async function () {
		const editlink = document.getElementById('editlink')
		const ids = [editlink?.dataset.linkid || '']

		// dev
		// to replace drag and drop
		const linksibling = document.getElementById(ids[0])?.nextElementSibling
		const isNotFolder = !linksibling?.classList.contains('folder')
		const hasId = linksibling?.id

		if (hasId && isNotFolder) {
			ids.push(linksibling.id)
		}

		linksUpdate({ addFolder: ids })

		closeEditLink()
		removeLinkSelection()
	})

	document.getElementById('e_title')?.addEventListener('keyup', inputSubmitEvent)
	document.getElementById('e_url')?.addEventListener('keyup', inputSubmitEvent)
	document.getElementById('e_iconurl')?.addEventListener('keyup', inputSubmitEvent)
}

async function displayEditWindow(domlink: HTMLLIElement, { x, y }: { x: number; y: number }) {
	//
	function positionsEditWindow() {
		const { innerHeight, innerWidth } = window // viewport size

		removeLinkSelection()

		if (x + 250 > innerWidth) x -= x + 250 - innerWidth // right overflow pushes to left
		if (y + 200 > innerHeight) y -= 200 // bottom overflow pushes above mouse

		// Moves edit link to mouse position
		const domeditlink = document.getElementById('editlink')
		if (domeditlink) domeditlink.style.transform = `translate(${x + 3}px, ${y + 3}px)`
	}

	const linkId = domlink.id
	const domicon = domlink.querySelector('img')
	const domedit = document.querySelector('#editlink')
	const opendedSettings = document.getElementById('settings')?.classList.contains('shown') ?? false

	const data = await storage.sync.get(linkId)
	const link = data[linkId] as Link

	const domtitle = document.getElementById('e_title') as HTMLInputElement
	domtitle.setAttribute('placeholder', tradThis('Title'))
	domtitle.value = link.title

	if (link.type === 'elem') {
		const domurl = document.getElementById('e_url') as HTMLInputElement
		domurl.setAttribute('placeholder', tradThis('Link'))
		domurl.value = link.url

		const domiconurl = document.getElementById('e_iconurl') as HTMLInputElement
		domiconurl.setAttribute('placeholder', tradThis('Icon'))
		domiconurl.value = link.icon
	}

	positionsEditWindow()

	domedit?.classList.add('shown')
	domicon?.classList.add('selected')
	domedit?.classList.toggle('folder', link.type === 'folder')
	domedit?.classList.toggle('pushed', opendedSettings)
	domedit?.setAttribute('data-linkid', linkId)

	if (SYSTEM_OS !== 'ios' && !IS_MOBILE) {
		domtitle.focus() // Focusing on touch opens virtual keyboard without user action, not good
	}
}

async function updatesEditedLink(linkId: string) {
	const e_iconurl = document.getElementById('e_iconurl') as HTMLInputElement
	const e_title = document.getElementById('e_title') as HTMLInputElement
	const e_url = document.getElementById('e_url') as HTMLInputElement

	if (e_iconurl.value.length === 7500) {
		e_iconurl.value = ''
		e_iconurl.setAttribute('placeholder', tradThis('Icon must be < 8kB'))

		return false
	}

	const data = await storage.sync.get(linkId)
	let link = data[linkId] as Link

	const domlink = document.getElementById(linkId) as HTMLLIElement
	const domtitle = domlink.querySelector('span') as HTMLSpanElement
	const domicon = domlink.querySelector('img') as HTMLImageElement
	const domurl = domlink.querySelector('a') as HTMLAnchorElement

	if (link.type === 'elem') {
		link = {
			...link,
			type: 'elem',
			title: stringMaxSize(e_title.value, 64),
			url: stringMaxSize(e_url.value, 512),
			icon: stringMaxSize(e_iconurl.value, 7500),
		}

		domtitle.textContent = linkElemTitle(link.title, link.url, domlinkblocks.className === 'text')
		domurl.href = link.url
		domicon.src = link.icon
	}

	if (link.type === 'folder') {
		link = {
			...link,
			type: 'folder',
			title: stringMaxSize(e_title.value, 64),
		}

		domtitle.textContent = link.title
	}

	// Updates
	storage.sync.set({ [linkId]: link })

	return true
}

function removeLinkSelection() {
	domlinkblocks.querySelectorAll('img').forEach((img) => {
		img?.classList.remove('selected')
	})
}

async function removeblock(linkID: string) {
	const data = await storage.sync.get()
	const tab = data.tabs[0]
	const folderID = domlinkblocks.dataset.folder

	// For folders in this tab
	// Remove element if found in folder
	if (folderID) {
		let folder = data[folderID] as Link
		if (folder && folder?.type === 'folder') {
			if (folder.ids.includes(linkID)) {
				folder.ids = folder.ids.filter((id) => id !== linkID)
				data[folder._id] = folder
			}

			// Only one left
			// Delete folder
			if (folder.ids.length === 1) {
				delete data[folder._id]
				tab.ids = tab.ids.filter((id) => id !== folder._id)
			}
		}
	}

	document.getElementById(linkID)?.classList.add('removed')

	delete data[linkID]

	tab.ids = tab.ids.filter((id) => id !== linkID)
	data.tabs[0] = tab

	storage.sync.clear()
	storage.sync.set(data)

	setTimeout(() => {
		document.getElementById(linkID)?.remove()
	}, 600)
}

function addLink(): LinkElem[] {
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

function addLinkFolder(ids: string[]): LinkFolder[] {
	const titledom = document.getElementById('i_title') as HTMLInputElement
	const title = titledom.value

	titledom.value = ''

	return [
		{
			type: 'folder',
			_id: 'links' + randomString(6),
			ids: ids,
			title: title,
		},
	]
}

function importBookmarks(bookmarks?: Bookmarks): LinkElem[] {
	const newLinks: LinkElem[] = []

	if (bookmarks && bookmarks?.length === 0) {
		bookmarks?.forEach(({ title, url }) => {
			if (url !== 'false') {
				newLinks.push(validateLink(title, url))
			}
		})
	}

	return newLinks
}

async function linkSubmission(arg: LinkSubmission) {
	const data = await storage.sync.get()
	const tab = data.tabs[0]
	const links = bundleLinks(data)
	let newlinks: Link[] = []

	switch (arg.type) {
		case 'link':
			newlinks = addLink()
			break

		case 'folder':
			newlinks = addLinkFolder(arg.ids)
			break

		case 'import':
			newlinks = importBookmarks(arg.bookmarks)
			break
	}

	for (const link of newlinks) {
		data[link._id] = link
		links.push(link)
		tab.ids.push(link._id)
	}

	data.tabs[0] = tab
	storage.sync.set(data)

	domlinkblocks.style.visibility = 'visible'

	initblocks(links, data.tabs[0].title, data.linknewtab)
}

function linkElemTitle(title: string, url: string, textOnly: boolean): string {
	try {
		url = new URL(url)?.origin
	} catch (_) {}
	return textOnly && title === '' ? url : title
}

async function setGroupTitle(title: string) {
	const folderID = domlinkblocks.dataset.folder

	if (folderID) {
		const data = await storage.sync.get()
		const folder = data[folderID] as LinkFolder | undefined

		if (folder) {
			folder.title = title
			data[folderID] = folder
			storage.sync.set(data)
			console.log(data[folderID])
		}

		return
	}
	const data = await storage.sync.get('tabs')
	data.tabs[0].title = title
	storage.sync.set({ tabs: data.tabs })
}

function setRows(amount: number, style: string) {
	const sizes = {
		large: { width: 4.8, gap: 2.3 },
		medium: { width: 3.5, gap: 2 },
		small: { width: 2.5, gap: 2 },
		text: { width: 5, gap: 2 }, // arbitrary width because width is auto
	}

	const { width, gap } = sizes[style as keyof typeof sizes]
	domlinkblocks.style.maxWidth = (width + gap) * amount + 'em'
}

function handleSafariNewtab(e: Event) {
	const anchor = e.composedPath().filter((el) => (el as Element).tagName === 'A')[0]
	window.open((anchor as HTMLAnchorElement)?.href)
	e.preventDefault()
}

async function linksUpdate({ bookmarks, newtab, style, row, addLink, addFolder, groupTitle }: LinksUpdate) {
	if (addLink) {
		linkSubmission({ type: 'link' })
	}

	if (addFolder) {
		linkSubmission({ type: 'folder', ids: addFolder })
	}

	if (bookmarks) {
		linkSubmission({ type: 'import', bookmarks: bookmarks })
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
		const links = bundleLinks(data as Sync)

		style = style ?? 'large'

		for (const [_id, title, url] of links) {
			const span = document.querySelector<HTMLSpanElement>('#links' + _id + ' span')
			const text = linkElemTitle(title, url, style === 'text')

			if (span) span.textContent = text
		}

		domlinkblocks.classList.remove('large', 'medium', 'small', 'text')
		domlinkblocks.classList.add(style)
		setRows(data.linksrow, style)
		storage.sync.set({ linkstyle: style })
	}

	if (row) {
		let domStyle = domlinkblocks.className || 'large'
		let val = parseInt(row ?? '6')
		setRows(val, domStyle)
		eventDebounce({ linksrow: row })
	}
}

function validateLink(title: string, url: string): LinkElem {
	const startsWithEither = (strs: string[]) => strs.some((str) => url.startsWith(str))

	url = stringMaxSize(url, 512)

	const isConfig = startsWithEither(['about:', 'chrome://', 'edge://'])
	const noProtocol = !startsWithEither(['https://', 'http://'])
	const isLocalhost = url.startsWith('localhost') || url.startsWith('127.0.0.1')

	let prefix = isConfig ? '#' : isLocalhost ? 'http://' : noProtocol ? 'https://' : ''

	url = prefix + url

	return {
		type: 'elem',
		_id: 'links' + randomString(6),
		title: stringMaxSize(title, 64),
		icon: 'src/assets/interface/loading.svg',
		url: url,
	}
}

function getAllLinksInFolder(data: Sync, id: string): LinkElem[] {
	const folder = data[id] as Link | undefined
	const links: LinkElem[] = []

	if (folder && folder.type === 'folder') {
		for (const id of folder.ids) {
			const link = data[id] as Link
			if (link?.type === 'elem') {
				links.push(link)
			}
		}
	}

	return links
}

function getAllLinksInTab(data: Sync, index = 0): Link[] {
	const tab = data.tabs[index]
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
