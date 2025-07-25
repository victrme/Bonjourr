import { getLink, getSelectedIds } from './helpers.ts'
import { togglePinGroup } from './groups.ts'
import { quickLinks } from './index.ts'

import { IS_MOBILE, SYSTEM_OS } from '../../defaults.ts'
import { getComposedPath } from '../../shared/dom.ts'
import { transitioner } from '../../utils/transitioner.ts'
import { tradThis } from '../../utils/translations.ts'
import { debounce } from '../../utils/debounce.ts'
import { storage } from '../../storage.ts'

interface EditStates {
	group: string
	folder: string
	selected: string[]
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
		synced: boolean
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

export async function openEditDialog(event: Event) {
	const path = getComposedPath(event.target)
	const classNames = path.map((element) => element.className ?? '')
	const linkelem = path.find((el) => el?.className?.includes('link') && el?.tagName === 'LI')
	const linkgroup = path.find((el) => el?.className?.includes('link-group'))
	const linktitle = path.find((el) => el?.className?.includes('link-title'))

	const pointer = event as PointerEvent
	const ctrlRightClick = pointer.button === 2 && !!pointer.ctrlKey && event.type === 'contextmenu'
	const pressingE = event.type === 'keyup' && (event as KeyboardEvent).code !== 'KeyE'

	if (ctrlRightClick || pressingE) {
		return
	}

	const container: EditStates['container'] = {
		mini: path.some((element) => element?.id?.includes('link-mini')),
		group: classNames.some((cl) => cl.includes('link-group') && !cl.includes('in-folder')),
		folder: classNames.some((cl) => cl.includes('link-group') && cl.includes('in-folder')),
	}

	const target: EditStates['target'] = {
		link: classNames.some((cl) => cl.includes('link-elem')),
		folder: classNames.some((cl) => cl.includes('link-folder')),
		title: classNames.some((cl) => cl.includes('link-title')),
		synced: classNames.some((cl) => cl.includes('synced')),
		addgroup: classNames.some((cl) => cl.includes('add-group')),
	}

	const selectall = classNames.some((cl) => cl.includes('select-all'))
	const dragging = classNames.some((cl) => cl.includes('dragging') || cl.includes('dropping'))
	const group = (container.mini ? linktitle : linkgroup)?.dataset.group ?? ''

	const domfolder = document.querySelector<HTMLElement>('.link-group.in-folder')
	const folder = domfolder?.dataset?.folder ?? ''

	editStates = {
		group,
		folder,
		selectall,
		container,
		dragging,
		target,
		selected: getSelectedIds(),
	}

	const inputs = toggleEditInputs()
	const folderTitle = container.folder && target.title
	const noSelection = selectall && editStates.selected.length === 0
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

		if (onlyOneTitleUnpinned) {
			document.getElementById('edit-pin')?.setAttribute('disabled', '')
		}
		if (onlyOneTitleLeft) {
			document.getElementById('edit-delete')?.setAttribute('disabled', '')
		}
	}

	if (target.folder || target.link) {
		const pathLis = path.filter((el) => el.tagName === 'LI')
		const li = pathLis[0]
		const id = li?.id
		const link = getLink(data, id)

		domtitle.value = link?.title ?? ''

		if (link && !link.folder) {
			const icon = link.icon ?? ''
			domurl.value = link.url ?? ''
			domicon.value = Number.isNaN(Number.parseInt(icon)) ? icon : ''
		}
	}

	if (!selectall) {
		for (const node of document.querySelectorAll('.link-title.selected, .link.selected') ?? []) {
			node.classList.remove('selected')
		}
		;(target.title ? linktitle : linkelem)?.classList.add('selected')
	}

	// Must be placed after "li?.classList.add('selected')"
	editStates.selected = getSelectedIds()

	const contextmenuTransition = transitioner()
	contextmenuTransition.first(() => domeditlink?.show())
	contextmenuTransition.after(() => domeditlink?.classList?.add('shown'))
	contextmenuTransition.transition(10)

	const { x, y } = newEditDialogPosition(event)
	domeditlink.style.transform = `translate(${Math.floor(x)}px, ${Math.floor(y)}px)`
	domtitle?.focus()
}

function toggleEditInputs(): string[] {
	const deleteButtonTxt = document.querySelector<HTMLButtonElement>('#edit-delete span')
	const addButtonTxt = document.querySelector<HTMLButtonElement>('#edit-add span')
	const { container, target, selectall } = editStates
	let inputs: string[] = []

	for (const node of domeditlink.querySelectorAll('label, button, hr')) {
		node.classList.remove('on')
	}

	document.querySelector('#edit-delete')?.removeAttribute('disabled')
	document.querySelector('#edit-pin')?.removeAttribute('disabled')

	domurl.value = ''
	domicon.value = ''
	domtitle.value = ''

	if (container.mini) {
		if (target.synced) {
			inputs = ['pin', 'delete']
		} else if (target.addgroup) {
			inputs = ['title', 'add']
		} else if (target.title) {
			inputs = ['title', 'delete', 'pin', 'apply']
		}
	}

	if (container.group) {
		if (target.synced && !target.title) {
			inputs = ['synced']
		} else if (target.synced && target.title) {
			inputs = ['unpin', 'delete']
		} else if (selectall) {
			inputs = ['delete', 'refresh', 'add']
		} else if (target.title) {
			inputs = ['title', 'delete', 'unpin', 'apply']
		} else if (target.folder) {
			inputs = ['title', 'delete', 'apply']
		} else if (target.link) {
			inputs = ['title', 'url', 'icon', 'delete', 'refresh', 'apply']
		} else {
			inputs = ['title', 'url', 'add']
		}
	}

	if (container.folder) {
		if (target.title) {
			inputs = []
		} else if (selectall) {
			inputs = ['delete', 'unfolder']
		} else if (target.link) {
			inputs = ['title', 'url', 'icon', 'delete', 'apply', 'unfolder']
		} else {
			inputs = ['title', 'url', 'add']
		}
	}

	for (const id of inputs) {
		domeditlink.querySelector(`#edit-${id}`)?.classList.add('on')
	}

	const hasLabels = inputs.includes('title') || inputs.includes('url') || inputs.includes('icon')
	domeditlink.querySelector('hr')?.classList.toggle('on', hasLabels)

	if (deleteButtonTxt) {
		if (selectall) {
			deleteButtonTxt.textContent = tradThis('Delete selected')
		} else if (target.folder) {
			deleteButtonTxt.textContent = tradThis('Delete folder')
		} else if (target.link) {
			deleteButtonTxt.textContent = tradThis('Delete link')
		} else if (target.title) {
			deleteButtonTxt.textContent = tradThis('Delete group')
		}
	}

	if (addButtonTxt) {
		if (selectall) {
			addButtonTxt.textContent = tradThis('Create new folder')
		} else if (target.title) {
			addButtonTxt.textContent = tradThis('Add new group')
		} else {
			addButtonTxt.textContent = tradThis('Add new link')
		}
	}

	return inputs
}

function newEditDialogPosition(event: Event): { x: number; y: number } {
	const editRects = domeditlink.getBoundingClientRect()
	const withPointer = event.type === 'contextmenu' || event.type === 'click' || event.type === 'touchstart'
	const withKeyboard = event.type === 'keyup' && (event as KeyboardEvent)?.key === 'e'
	const { innerHeight, innerWidth } = window
	const isMobileSized = innerWidth < 600
	const docLang = document.documentElement.lang
	const rightToLeft = docLang === 'ar' || docLang === 'fa' || docLang === 'he'

	let x = 0
	let y = 0

	if (withPointer && isMobileSized) {
		x = (innerWidth - editRects.width) / 2
		y = (event.type === 'touchstart' ? (event as TouchEvent).touches[0].clientY : (event as PointerEvent).y) -
			60 -
			editRects.height
	} //
	else if (withPointer) {
		// gets coordinates differently from touchstart or contextmenu
		x = (event.type === 'touchstart' ? (event as TouchEvent).touches[0].clientX : (event as PointerEvent).x) + 20
		y = (event.type === 'touchstart' ? (event as TouchEvent).touches[0].clientY : (event as PointerEvent).y) + 20
	} //
	else if (withKeyboard) {
		x = (event.target as HTMLElement).offsetLeft
		y = (event.target as HTMLElement).offsetTop
	}

	const w = editRects.width + 30
	const h = editRects.height + 30

	if (x + w > innerWidth) {
		x -= x + w - innerWidth
	}

	if (y + h > innerHeight) {
		y -= h
	}

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
		const handleLongPress = debounce((event: TouchEvent) => {
			openEditDialog(event)
		}, 500)

		domlinkblocks?.addEventListener('touchstart', (event) => {
			handleLongPress(event)
		})

		domlinkblocks?.addEventListener('touchend', () => {
			handleLongPress.cancel()
		})

		globalThis.addEventListener('resize', closeEditDialog)
	}
})

function submitChanges(event: SubmitEvent) {
	const change = event.submitter?.id
	const { container, target, group, folder, selected, selectall } = editStates

	if (change === 'edit-apply') {
		applyLinkChanges('button')
	}

	if (change === 'edit-refresh') {
		quickLinks(undefined, { refreshIcons: selected })
	}

	if (change === 'edit-inputs') {
		applyLinkChanges('inputs')
		event.preventDefault()
		return
	}

	if (change === 'edit-delete') {
		if (target.title) {
			quickLinks(undefined, { deleteGroup: group })
		} else {
			quickLinks(undefined, { deleteLinks: selected })
		}
	}

	if (change === 'edit-add') {
		if (container.folder) {
			quickLinks(undefined, {
				addLinks: [{
					group: folder,
					title: domtitle.value,
					url: domurl.value,
				}],
			})
		} else if (target.title) {
			quickLinks(undefined, {
				addGroups: [{
					title: domtitle.value,
				}],
			})
		} else if (selectall) {
			document.dispatchEvent(new Event('remove-select-all'))
			quickLinks(undefined, {
				addFolder: {
					ids: selected,
					group: group,
				},
			})
		} else if (container.group) {
			quickLinks(undefined, {
				addLinks: [{
					group,
					title: domtitle.value,
					url: domurl.value,
				}],
			})
		}
	}

	if (change === 'edit-unfolder') {
		document.dispatchEvent(new Event('remove-select-all'))
		quickLinks(undefined, {
			moveOutFolder: {
				ids: editStates.selected,
				group: editStates.group,
			},
		})
	}

	if (change === 'edit-pin') {
		togglePinGroup(group, 'pin')
	}

	if (change === 'edit-unpin') {
		togglePinGroup(group, 'unpin')
	}

	event.preventDefault()
	setTimeout(closeEditDialog)
}

function applyLinkChanges(origin: 'inputs' | 'button') {
	const id = editStates.selected[0]
	const li = document.querySelector<HTMLLIElement>(`#${id}`)
	const inputs = document.querySelectorAll<HTMLInputElement>('#editlink input')

	if (editStates.target.addgroup) {
		quickLinks(undefined, { addGroups: [{ title: domtitle.value }] })
		closeEditDialog()
		return
	}

	if (editStates.target.title) {
		quickLinks(undefined, {
			groupTitle: {
				old: domeditlink.dataset.group ?? '',
				new: domtitle.value,
			},
		})
		closeEditDialog()
		return
	}

	if (editStates.container.folder && editStates.selected.length === 0 && domurl.value) {
		quickLinks(undefined, {
			addLinks: [{
				group: editStates.folder,
				title: domtitle.value,
				url: domurl.value,
			}],
		})
		closeEditDialog()
		return
	}

	if (editStates.container.group && !editStates.target.link && !editStates.target.folder) {
		quickLinks(undefined, {
			addLinks: [{
				group: editStates.group,
				title: domtitle.value,
				url: domurl.value,
			}],
		})
		closeEditDialog()
		return
	}

	if (!(id && li)) {
		return
	}

	if (origin === 'inputs') {
		for (const node of inputs) {
			node.blur()
		}
	}

	quickLinks(undefined, {
		updateLink: {
			id: id,
			title: document.querySelector<HTMLInputElement>('#e-title')?.value ?? '',
			icon: document.querySelector<HTMLInputElement>('#e-icon')?.value,
			url: document.querySelector<HTMLInputElement>('#e-url')?.value,
		},
	})
	closeEditDialog()
}

function closeEditDialog() {
	if (domeditlink.open) {
		const selected = document.querySelectorAll('.link-title.selected, .link.selected')

		for (const node of selected) {
			node?.classList.remove('selected')
		}

		domeditlink.removeAttribute('data-tab')
		domeditlink.classList.remove('shown')
		domeditlink.close()
	}
}
