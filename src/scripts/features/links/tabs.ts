import { initblocks, linksUpdate } from '.'
import { tradThis } from '../../utils/translations'
import transitioner from '../../utils/transitioner'
import storage from '../../storage'

const domlinkblocks = document.getElementById('linkblocks') as HTMLDivElement

export default function initTabs(data: Sync.Storage) {
	document.querySelectorAll('#link-mini button')?.forEach((node) => node.remove())
	domlinkblocks?.classList.toggle('with-tabs', data.linktabs.active)

	const { titles, selected } = data.linktabs

	titles.forEach((title, i) => {
		const button = document.createElement('button')
		const isDefault = title === ''
		const isTopSite = title === 'topsites'

		button.textContent = title
		button.className = `link-title${i === selected ? ' selected' : ''}`
		button.addEventListener('click', changeTab)

		if (isTopSite) {
			button.textContent = tradThis('Most visited')
			button.classList.add('topsites-title')
		}

		if (isDefault) {
			button.textContent = tradThis('Default page')
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
