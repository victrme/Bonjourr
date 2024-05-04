import { getSelectedIds, getLink, getDefaultIcon, createTitle } from './helpers'
import { deleteTab, addTab, changeTabTitle, togglePinTab } from './tabs'
import { IS_MOBILE, SYSTEM_OS } from '../../defaults'
import { stringMaxSize } from '../../utils'
import { linksUpdate } from '.'
import { tradThis } from '../../utils/translations'
import transitioner from '../../utils/transitioner'
import storage from '../../storage'

interface EditStates {
	container: {
		mini: boolean
		group: boolean
		folder: boolean
	}
	target: {
		link: boolean
		folder: boolean
		title: boolean
		topsite: boolean
		topsites: boolean
		addgroup: boolean
	}
	state: {
		selectall: boolean
		dragging: boolean
	}
}

const domlinkblocks = document.getElementById('linkblocks') as HTMLDivElement
const domeditlink = document.getElementById('editlink') as HTMLDialogElement
const domtitle = document.getElementById('e_title') as HTMLInputElement
const domurl = document.getElementById('e_url') as HTMLInputElement
const domicon = document.getElementById('e_icon') as HTMLInputElement
let editStates: EditStates

//
// Display
//

export default async function openEditDialog(event: Event) {
	const path = event.composedPath() as HTMLElement[]
	const classNames = path.map((element) => element.className ?? '')
	const selected = document.querySelectorAll('#linkblocks li.selected')

	if (event.type === 'keyup' && (event as KeyboardEvent).code !== 'KeyE') {
		return
	}

	const container: EditStates['container'] = {
		mini: path.some((element) => element?.id?.includes('link-mini')),
		group: classNames.some((cl) => cl.includes('link-group') && !cl.includes('in-folder')),
		folder: classNames.some((cl) => cl.includes('link-group') && cl.includes('in-folder')),
	}

	const target: EditStates['target'] = {
		link: classNames.some((cl) => cl.includes('block') && !cl.includes('folder')),
		folder: classNames.some((cl) => cl.includes('block') && cl.includes('folder')),
		title: classNames.some((cl) => cl.includes('link-title')),
		topsite: classNames.some((cl) => cl?.includes('topsites-group')),
		topsites: classNames.some((cl) => cl.includes('topsites-title')),
		addgroup: classNames.some((cl) => cl.includes('add-group')),
	}

	const state: EditStates['state'] = {
		selectall: classNames.some((cl) => cl.includes('select-all')),
		dragging: classNames.some((cl) => cl.includes('dragging') || cl.includes('dropping')),
	}

	editStates = { container, target, state }

	const inputs = toggleEditInputs({
		container,
		target,
		state,
	})

	const folderTitle = container.folder && target.title
	const noSelection = state.selectall && !selected[0]
	const noInputs = inputs.length === 0

	if (noInputs || folderTitle || noSelection || state.dragging) {
		closeEditDialog()
		return
	}

	document.dispatchEvent(new Event('stop-select-all'))
	event.preventDefault()

	const data = await storage.sync.get()

	if (target.title) {
		const element = container.group
			? (path.find((el) => el.className.includes('link-group')) as HTMLElement)
			: (path[0] as HTMLElement)

		const { titles, pinned } = data.linktabs
		const index = parseInt(element?.dataset.index ?? '-1')
		const title = titles[index] ?? ''

		domeditlink.dataset.tab = index.toString()
		domtitle.value = title

		const onlyOneTitleUnpinned = titles.length - pinned.length < 2
		const onlyOneTitleLeft = titles.length < 2

		if (onlyOneTitleUnpinned) document.querySelector('#eb_pin')?.setAttribute('disabled', '')
		if (onlyOneTitleLeft) document.querySelector('#eb_delete')?.setAttribute('disabled', '')
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

	const contextmenuTransition = transitioner()
	contextmenuTransition.first(() => domeditlink?.show())
	contextmenuTransition.then(async () => domeditlink?.classList?.add('shown'))
	contextmenuTransition.transition(10)

	const { x, y } = newEditDialogPosition(event)
	domeditlink.style.transform = `translate(${Math.floor(x)}px, ${Math.floor(y)}px)`
	domtitle?.focus()
}

function toggleEditInputs(states: EditStates): string[] {
	const deleteButton = document.querySelector<HTMLButtonElement>('#eb_delete')
	const addButton = document.querySelector<HTMLButtonElement>('#eb_add')
	const { container, target, state } = states
	let inputs: string[] = []

	document.querySelectorAll('#editlink label, #editlink button').forEach((node) => {
		node.removeAttribute('style')
	})

	document.querySelector('#eb_delete')?.removeAttribute('disabled')
	document.querySelector('#eb_pin')?.removeAttribute('disabled')

	domurl.value = ''
	domicon.value = ''
	domtitle.value = ''

	if (container.mini) {
		if (target.topsites) inputs = ['pin']
		else if (target.addgroup) inputs = ['title', 'add']
		else if (target.title) inputs = ['title', 'delete', 'pin', 'apply']
	}

	if (container.group) {
		if (target.topsites) inputs = ['unpin']
		else if (target.title) inputs = ['title', 'delete', 'unpin', 'apply']
		else if (target.topsite) inputs = []
		else if (target.folder) inputs = ['title', 'delete', 'apply']
		else if (target.link) inputs = ['title', 'url', 'icon', 'delete', 'apply']
		else inputs = ['title', 'url', 'icon', 'add']
	}

	if (container.folder) {
		if (target.title) inputs = []
		if (target.link) inputs = ['title', 'url', 'icon', 'delete', 'apply', 'unfolder']
	}

	console.log(inputs)

	for (const id of inputs) {
		const isLabel = !!id.match(/title|url|icon/)
		const selector = isLabel ? `#el_${id}` : `#eb_${id}`
		const input = domeditlink.querySelector<HTMLElement>(selector)

		if (input) {
			input.style.display = isLabel ? 'grid' : 'initial'
		}
	}

	if (inputs.some((id) => !!id.match(/title|url|icon/)) === false) {
		domeditlink.querySelector('hr')?.setAttribute('style', 'display: none')
	} else {
		domeditlink.querySelector('hr')?.removeAttribute('style')
	}

	if (deleteButton) {
		if (state.selectall) deleteButton.textContent = tradThis('Delete selected')
		else if (target.folder) deleteButton.textContent = tradThis('Delete folder')
		else if (target.link) deleteButton.textContent = tradThis('Delete link')
		else if (target.title) deleteButton.textContent = tradThis('Delete group')
	}

	if (addButton) {
		if (state.selectall) addButton.textContent = tradThis('Create new folder')
		else if (target.title) addButton.textContent = tradThis('Add new group')
		else addButton.textContent = tradThis('Add new link')
	}

	return inputs
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
		case 'eb_delete':
			deleteSelection()
			break

		case 'eb_add':
			addSelection(editStates)
			break

		case 'eb_submit-changes':
			applyLinkChanges('button')
			break

		case 'eb_unfolder':
			removeSelectionFromFolder()
			break

		case 'eb_inputs': {
			applyLinkChanges('inputs')
			event.preventDefault()
			return
		}

		case 'eb_pin':
		case 'eb_unpin': {
			const index = parseInt(domeditlink.dataset.tab ?? '0')
			const action = event.submitter.id === 'eb_pin' ? 'pin' : 'unpin'
			togglePinTab(index, action)
			break
		}
	}

	event.preventDefault()
	setTimeout(closeEditDialog)
}

async function addSelection(state: EditStates) {
	if (state.target.title) addTab(domtitle.value)
	if (state.target.folder) addSelectionToNewFolder()
	if (state.container.group) addLinkFromEditDialog()
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
