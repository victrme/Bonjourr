import { deleteGroup, addGroup, changeGroupTitle, togglePinGroup } from './groups'
import { getSelectedIds, getLink, getDefaultIcon, createTitle } from './helpers'
import { getComposedPath, stringMaxSize } from '../../utils'
import { IS_MOBILE, SYSTEM_OS } from '../../defaults'
import { linksUpdate } from '.'
import { tradThis } from '../../utils/translations'
import transitioner from '../../utils/transitioner'
import debounce from '../../utils/debounce'
import storage from '../../storage'

interface EditStates {
	group: string
	selectall: boolean
	dragging: boolean
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
}

const domlinkblocks = document.getElementById('linkblocks') as HTMLDivElement
const domeditlink = document.getElementById('editlink') as HTMLDialogElement
const domtitle = document.getElementById('e-title') as HTMLInputElement
const domurl = document.getElementById('e-url') as HTMLInputElement
const domicon = document.getElementById('e-icon') as HTMLInputElement

let editStates: EditStates

//
// Display
//

export default async function openEditDialog(event: Event) {
	const path = getComposedPath(event.target)
	const classNames = path.map((element) => element.className ?? '')
	const selected = document.querySelectorAll('#linkblocks li.selected')
	const linkgroup = path.find((el) => el?.className?.includes('link-group'))
	const linktitle = path.find((el) => el?.className?.includes('link-title'))

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

	const selectall = classNames.some((cl) => cl.includes('select-all'))
	const dragging = classNames.some((cl) => cl.includes('dragging') || cl.includes('dropping'))
	const group = (container.mini ? linktitle : linkgroup)?.dataset.group ?? ''

	editStates = { group, selectall, container, dragging, target }

	const inputs = toggleEditInputs()

	const folderTitle = container.folder && target.title
	const noSelection = selectall && !selected[0]
	const noInputs = inputs.length === 0

	if (noInputs || folderTitle || noSelection || dragging) {
		closeEditDialog()
		return
	}

	document.dispatchEvent(new Event('stop-select-all'))
	event.preventDefault()

	const data = await storage.sync.get()

	if (target.title) {
		const { groups, pinned } = data.linkgroups
		const title = editStates.target.addgroup ? '' : editStates.group

		domeditlink.dataset.group = title
		domtitle.value = title

		const onlyOneTitleUnpinned = groups.length - pinned.length < 2
		const onlyOneTitleLeft = groups.length < 2

		if (onlyOneTitleUnpinned) document.getElementById('edit-pin')?.setAttribute('disabled', '')
		if (onlyOneTitleLeft) document.getElementById('edit-delete')?.setAttribute('disabled', '')
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

		if (!selectall) {
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

function toggleEditInputs(): string[] {
	const deleteButton = document.querySelector<HTMLButtonElement>('#edit-delete')
	const addButton = document.querySelector<HTMLButtonElement>('#edit-add')
	const { container, target, selectall } = editStates
	let inputs: string[] = []

	domeditlink.querySelectorAll('label, button, hr').forEach((node) => {
		node.classList.remove('on')
	})

	document.querySelector('#edit-delete')?.removeAttribute('disabled')
	document.querySelector('#edit-pin')?.removeAttribute('disabled')

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

	for (const id of inputs) {
		domeditlink.querySelector(`#edit-${id}`)?.classList.add('on')
	}

	const hasLabels = inputs.includes('title') || inputs.includes('url') || inputs.includes('icon')
	domeditlink.querySelector('hr')?.classList.toggle('on', hasLabels)

	if (deleteButton) {
		if (selectall) deleteButton.textContent = tradThis('Delete selected')
		else if (target.folder) deleteButton.textContent = tradThis('Delete folder')
		else if (target.link) deleteButton.textContent = tradThis('Delete link')
		else if (target.title) deleteButton.textContent = tradThis('Delete group')
	}

	if (addButton) {
		if (selectall) addButton.textContent = tradThis('Create new folder')
		else if (target.title) addButton.textContent = tradThis('Add new group')
		else addButton.textContent = tradThis('Add new link')
	}

	return inputs
}

function newEditDialogPosition(event: Event): { x: number; y: number } {
	const editRects = domeditlink.getBoundingClientRect()
	const withPointer = event.type === 'contextmenu' || event.type === 'click' || event.type === 'touchstart'
	const withKeyboard = event.type === 'keyup' && (event as KeyboardEvent)?.key === 'e'
	const { innerHeight, innerWidth } = window
	const isMobileSized = innerWidth < 600
	const rightToLeft = document.documentElement.lang.match(/ar|fa/)

	let x = 0
	let y = 0

	if (withPointer && isMobileSized) {
		x = (innerWidth - editRects.width) / 2
		y =
			(event.type === 'touchstart' ? (event as TouchEvent).touches[0].clientY : (event as PointerEvent).y) -
			60 -
			editRects.height
	}
	//
	else if (withPointer) {
		// gets coordinates differently from touchstart or contextmenu
		x = (event.type === 'touchstart' ? (event as TouchEvent).touches[0].clientX : (event as PointerEvent).x) + 20
		y = (event.type === 'touchstart' ? (event as TouchEvent).touches[0].clientY : (event as PointerEvent).y) + 20
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

	if (rightToLeft) {
		x *= -1
	}

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
		const handleLongPress = debounce(function (event: TouchEvent) {
			openEditDialog(event)
		}, 500)

		domlinkblocks?.addEventListener('touchstart', function (event) {
			handleLongPress(event)
		})

		domlinkblocks?.addEventListener('touchend', function (event) {
			handleLongPress.cancel()
		})

		window.addEventListener('resize', closeEditDialog)
	}
})

async function submitChanges(event: SubmitEvent) {
	switch (event.submitter?.id) {
		case 'edit-delete':
			deleteSelection()
			break

		case 'edit-add':
			addSelection()
			break

		case 'edit-apply':
			applyLinkChanges('button')
			break

		case 'edit-unfolder':
			removeSelectionFromFolder()
			break

		case 'edit-inputs': {
			applyLinkChanges('inputs')
			event.preventDefault()
			return
		}

		case 'edit-pin':
		case 'edit-unpin': {
			const group = editStates.group
			const action = event.submitter.id === 'edit-pin' ? 'pin' : 'unpin'
			togglePinGroup(group, action)
			break
		}
	}

	event.preventDefault()
	setTimeout(closeEditDialog)
}

async function addSelection() {
	if (editStates.target.title) addGroup([domtitle.value])
	if (editStates.target.folder) addSelectionToNewFolder()
	if (editStates.container.group) addLinkFromEditDialog()
}

async function applyLinkChanges(origin: 'inputs' | 'button') {
	const id = getSelectedIds()[0]
	const li = document.querySelector<HTMLLIElement>(`#${id}`)
	const inputs = document.querySelectorAll<HTMLInputElement>('#editlink input')

	if (editStates.target.addgroup) {
		addGroup([domtitle.value])
		closeEditDialog()
		return
	}
	//
	else if (editStates.target.title) {
		closeEditDialog()
		changeGroupTitle({
			old: domeditlink.dataset.group ?? '',
			new: domtitle.value,
		})
		return
	}
	//
	else if (editStates.container.group && !editStates.target.link) {
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
		val: document.querySelector<HTMLInputElement>('#e-title')?.value,
		dom: document.querySelector<HTMLSpanElement>(`#${id} span`),
	}

	const url = {
		val: document.querySelector<HTMLInputElement>('#e-url')?.value,
		dom: document.querySelector<HTMLAnchorElement>(`#${id} a`),
	}

	const icon = {
		val: document.querySelector<HTMLInputElement>('#e-icon')?.value,
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
		addLinks: [
			{
				group: editStates.group,
				title: domtitle.value,
				url: domurl.value,
			},
		],
	})
}

function addSelectionToNewFolder() {
	linksUpdate({ addFolder: getSelectedIds() })
	document.dispatchEvent(new Event('remove-select-all'))
}

function deleteSelection() {
	if (editStates.target.title) {
		deleteGroup(editStates.group)
	} else {
		linksUpdate({
			deleteLinks: getSelectedIds(),
		})
	}
}

function removeSelectionFromFolder() {
	const group = document.querySelector<HTMLDivElement>(`.link-group[data-index="${editStates.group}"]`)

	if (group) {
		linksUpdate({ unfolder: { ids: getSelectedIds(), group } })
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
