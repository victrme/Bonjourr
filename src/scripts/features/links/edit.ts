import { getSelectedIds, isFolder, getLink, getDefaultIcon, createTitle } from './helpers'
import { IS_MOBILE, SYSTEM_OS } from '../../defaults'
import { stringMaxSize } from '../../utils'
import { linksUpdate } from '.'
import onSettingsLoad from '../../utils/onsettingsload'
import storage from '../../storage'

let editmousedown: boolean = false
const domlinkblocks = document.getElementById('linkblocks') as HTMLDivElement
const domeditlink = document.getElementById('editlink') as HTMLDivElement

export default async function displayEditDialog(event: Event) {
	document.body.dispatchEvent(new Event('stop-select-all'))
	event.preventDefault()

	const domtitle = document.getElementById('e_title') as HTMLInputElement
	const domurl = document.getElementById('e_url') as HTMLInputElement
	const domiconurl = document.getElementById('e_iconurl') as HTMLInputElement
	const selected = document.querySelectorAll('#linkblocks li.selected')
	const isSelectAll = domlinkblocks.classList.contains('select-all')

	if (isSelectAll && selected.length === 0) {
		return
	}

	if (domlinkblocks.classList.contains('dragging')) {
		return
	}

	const path = event.composedPath() as Element[]
	const pathLis = path.filter((el) => el.tagName === 'LI')
	const li = pathLis[0]
	const id = li?.id

	const data = await storage.sync.get(id)
	const link = getLink(data, id)

	domeditlink?.classList.toggle('add-link', !link)
	domeditlink?.classList.toggle('select-all', isSelectAll)
	domeditlink?.classList.toggle('update-link', !!link && !isSelectAll)
	domeditlink?.classList.toggle('folder', link ? isFolder(link) : false)
	domeditlink?.classList.toggle('in-folder', domlinkblocks.classList.contains('in-folder'))

	domeditlink.classList.add('showing')
	await new Promise((sleep) => setTimeout(sleep))

	const { x, y } = newEditDialogPosition(event)
	domeditlink.style.transform = `translate(${Math.floor(x)}px, ${Math.floor(y)}px)`
	domeditlink?.classList.replace('showing', 'shown')

	if (!link) {
		domtitle.value = ''
		domurl.value = ''
		return
	}

	domtitle.value = link.title

	if (isFolder(link) === false) {
		domurl.value = link.url
		domiconurl.value = link.icon ?? ''
	}

	li?.classList.add('selected')

	// Focusing on touch opens virtual keyboard without user action, not good
	if (IS_MOBILE === false) {
		domtitle.focus()
	}
}

onSettingsLoad(() => {
	document.getElementById('e_title')?.addEventListener('change', submitLinksChange)
	document.getElementById('e_url')?.addEventListener('change', submitLinksChange)
	document.getElementById('e_iconurl')?.addEventListener('change', submitLinksChange)
	document.getElementById('e_delete')?.addEventListener('click', deleteSelection)
	document.getElementById('e_submit')?.addEventListener('click', submitLinksChange)
	document.getElementById('e_add-link')?.addEventListener('click', addLinkFromEditDialog)
	document.getElementById('e_folder-add')?.addEventListener('click', addSelectionToNewFolder)
	document.getElementById('e_folder-remove')?.addEventListener('click', removeSelectionFromFolder)

	domlinkblocks?.addEventListener('contextmenu', displayEditDialog)
	domeditlink.addEventListener('mousedown', () => (editmousedown = true))

	document.body.addEventListener('click', function () {
		if (editmousedown) {
			editmousedown = false
			return
		}

		closeEditDialog()
	})

	if (SYSTEM_OS === 'ios' || !IS_MOBILE) {
		window.addEventListener('resize', closeEditDialog)
	}
})

function newEditDialogPosition(event: Event): { x: number; y: number } {
	const editRects = domeditlink.getBoundingClientRect()
	const { innerHeight, innerWidth } = window

	let x = 0
	let y = 0

	if (event.type === 'touchstart') {
		return { x, y }
	}
	//
	else if (event.type === 'contextmenu') {
		x = (event as PointerEvent).x + 20
		y = (event as PointerEvent).y + 20
	}
	//
	else if (event.type === 'keyup' && (event as KeyboardEvent)?.key === 'e') {
		x = (event.target as HTMLElement).offsetLeft
		y = (event.target as HTMLElement).offsetTop
	}

	const w = editRects.width + 30
	const h = editRects.height + 30

	if (x + w > innerWidth) x -= x + w - innerWidth
	if (y + h > innerHeight) y -= h

	return { x, y }
}

async function submitLinksChange(event: Event) {
	const id = getSelectedIds()[0]
	const target = event.target as HTMLElement
	const li = document.querySelector<HTMLLIElement>(`#${id}`)

	if (!id && domeditlink.classList.contains('add-link')) {
		addLinkFromEditDialog()
		return
	}

	if (!id || !li) {
		return
	}

	if (target.tagName === 'INPUT') {
		target.blur()
	} else {
		closeEditDialog()
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

	if (isFolder(link) === false) {
		if (icon.dom) {
			link.icon = icon.val ? stringMaxSize(icon.val, 7500) : undefined
			icon.dom.src = link.icon ?? getDefaultIcon(link.url)
		}

		if (title.dom && url.dom && url.val !== undefined) {
			link.url = stringMaxSize(url.val, 512)
			url.dom.href = link.url
			title.dom.textContent = createTitle(link.title, link.url)
		}
	}

	storage.sync.set({ [id]: link })
}

function addLinkFromEditDialog() {
	linksUpdate({ addLink: true })
	closeEditDialog()
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
	closeEditDialog()
}

function deleteSelection() {
	const ids = getSelectedIds()

	animateLinksRemove(ids)
	deleteLinks(ids)
	closeEditDialog()
}

function removeSelectionFromFolder() {
	const ids = getSelectedIds()

	removeLinksFromFolder(ids)
	animateLinksRemove(ids)
	closeEditDialog()

	domlinkblocks?.classList.remove('select-all')
}

async function deleteLinks(ids: string[]) {
	let data = await storage.sync.get()
	const tab = data.tabslist[data.linktabs ?? 0]
	const folderId = domlinkblocks.dataset.folderid
	const currentlyInFolder = !!folderId

	for (const id of ids) {
		const toRemove = data[id] as Links.Link

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
		data.tabslist[data.linktabs ?? 0] = tab
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
	const tab = data.tabslist[data.linktabs ?? 0]
	const folderid = domlinkblocks.dataset.folderid

	if (folderid) {
		const folder = data[folderid] as Links.Folder

		for (const id of ids) {
			folder.ids = folder.ids.filter((linkid) => linkid !== id)
		}

		data[folderid] = folder
		data.tabslist[data.linktabs ?? 0] = tab

		storage.sync.set(data)
	}
}

function closeEditDialog() {
	const domedit = document.querySelector('#editlink')
	if (!domedit || !domedit.classList.contains('shown')) return

	domedit?.classList.add('hiding')
	document.querySelectorAll('.block.selected').forEach((block) => block?.classList.remove('selected'))
	setTimeout(() => {
		domedit ? domedit.setAttribute('class', '') : ''
	}, 200)
}

function animateLinksRemove(ids: string[]) {
	for (const id of ids) {
		document.getElementById(id)?.classList.add('removed')
		setTimeout(() => document.getElementById(id)?.remove(), 600)
	}
}

function removeFromList(arr: string[], id: string): string[] {
	return arr.filter((item) => item !== id)
}
