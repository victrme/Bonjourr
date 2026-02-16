import { getLink, getSelectedIds, isLinkIconType } from './helpers.ts'
import { closeContextMenu, positionContextMenu } from '../contextmenu.ts'
import { togglePinGroup } from './groups.ts'
import { quickLinks } from './index.ts'

import { getComposedPath } from '../../shared/dom.ts'
import { tradThis } from '../../utils/translations.ts'
import { storage } from '../../storage.ts'

import type { LinkIconType } from '../../../types/shared.ts'

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

let domeditlink: HTMLDialogElement

const domtitle = document.getElementById('e-title') as HTMLInputElement
const domurl = document.getElementById('e-url') as HTMLInputElement
const domhotkey = document.getElementById('e-hotkey') as HTMLInputElement

const domiconfilelabel = document.getElementById('e-icon-file-label') as HTMLSpanElement
const domiconfile = document.getElementById('e-icon-file') as HTMLInputElement
const domicontype = document.getElementById('e-icon-type') as HTMLInputElement
const domiconurl = document.getElementById('e-icon-url') as HTMLInputElement

let inputToFocus: HTMLInputElement
let buttonToSubmit: HTMLButtonElement

let editStates: EditStates

//
// Display
//

export async function populateDialogWithEditLink(
	event: Event,
	domdialog: HTMLDialogElement,
	newLinkFromGlobal?: boolean,
) {
	domeditlink = domdialog

	const path = getComposedPath(event.target)
	const classNames = path.map((element) => element.className ?? '')
	const linkelem = path.find((el) => el?.className?.includes('link') && el?.tagName === 'LI')
	const linkgroup = path.find((el) => el?.className?.includes('link-group'))
	const linktitle = path.find((el) => el?.className?.includes('link-title'))

	const container: EditStates['container'] = {
		mini: path.some((element) => element?.id?.includes('link-mini')),
		group: newLinkFromGlobal ?? classNames.some((cl) => cl.includes('link-group') && !cl.includes('in-folder')),
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
		closeContextMenu()
		return
	}

	document.dispatchEvent(new Event('stop-select-all'))
	event.preventDefault()

	// removes buttons from the global context menu
	domeditlink.querySelectorAll('#contextActions button, #background-actions').forEach(function (contextButton) {
		contextButton.classList.remove('on')
	})

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
			domurl.value = link.url ?? ''
			domhotkey.value = link.hotkey ?? ''

			const iconType = link.icon?.type ?? 'auto'
			const iconValue = link.icon?.value ?? ''

			domiconurl.value = ''
			domiconfilelabel.textContent = tradThis('No file chosen')

			if (iconType === 'url' && iconValue) {
				domiconurl.value = iconValue
			}
			if (iconType === 'file') {
				domiconfilelabel.textContent = iconValue
			}

			toggleIconType(link.icon ? link.icon.type : 'auto')
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

	// Once dialog is populated, calculates its position
	if (!newLinkFromGlobal) {
		positionContextMenu(event)
	}

	inputToFocus?.focus()
}

function toggleEditInputs(): string[] {
	const deleteButtonTxt = document.querySelector<HTMLButtonElement>('#edit-delete span')
	const addButtonTxt = document.querySelector<HTMLButtonElement>('#edit-add span')
	const { container, target, selectall } = editStates
	let inputs: string[] = []

	inputToFocus = domtitle
	setSubmitOnEnter('edit-apply')

	document.querySelector('#edit-delete')?.removeAttribute('disabled')
	document.querySelector('#edit-pin')?.removeAttribute('disabled')

	domurl.value = ''
	domiconurl.value = ''
	domtitle.value = ''

	if (container.mini) {
		if (target.synced) {
			inputs = ['pin', 'delete']
		} else if (target.addgroup) {
			inputs = ['title*', 'add'] // * for required inputs
			setSubmitOnEnter('edit-add')
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
			setSubmitOnEnter('edit-add')
		} else if (target.title) {
			inputs = ['title', 'delete', 'unpin', 'apply']
		} else if (target.folder) {
			inputs = ['title', 'delete', 'apply']
		} else if (target.link) {
			inputs = ['title', 'url*', 'icon', 'icon-url*', 'delete', 'refresh', 'apply', 'hotkey']
		} else {
			inputs = ['title', 'url*', 'add', 'hotkey']
			inputToFocus = domurl
			setSubmitOnEnter('edit-add')
		}
	}

	if (container.folder) {
		if (target.title) {
			inputs = []
		} else if (selectall) {
			inputs = ['delete', 'unfolder']
		} else if (target.link) {
			inputs = ['title', 'url*', 'icon', 'icon-url*', 'delete', 'apply', 'unfolder', 'hotkey']
		} else {
			inputs = ['title', 'url*', 'add', 'hotkey']
			inputToFocus = domurl
			setSubmitOnEnter('edit-add')
		}
	}

	// shows/enables every input, button and label needed
	for (const id of inputs) {
		const required = id.endsWith('*')
		const cleanId = required ? id.slice(0, -1) : id

		domeditlink.querySelector<HTMLLabelElement>(`#edit-${cleanId}`)?.classList.add('on')

		if (required) {
			domeditlink.querySelector<HTMLInputElement>(`#e-${cleanId}`)!.required = true
		}
	}

	const hasLabels = inputs.includes('title') || inputs.includes('title*') || inputs.includes('url*') ||
		inputs.includes('icon')
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

//
// Events
//
queueMicrotask(() => {
	document.getElementById('editlink-form')?.addEventListener('submit', submitChanges)
	domicontype?.addEventListener('change', toggleIconType)
})

/**
 * HTML has peculiar (and limiting) ways of figuring out which button to submit to on enter
 * this is needed to be sure hitting enter triggers the same reaction as clicking the right button
 */
function setSubmitOnEnter(theButton: string) {
	if (!buttonToSubmit) {
		buttonToSubmit = document.getElementById(theButton ?? 'edit-apply') as HTMLButtonElement

		document.getElementById('editlink-form')?.addEventListener('keydown', function (e) {
			if (e.key === 'Enter') {
				e.preventDefault() // prevent default submit
				buttonToSubmit.click() // triggers demanded button
			}
		})
	} else {
		buttonToSubmit = document.getElementById(theButton) as HTMLButtonElement
	}
}

function toggleIconType(iconType: Event | string) {
	if (iconType instanceof Event) { // figures out the needed icon type if it's from event change
		const target = iconType.target as HTMLInputElement
		iconType = target.value
	}

	const selectIconType = document.getElementById('e-icon-type') as HTMLSelectElement
	if (selectIconType) {
		selectIconType.value = iconType
	}

	const editIconUrl = document.getElementById('e-icon-url') as HTMLInputElement
	if (editIconUrl) { // disables the input when it's hidden, otherwise HTML complains
		editIconUrl.disabled = iconType !== 'url'
	}

	// only shows refresh button when auto or url type
	const refreshButton = document.getElementById('edit-refresh') as HTMLButtonElement
	if (refreshButton) {
		const showsRefreshButton = ['auto', 'url'].includes(iconType)
		refreshButton.disabled = !showsRefreshButton
		refreshButton?.classList.toggle('on', showsRefreshButton)
	}

	document.getElementById('edit-icon-url')?.classList.toggle('on', iconType === 'url')
	document.getElementById('edit-icon-svg')?.classList.toggle('on', iconType === 'svg')
	document.getElementById('edit-icon-file')?.classList.toggle('on', iconType === 'file')
}

function submitChanges(event: SubmitEvent) {
	const change = event.submitter?.id
	const { container, target, group, folder, selected, selectall } = editStates

	if (change === 'edit-apply') {
		applyLinkChanges('button')
	}

	if (change === 'edit-icon') {
		toggleIconType(event)
	}

	if (change === 'edit-refresh') {
		quickLinks(undefined, { refreshIcons: selected })
	}

	if (change === 'edit-delete') {
		if (target.title) {
			quickLinks(undefined, { deleteGroup: group })
		} else {
			quickLinks(undefined, { deleteLinks: selected })
		}
	}

	if (change === 'edit-add') {
		if (container.folder) { // new link inside folder
			quickLinks(undefined, {
				addLinks: [{
					group: folder,
					title: domtitle.value,
					url: domurl.value,
					hotkey: domhotkey.value,
				}],
			})
		} else if (target.title && domtitle.value) { // new group
			quickLinks(undefined, {
				addGroups: [{
					title: domtitle.value,
				}],
			})
		} else if (selectall) {
			document.dispatchEvent(new Event('remove-select-all')) // new folder from multi-selection
			quickLinks(undefined, {
				addFolder: {
					ids: selected,
					group: group,
				},
			})
		} else if (container.group) { // new link
			quickLinks(undefined, {
				addLinks: [{
					group,
					title: domtitle.value,
					url: domurl.value,
					hotkey: domhotkey.value,
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
	setTimeout(closeContextMenu)
}

function applyLinkChanges(_origin: 'inputs' | 'button') {
	const id = editStates.selected[0]
	const li = document.querySelector<HTMLLIElement>(`#${id}`)
	const _inputs = document.querySelectorAll<HTMLInputElement>('#editlink input')

	if (editStates.target.addgroup) {
		quickLinks(undefined, { addGroups: [{ title: domtitle.value }] })
		closeContextMenu()
		return
	}

	if (editStates.target.title) {
		quickLinks(undefined, {
			groupTitle: {
				old: domeditlink.dataset.group ?? '',
				new: domtitle.value,
			},
		})
		closeContextMenu()
		return
	}

	if (editStates.container.folder && editStates.selected.length === 0 && domurl.value) {
		quickLinks(undefined, {
			addLinks: [{
				group: editStates.folder,
				title: domtitle.value,
				url: domurl.value,
				hotkey: domhotkey.value,
			}],
		})
		closeContextMenu()
		return
	}

	if (editStates.container.group && !editStates.target.link && !editStates.target.folder) {
		quickLinks(undefined, {
			addLinks: [{
				group: editStates.group,
				title: domtitle.value,
				url: domurl.value,
				hotkey: domhotkey.value,
			}],
		})
		closeContextMenu()
		return
	}

	if (!id || !li) {
		return
	}

	// Step: Handle icon input data

	let iconType: LinkIconType = 'auto'
	let iconValue: string | undefined = undefined
	const iconUrl = domiconurl.value
	const iconFile = domiconfile.files?.[0]

	if (isLinkIconType(domicontype.value)) {
		iconType = domicontype.value
		iconValue = undefined

		if (iconType === 'url') {
			iconValue = iconUrl
		}

		if (iconType === 'file' && iconFile) {
			iconValue = iconFile.name
		}

		if (iconType === 'file' && !iconFile) {
			iconType = 'file'
			iconValue = undefined
		}
	}

	// Step: Send data to link update

	quickLinks(undefined, {
		updateLink: {
			id: id,
			title: document.querySelector<HTMLInputElement>('#e-title')?.value ?? '',
			url: document.querySelector<HTMLInputElement>('#e-url')?.value,
			hotkey: document.querySelector<HTMLInputElement>('#e-hotkey')?.value ?? '',
			icon: {
				type: iconType,
				value: iconValue,
			},
			file: iconFile,
		},
	})

	closeContextMenu()
}
