import { getSelectedIds, getLink, getDefaultIcon, createTitle } from './helpers'
import { IS_MOBILE, SYSTEM_OS } from '../../defaults'
import { stringMaxSize } from '../../utils'
import { linksUpdate } from '.'
import onSettingsLoad from '../../utils/onsettingsload'
import transitioner from '../../utils/transitioner'
import storage from '../../storage'

const domlinkblocks = document.getElementById('linkblocks') as HTMLDivElement
const domeditlink = document.getElementById('editlink') as HTMLDialogElement

//
// Display
//

export default async function displayEditDialog(event: Event) {
	if (event.type === 'keyup' && (event as KeyboardEvent).code !== 'KeyE') {
		return
	}

	document.dispatchEvent(new Event('stop-select-all'))
	event.preventDefault()

	const domtitle = document.getElementById('e_title') as HTMLInputElement
	const domurl = document.getElementById('e_url') as HTMLInputElement
	const domiconurl = document.getElementById('e_iconurl') as HTMLInputElement
	const selected = document.querySelectorAll('#linkblocks li.selected')
	const isSelectAll = domlinkblocks.classList.contains('select-all')
	const isInFolder = domlinkblocks.classList.contains('in-folder')

	if ((isSelectAll && selected.length === 0) || domlinkblocks.classList.contains('dragging')) {
		return
	}

	const path = event.composedPath() as Element[]
	const pathLis = path.filter((el) => el.tagName === 'LI')
	const isTab = !isInFolder && path.some((node) => node.id === 'link-title')
	const isTabOnly = path[0].id === 'link-title'
	const li = pathLis[0]
	const id = li?.id

	const data = await storage.sync.get(id)
	const link = getLink(data, id)

	domeditlink?.classList.toggle('add-link', !isTab && !link)
	domeditlink?.classList.toggle('select-all', isSelectAll)
	domeditlink?.classList.toggle('update-link', !!link && !isSelectAll)
	domeditlink?.classList.toggle('folder', !!link?.folder)
	domeditlink?.classList.toggle('in-folder', isInFolder)
	domeditlink?.classList.toggle('tab-item', isTab && !isTabOnly)
	domeditlink?.classList.toggle('tabs', isTab)

	const contextmenuTransition = transitioner()
	contextmenuTransition.first(() => domeditlink?.show())
	contextmenuTransition.then(async () => domeditlink?.classList?.add('shown'))
	contextmenuTransition.transition(10)

	const { x, y } = newEditDialogPosition(event)
	domeditlink.style.transform = `translate(${Math.floor(x)}px, ${Math.floor(y)}px)`

	if (isTab) {
		// BAD: flaky parentElement, easy to break
		const div = path[0].tagName === 'INPUT' ? path[0].parentElement : path[0]
		const divList = [...document.querySelectorAll<HTMLDivElement>('#link-title div')]
		const index = divList.findIndex((node) => node === div)
		domeditlink.dataset.tabIndex = index.toString()
	}

	if (!link) {
		domtitle.value = ''
		domurl.value = ''
		return
	}

	domtitle.value = link.title

	if (!link.folder) {
		domurl.value = link.url
		domiconurl.value = link.icon ?? ''
	}

	li?.classList.add('selected')
}

function newEditDialogPosition(event: Event): { x: number; y: number } {
	const editRects = domeditlink.getBoundingClientRect()
	const { innerHeight, innerWidth } = window

	let x = 0
	let y = 0

	if (event.type === 'touchstart') {
		return { x, y }
	}
	//
	else if (event.type === 'contextmenu' || event.type === 'click') {
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

//
// Events
//

onSettingsLoad(() => {
	document.addEventListener('close-edit', closeEditDialog)
	document.getElementById('editlink-form')?.addEventListener('submit', submitChanges)
	document.getElementById('b_add-link')?.addEventListener('click', displayEditDialog)
	domlinkblocks?.addEventListener('contextmenu', displayEditDialog)

	if (SYSTEM_OS === 'ios' || !IS_MOBILE) {
		window.addEventListener('resize', closeEditDialog)
	}
})

async function submitChanges(event: SubmitEvent) {
	switch (event.submitter?.id) {
		case 'e_inputs':
			applyLinkChanges('inputs')
			break

		case 'e_submit':
			applyLinkChanges('button')
			break

		case 'e_delete':
			deleteSelection()
			break

		case 'e_addlink':
			addLinkFromEditDialog()
			break

		case 'e_folder-add':
			addSelectionToNewFolder()
			break

		case 'e_folder-remove':
			removeSelectionFromFolder()
			break

		case 'e_tab-add':
			addTab()
			break

		case 'e_tab-remove':
			removeTab()
			break
	}

	event.preventDefault()
}

async function applyLinkChanges(origin: 'inputs' | 'button') {
	const id = getSelectedIds()[0]
	const li = document.querySelector<HTMLLIElement>(`#${id}`)
	const inputs = document.querySelectorAll<HTMLInputElement>('#editlink input')

	if (!id && domeditlink.classList.contains('add-link')) {
		addLinkFromEditDialog()
		return
	}

	if (!id || !li) {
		return
	}

	if (origin === 'inputs') {
		inputs.forEach((node) => node.blur())
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

	if (!link.folder) {
		if (icon.dom) {
			link.icon = icon.val ? stringMaxSize(icon.val, 7500) : undefined
			icon.dom.src = link.icon ?? getDefaultIcon(link.url)
		}

		if (title.dom && url.dom && url.val !== undefined) {
			link.url = stringMaxSize(url.val, 512)
			url.dom.href = link.url
			title.dom.textContent = createTitle(link)
		}
	}

	storage.sync.set({ [id]: link })
}

function addTab() {
	linksUpdate({ addTab: true })
	closeEditDialog()
}

function removeTab() {
	linksUpdate({ removeTab: parseInt(domeditlink.dataset.tabIndex ?? '0') })
	closeEditDialog()
}

function addLinkFromEditDialog() {
	linksUpdate({ addLink: true })
	closeEditDialog()
}

function addSelectionToNewFolder() {
	linksUpdate({ addFolder: getSelectedIds() })
	document.dispatchEvent(new Event('remove-select-all'))
	closeEditDialog()
}

function deleteSelection() {
	linksUpdate({ deleteLinks: getSelectedIds() })
	closeEditDialog()
}

function removeSelectionFromFolder() {
	linksUpdate({ removeFromFolder: getSelectedIds() })
	document.dispatchEvent(new Event('remove-select-all'))
	closeEditDialog()
}

function closeEditDialog() {
	if (domeditlink.open) {
		document.querySelectorAll('.block.selected').forEach((block) => block?.classList.remove('selected'))
		domeditlink.removeAttribute('data-tab-index')
		domeditlink.classList.remove('shown')
		domeditlink.close()
	}
}
