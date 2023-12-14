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
const domeditlink = document.getElementById('editlink')

let currentFolder: string | undefined
let currentTab = 0

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

	if (SYSTEM_OS === 'ios' || !IS_MOBILE) {
		window.addEventListener('resize', () => {
			if (domeditlink?.classList.contains('shown')) closeEditLink()
		})
	}

	document.body.addEventListener('click', function (e) {
		if (domlinkblocks.classList.contains('in-folder')) {
			const path = e.composedPath() ?? [document.body]
			const node = path[0] as Element | undefined
			const clicksOnInterface = node?.id === 'interface' || node?.tagName === 'BODY'

			if (clicksOnInterface) {
				clickClosesFolder()
			}
		}
	})
}

//
// Initialisation
//

async function initblocks(links: Link[], openInNewtab: boolean): Promise<true> {
	const tabUList = document.querySelector<HTMLUListElement>('#link-list')
	const inFolder = !!currentFolder

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

			link.ids.forEach((id, i) => {
				const elemIndex = linkElems.findIndex((link) => link._id === id)

				// Only add 4 images to folder preview
				if (i < 4) {
					const img = document.createElement('img')
					const elem = linkElems[elemIndex]

					if (elem?.type === 'elem') {
						img.draggable = false
						img.src = elem?.icon
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

	// createDragging(liList)
	createEvents(liList)
	createIcons(imgList, links)
	document.dispatchEvent(new CustomEvent('interface', { detail: 'links' }))

	return true
}

async function createIcons(imgs: { [key: string]: HTMLImageElement }, links: Link[]) {
	for (const link of links) {
		const img = imgs[link._id]

		if (img && link.type === 'elem') {
			img.src = link.icon

			if (link.icon.includes('loading.svg')) {
				const iconurl = `${MAIN_API}/favicon/blob/${link.url}`

				await fetch(iconurl)
				img.src = iconurl
				link.icon = iconurl

				storage.sync.set({ [link._id]: link })
			}
		}
	}
}

async function clickOpensFolder(elem: HTMLLIElement) {
	if (elem.classList.contains('folder')) {
		const data = await storage.sync.get()
		const folder = data[elem.id] as Links.Folder

		transitioner(
			function hide() {
				currentFolder = elem.id
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
}

async function clickClosesFolder() {
	const data = await storage.sync.get()
	const { selected, list } = data.tabs

	transitioner(
		function hide() {
			currentFolder = undefined
			domlinkblocks.classList.add('hiding')
		},
		async function changeToTab() {
			toggleTabsTitleType(list[selected].title)
			await initblocks(getAllLinksInTab(data, selected), false)
		},
		function show() {
			domlinkblocks.classList.remove('in-folder')
			domlinkblocks.classList.remove('hiding')
		},
		200
	)
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
	})
}

function toggleTabsTitleType(title: string): void {
	const firstinput = document.querySelector<HTMLInputElement>('#link-title input')

	if (!!currentFolder) {
		document.querySelector<HTMLInputElement>('#link-title')?.click()
	}

	if (firstinput) {
		firstinput.value = title
		firstinput.style.width = title.length + 'ch'
		firstinput.placeholder = !!currentFolder ? tradThis('folder') : tradThis('tab')
	}
}

function appendNewTab(title: string, selected?: boolean): void {
	const linktitle = document.getElementById('link-title')
	const input = document.createElement('input')
	const div = document.createElement('div')

	input.ariaLabel = tradThis('Change link group title')
	input.placeholder = 'tab'
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
	if (!!currentFolder || div.classList.contains('selected')) {
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
				initblocks(getAllLinksInTab(data, 0), data.linknewtab)
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
		removeLink(linkid)
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

		if (x + 320 > innerWidth) x -= x + 320 - innerWidth // right overflow pushes to left
		if (y + 270 > innerHeight) y -= 270 // bottom overflow pushes above mouse

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
	domedit?.classList.toggle('folder', !(link.type !== 'folder' && !currentFolder))
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

//
// Updates
//

async function removeLink(linkID: string) {
	const { tabs, ...data } = await storage.sync.get()
	const tab = tabs.list[tabs.selected]
	const link = data[linkID] as Link

	// For folders in this tab
	// Remove element if found in folder
	if (currentFolder) {
		const folder = data[currentFolder] as Link
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

	// Delete links in folder
	if (link?.type === 'folder') {
		for (const id of link.ids) {
			delete data[id]
		}
	}

	document.getElementById(linkID)?.classList.add('removed')

	delete data[linkID]

	tab.ids = tab.ids.filter((id) => id !== linkID)
	tabs.list[tabs.selected] = tab
	data.tabs = tabs

	storage.sync.clear()
	storage.sync.set(data)

	setTimeout(() => {
		document.getElementById(linkID)?.remove()
	}, 600)
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
			type: 'folder',
			_id: 'links' + randomString(6),
			ids: ids,
			title: title,
		},
	]
}

function importBookmarks(bookmarks?: Bookmarks): Links.Elem[] {
	const newLinks: Links.Elem[] = []

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
	const tab = data.tabs.list[data.tabs.selected]
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
			newlinks = importBookmarks(arg.bookmarks)
			links = getAllLinksInTab(data, data.tabs.selected)
			break
		}
	}

	for (const link of newlinks) {
		data[link._id] = link
		links.push(link)
		tab.ids.push(link._id)

		if (currentFolder) {
			const folder = data[currentFolder] as Link | undefined
			if (folder?.type === 'folder') {
				folder.ids.push(link._id)
				data[currentFolder] = folder
			}
		}
	}

	data.tabs.list[data.tabs.selected] = tab
	storage.sync.set(data)

	domlinkblocks.style.visibility = 'visible'

	if (currentFolder) {
		links = getAllLinksInFolder(data, currentFolder)
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
	if (currentFolder) {
		const data = await storage.sync.get()
		const folder = data[currentFolder] as Links.Folder | undefined

		if (folder) {
			folder.title = title
			data[currentFolder] = folder
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
		const title = `${tradThis('link tab')} ${list.length}`
		tabs.selected = list.length - 1

		tabs.list.push({ title, ids: [] })

		const divs = Object.values(document.querySelectorAll('#link-title div'))
		divs?.forEach((div) => div.classList.remove('selected'))

		appendNewTab(title, true)
		initblocks([], false)
	}

	if (action === 'remove' && tabs.list.length > 1) {
		tabs.selected = tabs.list.length - 2
		tabs.list.pop()
		data.tabs = tabs
		document.querySelector('#link-title div:last-child')?.remove()
		initblocks(getAllLinksInTab(data, tabs.selected), false)
	}

	storage.sync.set({ tabs })
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
		// const data = await storage.sync.get()
		// const links = bundleLinks(data as Sync)
		// style = style ?? 'large'
		// for (const [_id, title, url] of links) {
		// 	const span = document.querySelector<HTMLSpanElement>('#links' + _id + ' span')
		// 	const text = linkElemTitle(title, url, style === 'text')
		// 	if (span) span.textContent = text
		// }
		// domlinkblocks.classList.remove('large', 'medium', 'small', 'text')
		// domlinkblocks.classList.add(style)
		// setRows(data.linksrow, style)
		// storage.sync.set({ linkstyle: style })
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

function removeLinkSelection() {
	domlinkblocks.querySelectorAll('img').forEach((img) => {
		img?.classList.remove('selected')
	})
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
		type: 'elem',
		_id: 'links' + randomString(6),
		title: stringMaxSize(title, 64),
		icon: 'src/assets/interface/loading.svg',
		url: url,
	}
}

function getAllLinksInFolder(data: Sync.Storage, id: string): Links.Elem[] {
	const folder = data[id] as Link | undefined
	const links: Links.Elem[] = []

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
