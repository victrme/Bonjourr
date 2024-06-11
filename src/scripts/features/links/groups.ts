import { getLinksInGroup } from './helpers'
import { initblocks } from '.'
import openEditDialog from './edit'
import { tradThis } from '../../utils/translations'
import transitioner from '../../utils/transitioner'
import startDrag from './drag'
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
	const { groups, pinned, synced, selected } = linkgroups

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
		button.classList.toggle('selected-group', group === selected)
		button.classList.toggle('synced', synced.includes(group))

		if (isTopSite) {
			button.textContent = tradThis('Most visited')
			button.classList.add('topsites-title')
		}

		if (isDefault) {
			button.textContent = tradThis('Default group')
		}

		if (isAddMore) {
			button.classList.add('add-group')
			button.addEventListener('click', openEditDialog)
		} else {
			button.addEventListener('click', changeGroup)
			button.addEventListener('pointerdown', startDrag)
		}

		document.querySelector('#link-mini')?.appendChild(button)
	}

	domlinkblocks?.classList.toggle('with-groups', linkgroups.on)
}

function changeGroup(event: Event) {
	const button = event.currentTarget as HTMLButtonElement
	const transition = transitioner()

	if (!!domlinkblocks.dataset.folderid || button.classList.contains('selected-group')) {
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

		buttons?.forEach((div) => div.classList.remove('selected-group'))
		button.classList.add('selected-group')
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

export function toggleGroups(on: boolean, data: Sync.Storage): Sync.Storage {
	domlinkblocks?.classList.toggle('with-groups', on)
	data.linkgroups.on = on
	return data
}

export function changeGroupTitle(title: { old: string; new: string }, data: Sync.Storage): Sync.Storage {
	const index = data.linkgroups.groups.indexOf(title.old)

	for (const link of getLinksInGroup(data, title.old)) {
		data[link._id] = {
			...link,
			parent: title.new,
		}
	}

	data.linkgroups.groups[index] = title.new
	data.linkgroups.selected = title.new
	initGroups(data)
	return data
}

export function addGroup(groups: { title: string; sync?: boolean }[], data: Sync.Storage): Sync.Storage {
	for (let { title, sync } of groups) {
		const isReserved = title === '' || title === '+'
		const isAlreadyUsed = data.linkgroups.groups.includes(title)

		if (isReserved || isAlreadyUsed) {
			return data
		}

		for (const link of getLinksInGroup(data, '+')) {
			data[link._id] = {
				...link,
				parent: title,
			}
		}

		data.linkgroups.selected = title
		data.linkgroups.groups.push(title)

		if (sync) {
			data.linkgroups.synced.push(title)
		}
	}

	initGroups(data)
	initblocks(data)
	return data
}

export function deleteGroup(group: string, data: Sync.Storage): Sync.Storage {
	const { groups, pinned, synced, selected } = data.linkgroups

	const isBroken = groups.indexOf(group) === -1
	const isMinimum = groups.length === 1

	if (isMinimum || isBroken) {
		return data
	}

	for (const link of getLinksInGroup(data, group)) {
		delete data[link._id]
	}

	data.linkgroups.selected = group === selected || pinned.includes(group) ? groups[0] : selected
	data.linkgroups.pinned = pinned.filter((p) => p !== group)
	data.linkgroups.synced = synced.filter((g) => g !== group)
	data.linkgroups.groups = groups.filter((g) => g !== group)

	storage.sync.clear()
	initblocks(data)
	initGroups(data)
	return data
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
