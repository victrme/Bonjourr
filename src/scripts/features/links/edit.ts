import { getSelectedIds, getLink, getDefaultIcon, createTitle } from './helpers'
import { IS_MOBILE, SYSTEM_OS } from '../../defaults'
import { deleteTab, addTab, changeTabTitle, togglePinTab } from './tabs'
import { stringMaxSize } from '../../utils'
import { linksUpdate } from '.'
import { tradThis } from '../../utils/translations'
import transitioner from '../../utils/transitioner'
import storage from '../../storage'

const domlinkblocks = document.getElementById('linkblocks') as HTMLDivElement
const domeditlink = document.getElementById('editlink') as HTMLDialogElement
const domtitle = document.getElementById('e_title') as HTMLInputElement
const domurl = document.getElementById('e_url') as HTMLInputElement
const domicon = document.getElementById('e_iconurl') as HTMLInputElement

//
// Display
//

export default async function openEditDialog(event: Event) {
	const path = event.composedPath() as HTMLElement[]
	const classNames = path.map((element) => element.className ?? '')
	const selected = document.querySelectorAll('#linkblocks li.selected')
	const deleteButton = document.querySelector<HTMLButtonElement>('#eb_delete')

	if (event.type === 'keyup' && (event as KeyboardEvent).code !== 'KeyE') {
		return
	}

	const container = {
		mini: path.some((element) => element?.id?.includes('link-mini')),
		group: classNames.some((cl) => cl.includes('link-group')),
		folder: classNames.some((cl) => cl.includes('link-group') && cl.includes('in-folder')),
	}

	const target = {
		link: classNames.some((cl) => cl.includes('block') && !cl.includes('folder')),
		folder: classNames.some((cl) => cl.includes('block') && cl.includes('folder')),
		title: classNames.some((cl) => cl.includes('link-title')),
		topsites: classNames.some((cl) => cl.includes('topsites-title')),
		addgroup: classNames.some((cl) => cl.includes('add-group')),
	}

	const state = {
		selectall: classNames.some((cl) => cl.includes('select-all')),
		dragging: classNames.some((cl) => cl.includes('dragging') || cl.includes('dropping')),
	}

	const folderTitle = container.folder && target.title
	const noSelection = state.selectall && !selected[0]

	if (folderTitle || noSelection || state.dragging) {
		return
	}

	// targets
	domeditlink?.classList.toggle('on-link', target.link)
	domeditlink?.classList.toggle('on-title', target.title)
	domeditlink?.classList.toggle('on-folder', target.folder)
	domeditlink?.classList.toggle('on-addgroup', target.addgroup)
	domeditlink?.classList.toggle('on-topsites', target.topsites)

	// containers
	domeditlink?.classList.toggle('in-mini', container.mini)
	domeditlink?.classList.toggle('in-group', container.group)
	domeditlink?.classList.toggle('in-folder', container.folder)

	// states
	domeditlink?.classList.toggle('is-selectall', state.selectall)

	document.dispatchEvent(new Event('stop-select-all'))
	event.preventDefault()

	domurl.value = ''
	domicon.value = ''
	domtitle.value = ''

	const data = await storage.sync.get()

	if (target.title) {
		const element = container.group
			? (path.find((el) => el.className.includes('link-group')) as HTMLElement)
			: (path[0] as HTMLElement)

		const { titles, pinned } = data.linktabs
		const index = parseInt(element?.dataset.index ?? '-1')
		const title = titles[index] ?? ''
		const onlyOneTitleLeft = titles.length - pinned.length < 2

		domeditlink.dataset.tab = index.toString()
		domtitle.value = title

		if (onlyOneTitleLeft) {
			document.querySelector('#eb_pin-group')?.setAttribute('disabled', '')
		} else {
			document.querySelector('#eb_pin-group')?.removeAttribute('disabled')
		}
	}

	if (target.link) {
		const pathLis = path.filter((el) => el.tagName === 'LI')
		const li = pathLis[0]
		const id = li?.id
		const link = getLink(data, id)

		domtitle.value = link?.title ?? ''

		if (!link?.folder) {
			domurl.value = link?.url ?? ''
			domicon.value = link?.icon ?? ''
		}

		if (!state.selectall) {
			document.querySelector('.block.selected')?.classList.remove('selected')
			li?.classList.add('selected')
		}
	}

	if (deleteButton) {
		if (state.selectall) deleteButton.textContent = tradThis('Delete selected')
		else if (target.folder) deleteButton.textContent = tradThis('Delete folder')
		else if (target.link) deleteButton.textContent = tradThis('Delete link')
		else if (target.title) deleteButton.textContent = tradThis('Delete group')
	}

	const contextmenuTransition = transitioner()
	contextmenuTransition.first(() => domeditlink?.show())
	contextmenuTransition.then(async () => domeditlink?.classList?.add('shown'))
	contextmenuTransition.transition(10)

	const { x, y } = newEditDialogPosition(event)
	domeditlink.style.transform = `translate(${Math.floor(x)}px, ${Math.floor(y)}px)`
	domtitle?.focus()
}

function newEditDialogPosition(event: Event): { x: number; y: number } {
	const editRects = domeditlink.getBoundingClientRect()
	const withPointer = event.type === 'contextmenu' || event.type === 'click'
	const withKeyboard = event.type === 'keyup' && (event as KeyboardEvent)?.key === 'e'
	const { innerHeight, innerWidth } = window
	const isMobileSized = innerWidth < 600

	let x = 0
	let y = 0

	if (withPointer && isMobileSized) {
		x = (innerWidth - editRects.width) / 2
		y = (event as PointerEvent).y - 60 - editRects.height
	}
	//
	else if (withPointer) {
		x = (event as PointerEvent).x + 20
		y = (event as PointerEvent).y + 20
	}
	//
	else if (withKeyboard) {
		x = (event.target as HTMLElement).offsetLeft
		y = (event.target as HTMLElement).offsetTop
	}

	const w = editRects.width + 30
	const h = editRects.height + 30

	if (x + w > innerWidth) x -= x + w - innerWidth
	if (y + h > innerHeight) y -= h

	return { x, y }
}

//
// Events
//

queueMicrotask(() => {
	document.addEventListener('close-edit', closeEditDialog)
	document.getElementById('editlink-form')?.addEventListener('submit', submitChanges)
	domlinkblocks?.addEventListener('contextmenu', openEditDialog)

	if (SYSTEM_OS === 'ios' || !IS_MOBILE) {
		window.addEventListener('resize', closeEditDialog)
	}
})

async function submitChanges(event: SubmitEvent) {
	switch (event.submitter?.id) {
		case 'eb_inputs': {
			applyLinkChanges('inputs')
			event.preventDefault()
			return
		}

		case 'eb_delete':
			deleteSelection()
			break

		case 'eb_submit-changes':
			applyLinkChanges('button')
			break

		case 'eb_add-link':
			addLinkFromEditDialog()
			break

		case 'eb_add-folder':
			addSelectionToNewFolder()
			break

		case 'eb_remove-folder':
			removeSelectionFromFolder()
			break

		case 'eb_add-group':
			addTab(domtitle.value)
			break

		case 'eb_pin-group':
		case 'eb_unpin-group': {
			const index = parseInt(domeditlink.dataset.tab ?? '0')
			const action = event.submitter.id === 'eb_pin-group' ? 'pin' : 'unpin'
			togglePinTab(index, action)
			break
		}
	}

	event.preventDefault()
	setTimeout(closeEditDialog)
}

async function applyLinkChanges(origin: 'inputs' | 'button') {
	const id = getSelectedIds()[0]
	const li = document.querySelector<HTMLLIElement>(`#${id}`)
	const isOnAddGroup = domeditlink.classList.contains('on-add-group')
	const isOnGroupTitle = domeditlink.classList.contains('on-group-title')
	const inputs = document.querySelectorAll<HTMLInputElement>('#editlink input')

	if (isOnGroupTitle) {
		changeTabTitle(domtitle.value, parseInt(domeditlink.dataset.tab ?? '0'))
		closeEditDialog()
		return
	}
	//
	else if (isOnAddGroup) {
		addTab(domtitle.value)
		closeEditDialog()
		return
	}
	//
	else if (!id && domeditlink.classList.contains('on-linklist')) {
		addLinkFromEditDialog()
		closeEditDialog()
		return
	}

	if (!id || !li) {
		return
	}

	if (origin === 'inputs') {
		inputs.forEach((node) => node.blur())
	}

	const data = await storage.sync.get(id)
	const link = data[id] as Links.Link

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

	if (!link.folder) {
		if (icon.dom) {
			const url = icon.val ? stringMaxSize(icon.val, 7500) : undefined ?? getDefaultIcon(link.url)
			const img = document.createElement('img')

			link.icon = url ? url : undefined

			icon.dom.src = 'src/assets/interface/loading.svg'
			img.onload = () => (icon.dom!.src = url)
			img.src = url
		}

		if (title.dom && url.dom && url.val !== undefined) {
			link.url = stringMaxSize(url.val, 512)
			url.dom.href = link.url
			title.dom.textContent = createTitle(link)
		}
	}

	storage.sync.set({ [id]: link })
}

function addLinkFromEditDialog() {
	linksUpdate({
		addLink: {
			title: domtitle.value,
			url: domurl.value,
		},
	})
}

function addSelectionToNewFolder() {
	linksUpdate({ addFolder: getSelectedIds() })
	document.dispatchEvent(new Event('remove-select-all'))
}

function deleteSelection() {
	if (domeditlink.dataset.tab) {
		deleteTab(parseInt(domeditlink.dataset.tab ?? '0'))
	} else {
		linksUpdate({
			deleteLinks: getSelectedIds(),
		})
	}
}

function removeSelectionFromFolder() {
	const index = parseInt(domeditlink.dataset.tab ?? '0')
	const group = document.querySelector<HTMLDivElement>(`.link-group[data-index="${index}"]`)

	if (group) {
		linksUpdate({ removeFromFolder: { ids: getSelectedIds(), group } })
		document.dispatchEvent(new Event('remove-select-all'))
	}
}

function closeEditDialog() {
	if (domeditlink.open) {
		document.querySelectorAll('.block.selected').forEach((block) => block?.classList.remove('selected'))
		domeditlink.removeAttribute('data-tab')
		domeditlink.classList.remove('shown')
		domeditlink.close()
	}
}
