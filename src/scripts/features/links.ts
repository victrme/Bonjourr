import { canDisplayInterface } from '..'
import storage from '../storage'
import { Sync } from '../types/sync'
import {
	$,
	stringMaxSize,
	getBrowser,
	extractHostname,
	clas,
	testOS,
	bundleLinks,
	closeEditLink,
	has,
	mobilecheck,
	randomString,
	extractDomain,
} from '../utils'

import { tradThis } from '../utils/translations'
import { eventDebounce } from '../utils/debounce'
import errorMessage from '../utils/errorMessage'

export default async function quickLinks(
	init: Sync | null,
	event?: {
		is: 'add' | 'import' | 'style' | 'newtab' | 'row'
		bookmarks?: { title: string; url: string }[]
		checked?: boolean
		value?: string
		elem?: Element
	}
) {
	const domlinkblocks = document.getElementById('linkblocks')!
	const dominterface = document.getElementById('interface')!

	async function initblocks(links: Link[], isnewtab: boolean) {
		//
		function createBlock(link: Link) {
			let title = stringMaxSize(link.title, 64)
			let url = stringMaxSize(link.url, 512)

			//le DOM du block
			const img = document.createElement('img')
			const span = document.createElement('span')
			const anchor = document.createElement('a')
			const li = document.createElement('li')

			img.alt = ''
			img.loading = 'lazy'
			img.setAttribute('draggable', 'false')

			anchor.appendChild(img)
			anchor.appendChild(span)
			anchor.setAttribute('draggable', 'false')

			anchor.href = url
			anchor.setAttribute('rel', 'noreferrer noopener')

			if (isnewtab) {
				getBrowser() === 'safari'
					? anchor.addEventListener('click', handleSafariNewtab)
					: anchor.setAttribute('target', '_blank')
			}

			li.id = link._id
			li.setAttribute('class', 'block')
			li.appendChild(anchor)

			// this also adds "normal" title as usual
			textOnlyControl(li, title, domlinkblocks.className === 'text')

			domlinkblocks.appendChild(li)

			return { icon: img, block: li }
		}

		async function fetchNewIcon(dom: HTMLImageElement, url: string) {
			dom.src = 'src/assets/interface/loading.svg' // Apply loading gif d'abord

			const img = new Image()

			let result = `https://icons.duckduckgo.com/ip3/${extractHostname(url)}.ico`
			const API = new Date().getDay() % 2 === 1 ? '@@FAVICON_API_1' : '@@FAVICON_API_2'

			const response = await fetch(API + url)
			const apiText = await response.text()

			if (apiText.length > 0) {
				result = apiText
			}

			img.onload = () => (dom.src = result)
			img.src = result
			img.remove()

			return result
		}

		if (links.length > 0) {
			if (!init) {
				;[...domlinkblocks.children].forEach((li) => li.remove())
			}

			try {
				// Add blocks and events
				const blocklist = links.map((l) => createBlock(l))
				blocklist.forEach(({ block }) => addEvents(block))

				linksDragging(blocklist.map((list) => list.block)) // Pass LIs to create events faster
				canDisplayInterface('links')

				// Load icons one by one
				links.map(async (link, index) => {
					const dom = blocklist[index].icon

					// Fetch new icons if matches these urls
					if (link.icon.includes('loading.svg')) {
						link.icon = await fetchNewIcon(dom, link.url)
						storage.set({ [link._id]: link })
					}

					// Apply cached
					else dom.src = link.icon
				})
			} catch (e) {
				errorMessage(e)
			}
		}

		// Links is done
		else canDisplayInterface('links')
	}

	function removeLinkSelection() {
		//enleve les selections d'edit
		domlinkblocks.querySelectorAll('img').forEach(function (e) {
			clas(e, false, 'selected')
		})
	}

	function addEvents(elem: HTMLLIElement) {
		// long press on iOS
		if (testOS.ios) {
			let timer = 0

			elem.addEventListener(
				'touchstart',
				function (e) {
					timer = setTimeout(() => {
						e.preventDefault()
						removeLinkSelection()
						displayEditWindow(elem as HTMLLIElement, { x: 0, y: 0 }) // edit centered on mobile
					}, 600)
				},
				false
			)

			elem.addEventListener('touchmove', () => clearTimeout(timer), false)
			elem.addEventListener('touchend', () => clearTimeout(timer), false)
		}

		// Right click ( desktop / android )
		elem.oncontextmenu = function (e) {
			e.preventDefault()
			removeLinkSelection()
			displayEditWindow(this as HTMLLIElement, { x: e.x, y: e.y })
		}

		// E to edit
		elem.onkeyup = function (e) {
			if (e.key === 'e') {
				const { offsetLeft, offsetTop } = e.target as HTMLElement
				displayEditWindow(this as HTMLLIElement, { x: offsetLeft, y: offsetTop })
			}
		}
	}

	function linksDragging(LIList: HTMLLIElement[]) {
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

			const draggedDOM = $(draggedId)
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

			clas(domlinkblocks, true, 'dragging') // to apply pointer-events: none
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
						const neighboor = $(keyBis)

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
					const data = await storage.get()

					Object.entries(updatedOrder).forEach(([key, val]) => {
						const link = data[key] as Link
						link.order = val // Updates orders
					})

					clas(domlinkblocks, false, 'dragging') // to apply pointer-events: none

					eventDebounce({ ...data }) // saves
					;[...domlinkblocks.children].forEach((li) => li.remove()) // remove lis
					initblocks(bundleLinks(data as Sync), data.linknewtab) // re-init blocks
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
			li.addEventListener('touchmove', () => clearTimeout(shortPressTimeout), { passive: true })
			li.addEventListener('touchstart', (e) => (shortPressTimeout = setTimeout(() => activateDragMove(e), 220)))

			// Desktop
			li.addEventListener('mousedown', activateDragMove)
		})

		document.body.onmouseleave = endDrag
		document.body.ontouchend = () => {
			endDrag() // (touch only) removeEventListener doesn't work when it is in endDrag
			document.body.removeEventListener('touchmove', triggerDragging) // and has to be here
		}
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
			editlink?.classList.toggle('shown', false)
		})

		document.getElementById('e_submit')?.addEventListener('click', async function () {
			const noErrorOnEdit = await submitEvent() // returns false if saved icon data too big
			if (noErrorOnEdit) {
				closeEditLink() // only auto close on apply changes button
				removeLinkSelection()
			}
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
			const domeditlink = $('editlink')
			if (domeditlink) domeditlink.style.transform = `translate(${x + 3}px, ${y + 3}px)`
		}

		const linkId = domlink.id
		const domicon = domlink.querySelector('img')
		const domedit = document.querySelector('#editlink')
		const opendedSettings = has($('settings'), 'shown')

		const data = await storage.get(linkId)
		const { title, url, icon } = data[linkId] as Link

		const domtitle = document.getElementById('e_title') as HTMLInputElement
		const domurl = document.getElementById('e_url') as HTMLInputElement
		const domiconurl = document.getElementById('e_iconurl') as HTMLInputElement

		domtitle.setAttribute('placeholder', tradThis('Title'))
		domurl.setAttribute('placeholder', tradThis('Link'))
		domiconurl.setAttribute('placeholder', tradThis('Icon'))

		domtitle.value = title
		domurl.value = url
		domiconurl.value = icon

		positionsEditWindow()

		clas(domicon, true, 'selected')
		clas(domedit, true, 'shown')
		clas(domedit, opendedSettings, 'pushed')

		domedit?.setAttribute('data-linkid', linkId)

		if (!testOS.ios && !mobilecheck()) {
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

		const data = await storage.get(linkId)
		const domlink = document.getElementById(linkId) as HTMLLIElement
		const domicon = domlink.querySelector('img') as HTMLImageElement
		const domurl = domlink.querySelector('a') as HTMLAnchorElement
		let link = data[linkId] as Link

		link = {
			...link,
			title: stringMaxSize(e_title.value, 64),
			url: stringMaxSize(e_url.value, 512),
			icon: stringMaxSize(e_iconurl.value, 7500),
		}

		textOnlyControl(domlink, link.title, domlinkblocks.className === 'text')
		domurl.href = link.url
		domicon.src = link.icon

		// Updates
		storage.set({ [linkId]: link })

		return true
	}

	async function removeblock(linkId: string) {
		const data = await storage.get(linkId)
		const links = bundleLinks(data)
		const target = data[linkId] as Link

		document.getElementById(linkId)?.classList.toggle('removed', true)

		delete data[linkId]

		// Updates Order
		links
			.filter((l) => l._id !== linkId) // pop deleted first
			.forEach((l: Link) => {
				data[l._id] = {
					...l,
					order: l.order - (l.order > target.order ? 1 : 0),
				}
			})

		storage.clear()
		storage.set(data)

		setTimeout(() => {
			document.getElementById(linkId)?.remove()
		}, 600)
	}

	async function linkSubmission(type: 'add' | 'import', importList?: { title: string; url: string }[]) {
		const data = await storage.get()
		const links = bundleLinks(data)
		let newLinksList = []

		const validator = (title: string, url: string, order: number) => {
			const startsWithEither = (strs: string[]) => strs.some((str) => url.startsWith(str))

			url = stringMaxSize(url, 512)

			const isConfig = startsWithEither(['about:', 'chrome://', 'edge://'])
			const noProtocol = !startsWithEither(['https://', 'http://'])
			const isLocalhost = url.startsWith('localhost')

			let prefix = isConfig ? '#' : isLocalhost ? 'http://' : noProtocol ? 'https://' : ''

			url = prefix + url

			return {
				order: order,
				_id: 'links' + randomString(6),
				title: stringMaxSize(title, 64),
				icon: 'src/assets/interface/loading.svg',
				url: url,
			}
		}

		// Default link submission
		if (type === 'add') {
			const titledom = $('i_title') as HTMLInputElement
			const urldom = $('i_url') as HTMLInputElement
			const title = titledom.value
			const url = urldom.value

			if (url.length < 3) return

			titledom.value = ''
			urldom.value = ''

			newLinksList.push(validator(title, url, links.length))
		}

		// When importing bookmarks
		if (type === 'import' && importList) {
			if (importList?.length === 0) return

			importList.forEach(({ title, url }, i: number) => {
				if (url !== 'false') {
					newLinksList.push(validator(title, url, links.length + i))
				}
			})
		}

		// Saves to storage added links before icon fetch saves again
		newLinksList.forEach((newlink) => {
			storage.set({ [newlink._id]: newlink })
		})

		// Add new link(s) to existing ones
		links.push(...newLinksList)

		// Displays and saves before fetching icon
		initblocks(links, data.linknewtab)
		domlinkblocks.style.visibility = 'visible'
	}

	function textOnlyControl(block: HTMLLIElement, title: string, toText: boolean) {
		const span = block.querySelector('span')
		const a = block.querySelector('a')

		if (span && a) {
			span.textContent = toText && title === '' ? extractDomain(a.href) : title
		}
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

	if (event) {
		switch (event.is) {
			case 'add':
				linkSubmission('add')
				break

			case 'import':
				linkSubmission('import', event.bookmarks)
				break

			case 'newtab': {
				const val = event.checked || false
				storage.set({ linknewtab: val })

				document.querySelectorAll('.block a').forEach((a) => {
					//
					if (getBrowser() === 'safari') {
						if (val) a.addEventListener('click', handleSafariNewtab)
						else a.removeEventListener('click', handleSafariNewtab)
						return
					}

					if (val) a.setAttribute('target', '_blank')
					else a.removeAttribute('target')
				})
				break
			}

			case 'style': {
				const data = await storage.get()
				const links = bundleLinks(data as Sync)
				const classes = ['large', 'medium', 'small', 'text']
				const blocks = document.querySelectorAll('#linkblocks .block') as NodeListOf<HTMLLIElement>
				const chosenClass = event.value?.toString() || ''

				links.forEach(({ title }, i: number) => textOnlyControl(blocks[i], title, chosenClass === 'text'))

				classes.forEach((c) => domlinkblocks.classList.remove(c))
				domlinkblocks.classList.add(chosenClass)

				setRows(data.linksrow, chosenClass)

				storage.set({ linkstyle: chosenClass })

				break
			}

			case 'row': {
				let domStyle = domlinkblocks.className || 'large'
				const row = parseInt(event.value || '6')

				setRows(row, domStyle)
				eventDebounce({ linksrow: row })
				break
			}
		}

		return
	}

	if (!init) {
		errorMessage('No data for quick links !')
		return
	}

	domlinkblocks.className = init.linkstyle // set class before appendBlock, cannot be moved
	document.getElementById('linkblocks')?.classList.toggle('hidden', !init.quicklinks)
	initblocks(bundleLinks(init), init.linknewtab)
	setRows(init.linksrow, init.linkstyle)

	setTimeout(() => editEvents(), 150) // No need to activate edit events asap

	if (testOS.ios || !mobilecheck()) {
		const domeditlink = $('editlink')
		window.addEventListener('resize', () => {
			if (domeditlink?.classList.contains('shown')) closeEditLink()
		})
	}
}
