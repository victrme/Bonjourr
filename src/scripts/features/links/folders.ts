import { getLiFromEvent, getLinksInFolder } from './helpers'
import { initblocks } from '.'
import transitioner from '../../utils/transitioner'
import { tradThis } from '../../utils/translations'
import storage from '../../storage'

const domlinkblocks = document.getElementById('linkblocks') as HTMLUListElement

queueMicrotask(() => {
	document.addEventListener('close-folder', closeFolder)
})

export async function folderClick(event: MouseEvent) {
	const li = getLiFromEvent(event)
	const rightClick = event.button === 2
	const inFolder = li?.classList.contains('folder')
	const isSelectAll = domlinkblocks.className.includes('select-all')

	if (!li || !inFolder || rightClick || isSelectAll) {
		return
	}

	document.dispatchEvent(new Event('stop-select-all'))

	const data = await storage.sync.get()
	const ctrlClick = event.button === 0 && (event.ctrlKey || event.metaKey)
	const middleClick = event.button === 1

	if (ctrlClick || middleClick) {
		openAllLinks(data, li)
	} else {
		openFolder(data, li)
	}
}

async function openFolder(data: Sync.Storage, li: HTMLLIElement) {
	const folderOpenTransition = transitioner()
	const linkgroup = li.parentNode!.parentNode as HTMLElement
	const linktitle = linkgroup.querySelector<HTMLButtonElement>('.link-title')
	const folder = data[li.id] as Links.Folder
	const isLastGroup = linkgroup.nextElementSibling?.id === 'link-mini'

	folderOpenTransition.first(hide)
	folderOpenTransition.then(changeToFolder)
	folderOpenTransition.finally(show)
	folderOpenTransition.transition(200)

	function hide() {
		linkgroup.dataset.folder = li?.id
		linkgroup.classList.add('hiding')
		linkgroup.classList.remove('in-folder')
	}

	async function changeToFolder() {
		await initblocks(data)

		if (linktitle) {
			linktitle.textContent = folder?.title || tradThis('Folder')
		}

		if (isLastGroup) {
			domlinkblocks.classList.remove('with-tabs')
		}
	}

	function show() {
		linkgroup.classList.replace('hiding', 'in-folder')
	}
}

async function closeFolder() {
	if (document.querySelector('.link-group.dropping')) {
		return
	}

	const data = await storage.sync.get()
	const folderCloseTransition = transitioner()

	folderCloseTransition.first(hide)
	folderCloseTransition.then(changeToTab)
	folderCloseTransition.finally(show)
	folderCloseTransition.transition(200)

	function hide() {
		document.querySelectorAll<HTMLDivElement>('.link-group')?.forEach((group) => {
			group.classList.add('hiding')
			group.dataset.folder = ''
		})
	}

	async function changeToTab() {
		domlinkblocks.classList.toggle('with-tabs', data.linktabs.active)
		await initblocks(data)
	}

	function show() {
		document.querySelectorAll<HTMLDivElement>('.link-group')?.forEach((group) => {
			group.classList.remove('in-folder')
			group.classList.remove('hiding')
		})
	}
}

function openAllLinks(data: Sync.Storage, li: HTMLLIElement) {
	const links = getLinksInFolder(data, li.id)

	links.forEach((link) => window.open(link.url, '_blank')?.focus())
	window.open(window.location.href, '_blank')?.focus()
	window.close()
}
