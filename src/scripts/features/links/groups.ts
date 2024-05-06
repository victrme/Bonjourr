import { getLinksInGroup } from './helpers'
import { initblocks } from '.'
import { tradThis } from '../../utils/translations'
import transitioner from '../../utils/transitioner'
import storage from '../../storage'

const domlinkblocks = document.getElementById('linkblocks') as HTMLDivElement

export function initGroups(data: Sync.Storage, init?: true) {
	if (!init) {
		document.querySelectorAll('#link-mini button')?.forEach((node) => {
			node.remove()
		})
	}

	createGroups(data.linkgroups)
}

function createGroups(linkgroups: Sync.LinkGroups) {
	const { groups, pinned, selected } = linkgroups

	for (const group of [...groups, '+']) {
		const button = document.createElement('button')
		const isTopSite = group === 'topsites'
		const isDefault = group === ''
		const isAddMore = group === '+'

		if (pinned.includes(group)) {
			continue
		}

		button.textContent = group
		button.dataset.group = group
		button.classList.add('link-title')
		button.classList.toggle('selected', group === selected)
		button.addEventListener('click', changeGroup)

		if (isTopSite) {
			button.textContent = tradThis('Most visited')
			button.classList.add('topsites-title')
		}

		if (isDefault) {
			button.textContent = tradThis('Default group')
		}

		if (isAddMore) {
			button.classList.add('add-group')
		}

		document.querySelector('#link-mini')?.appendChild(button)
	}

	domlinkblocks?.classList.toggle('with-groups', linkgroups.on)
}

function changeGroup(event: Event) {
	const button = event.currentTarget as HTMLButtonElement
	const transition = transitioner()

	if (!!domlinkblocks.dataset.folderid || button.classList.contains('selected')) {
		return
	}

	transition.first(hideCurrentGroup)
	transition.then(recreateLinksFromNewGroup)
	transition.finally(showNewGroup)
	transition.transition(100)

	async function recreateLinksFromNewGroup() {
		const buttons = document.querySelectorAll<HTMLElement>('#link-mini button')
		const data = await storage.sync.get()
		const group = button.dataset.group ?? data.linkgroups.groups[0]

		buttons?.forEach((div) => div.classList.remove('selected'))
		button.classList.add('selected')
		data.linkgroups.selected = group
		storage.sync.set(data)
		await initblocks(data)
	}

	function hideCurrentGroup() {
		domlinkblocks.classList.remove('in-folder')
		domlinkblocks.classList.add('hiding')
	}

	function showNewGroup() {
		domlinkblocks.classList.remove('hiding')
	}
}

// Updates

export async function toggleGroups(on: boolean) {
	const data = await storage.sync.get('linkgroups')

	data.linkgroups.on = on
	storage.sync.set({ linkgroups: data.linkgroups })

	domlinkblocks?.classList.toggle('with-groups', on)
}

export async function changeGroupTitle(title: { old: string; new: string }) {
	const data = await storage.sync.get('linkgroups')
	const index = data.linkgroups.groups.indexOf(title.old)

	data.linkgroups.groups[index] = title.new
	storage.sync.set({ linkgroups: data.linkgroups })
	initGroups(data)
}

export async function addGroup(title = '', isFromTopSites?: true) {
	const data = await storage.sync.get('linkgroups')

	const isReserved = title === '' || title === '+' || title === 'topsites'
	const isAlreadyUsed = data.linkgroups.groups.includes(title)

	if (!isFromTopSites && (isReserved || isAlreadyUsed)) {
		return
	}

	if (isFromTopSites) {
		title = 'topsites'
		setTimeout(() => document.querySelector<HTMLElement>('.topsites-title')?.click())
	}

	data.linkgroups.groups.push(title)
	storage.sync.set({ linkgroups: data.linkgroups })

	initGroups(data)
}

export async function deleteGroup(group: string, isFromTopSites?: true) {
	const data = await storage.sync.get()
	const { groups, selected, pinned } = data.linkgroups

	const isBroken = groups.indexOf(group) === -1
	const isMinimum = groups.length === (groups.includes('topsites') ? 2 : 1)

	if (isMinimum || isBroken || isFromTopSites) {
		return
	}

	//

	for (const link of getLinksInGroup(data, group)) {
		delete data[link._id]
	}

	data.linkgroups.pinned = pinned.filter((p) => p !== group)
	data.linkgroups.groups = groups.filter((g) => g !== group)
	data.linkgroups.selected = group === selected ? groups[0] : group

	initblocks(data)
	initGroups(data)

	storage.sync.clear()
	storage.sync.set(data)
}

export async function togglePinGroup(group: string, action: 'pin' | 'unpin') {
	const data = await storage.sync.get()
	const { groups, pinned } = data.linkgroups

	if (action === 'pin') data.linkgroups.pinned.push(group)
	if (action === 'unpin') data.linkgroups.pinned = pinned.filter((pinned) => pinned !== group)

	if (group === data.linkgroups.selected) {
		data.linkgroups.selected = groups[0]
	}

	storage.sync.set(data)

	initblocks(data)
	initGroups(data)
}
