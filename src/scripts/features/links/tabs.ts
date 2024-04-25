import { initblocks } from '.'
import { getLinksInTab } from './helpers'
import { tradThis } from '../../utils/translations'
import transitioner from '../../utils/transitioner'
import storage from '../../storage'

const domlinkblocks = document.getElementById('linkblocks') as HTMLDivElement

export function initTabs(data: Sync.Storage) {
	document.querySelectorAll('#link-mini button')?.forEach((node) => node.remove())
	domlinkblocks?.classList.toggle('with-tabs', data.linktabs.active)

	const titles = [...data.linktabs.titles, '+']
	const selected = data.linktabs.selected

	titles.forEach((title, i) => {
		const button = document.createElement('button')
		const isTopSite = title === 'topsites'
		const isDefault = title === ''
		const isMore = title === '+'

		button.textContent = title
		button.className = `link-title${i === selected ? ' selected' : ''}`
		button.addEventListener('click', changeTab)

		if (isTopSite) {
			button.textContent = tradThis('Most visited')
			button.classList.add('topsites-title')
		}

		if (isDefault) {
			button.textContent = tradThis('Default group')
		}

		if (isMore) {
			button.classList.add('add-group')
		}

		document.querySelector('#link-mini')?.appendChild(button)
	})
}

function changeTab(event: Event) {
	const button = event.currentTarget as HTMLButtonElement
	const tabTransition = transitioner()

	if (!!domlinkblocks.dataset.folderid || button.classList.contains('selected')) {
		return
	}

	tabTransition.first(hideCurrentTab)
	tabTransition.then(recreateLinksFromNewTab)
	tabTransition.finally(showNewTab)
	tabTransition.transition(100)

	async function recreateLinksFromNewTab() {
		const buttons = [...document.querySelectorAll<HTMLElement>('#link-mini button')]
		const data = await storage.sync.get()

		buttons?.forEach((div) => div.classList.remove('selected'))
		button.classList.add('selected')
		data.linktabs.selected = buttons.indexOf(button)
		storage.sync.set(data)
		await initblocks(data)
	}

	function hideCurrentTab() {
		domlinkblocks.classList.remove('in-folder')
		domlinkblocks.classList.add('hiding')
	}

	function showNewTab() {
		domlinkblocks.classList.remove('hiding')
	}
}

// Updates

export async function toggleTabs(tab: boolean) {
	const data = await storage.sync.get('linktabs')

	data.linktabs.active = tab
	storage.sync.set({ linktabs: data.linktabs })

	domlinkblocks?.classList.toggle('with-tabs', tab)
}

export async function changeTabTitle(title: string, index: number) {
	const data = await storage.sync.get('linktabs')
	const hasTab = data.linktabs.titles.length >= index

	if (hasTab) {
		data.linktabs.titles[index] = title
		storage.sync.set({ linktabs: data.linktabs })
		initTabs(data)
	}
}

export async function addTab(title = '', isFromTopSites?: true) {
	const isReserved = title === '' || title === '+' || title === 'topsites'

	if (!isFromTopSites && isReserved) {
		return
	}

	if (isFromTopSites) {
		title = 'topsites'
	}

	const data = await storage.sync.get('linktabs')

	data.linktabs.titles.push(title)
	storage.sync.set({ linktabs: data.linktabs })

	initTabs(data)
	queueMicrotask(() => document.querySelector<HTMLElement>('.topsites-title')?.click())
}

export async function deleteTab(tab?: number | string, isFromTopSites?: true) {
	const data = await storage.sync.get()
	const { titles, selected } = data.linktabs
	let target = -1

	if (typeof tab === 'number') target = tab
	if (typeof tab === 'string') target = titles.indexOf(tab)

	const isBroken = target === -1
	const isMinimum = titles.filter((t) => t !== 'topsites').length === 1

	if (!isFromTopSites && (isMinimum || isBroken)) {
		return
	}

	//

	for (const link of getLinksInTab(data, target)) {
		delete data[link._id]
	}

	data.linktabs.titles = titles.toSpliced(target, 1)
	data.linktabs.selected -= target === selected ? 1 : 0
	initblocks(data)
	initTabs(data)

	storage.sync.clear()
	storage.sync.set(data)
}
