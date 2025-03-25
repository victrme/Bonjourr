import { getLiFromEvent, getLinksInFolder } from './helpers'
import { initblocks } from './index'

import { transitioner } from '../../utils/transitioner'
import { tradThis } from '../../utils/translations'
import { storage } from '../../storage'

const domlinkblocks = document.getElementById('linkblocks') as HTMLUListElement

queueMicrotask(() => {
	document.addEventListener('close-folder', closeFolder)
})

export async function folderClick(event: MouseEvent) {
	const li = getLiFromEvent(event)
	const rightClick = event.button === 2
	const inFolder = li?.classList.contains('link-folder')
	const isSelectAll = domlinkblocks.className.includes('select-all')

	if (!(li && inFolder) || rightClick || isSelectAll) {
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

function openFolder(data: Sync.Storage, li: HTMLLIElement): void {
	if (!li.parentNode) {
		return
	}

	const linkgroup = li.parentNode.parentNode as HTMLElement
	const linktitle = linkgroup.querySelector<HTMLButtonElement>('.link-title')
	const folder = data[li.id] as Links.Folder

	const transition = transitioner()
	transition.first(hide)
	transition.after(changeToFolder)
	transition.finally(show)
	transition.transition(40)

	function hide() {
		linkgroup.dataset.folder = li?.id
		linkgroup.classList.add('hiding')
		linkgroup.classList.remove('in-folder')
	}

	function changeToFolder() {
		initblocks(data)

		if (linktitle) {
			linktitle.textContent = folder?.title || tradThis('Folder')
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
	const transition = transitioner()
	transition.first(hide)
	transition.after(changeToTab)
	transition.finally(show)
	transition.transition(40)

	function hide() {
		const folders = document.querySelectorAll<HTMLDivElement>('.link-group.in-folder')

		for (const group of folders) {
			group.classList.add('hiding')
			group.dataset.folder = ''
		}
	}

	async function changeToTab() {
		domlinkblocks.classList.toggle('with-groups', data.linkgroups.on)
		await initblocks(data)
	}

	function show() {
		const groups = document.querySelectorAll<HTMLDivElement>('.link-group')

		for (const group of groups) {
			group.classList.remove('in-folder')
			group.classList.remove('hiding')
		}
	}
}

function openAllLinks(data: Sync.Storage, li: HTMLLIElement) {
	const linksInFolder = getLinksInFolder(data, li.id)

	for (const link of linksInFolder) {
		window.open(link.url, '_blank')?.focus()
	}

	window.open(window.location.href, '_blank')?.focus()
	window.close()
}
