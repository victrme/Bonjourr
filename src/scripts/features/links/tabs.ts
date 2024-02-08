import { initblocks, linksUpdate } from '.'
import { tradThis } from '../../utils/translations'
import transitioner from '../../utils/transitioner'
import storage from '../../storage'

const domlinkblocks = document.getElementById('linkblocks') as HTMLDivElement
const getTitleButtons = () => document.querySelectorAll<HTMLElement>('#tab-title button')

export default function initTabs(data: Sync.Storage) {
	const defaultTabTitle = document.getElementById('default-tab-title') as HTMLElement
	const buttons = [...getTitleButtons()]

	for (let ii = 1; ii < buttons.length; ii++) {
		buttons[ii].remove()
	}

	for (let ii = 1; ii < data.linktabs.titles.length; ii++) {
		appendNewTab(data.linktabs.titles[ii], ii === (data.linktabs.selected ?? 0))
	}

	defaultTabTitle.textContent = data.linktabs.titles[0] || tradThis('Default page')
	defaultTabTitle.classList.toggle('selected', data.linktabs.selected === 0)
	defaultTabTitle?.addEventListener('click', changeTab)

	domlinkblocks?.classList.toggle('with-tabs', data.linktabs.active)
}

function appendNewTab(title: string, selected?: boolean): void {
	const tabtitle = document.getElementById('tab-title')
	const button = document.createElement('button')
	const defaultTabName = `${tradThis('Page')} ${tabtitle?.childElementCount}`

	button.textContent = title || defaultTabName
	button.classList.toggle('selected', selected)
	button?.addEventListener('click', changeTab)

	tabtitle?.appendChild(button)
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
		const buttons = [...getTitleButtons()]
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
