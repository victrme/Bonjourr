import { initblocks, linksUpdate } from '.'
import { tradThis } from '../../utils/translations'
import transitioner from '../../utils/transitioner'
import storage from '../../storage'

const domlinkblocks = document.getElementById('linkblocks') as HTMLDivElement
const b_addtab = document.getElementById('b_add-tab')

export default function initTabs(data: Sync.Storage) {
	const divs = document.querySelectorAll<HTMLElement>('#link-title div')

	b_addtab?.addEventListener('click', () => linksUpdate({ addTab: true }))
	divs.forEach((node) => node.remove())

	data.linktabs.titles.forEach((title, i) => {
		appendNewTab(title, i === (data.linktabs.selected ?? 0))
	})

	domlinkblocks?.classList.toggle('with-tabs', data.linktabs.active)
}

function appendNewTab(title: string, selected?: boolean): void {
	const linktitle = document.getElementById('link-title')
	const input = document.createElement('input')
	const div = document.createElement('div')

	input.ariaLabel = tradThis('Change link group title')
	input.placeholder = tradThis('tab')
	input.maxLength = 32
	input.value = title
	input.style.width = input.value.length + 'ch'

	div.tabIndex = 0
	div.classList.toggle('selected', selected)

	input?.addEventListener('change', function () {
		linksUpdate({ groupTitle: this.value })
		this.blur()
	})

	div?.addEventListener('click', function () {
		changeTab(div)
	})

	input.addEventListener('input', function () {
		this.style.width = this.value.length + 'ch'
	})

	div.appendChild(input)
	linktitle?.insertBefore(div, b_addtab)
}

function changeTab(div: HTMLDivElement) {
	if (!!domlinkblocks.dataset.folderid || div.classList.contains('selected')) {
		return
	}

	const tabTransition = transitioner()

	tabTransition.first(hideCurrentTab)
	tabTransition.then(recreateLinksFromNewTab)
	tabTransition.finally(showNewTab)
	tabTransition.transition(100)

	async function recreateLinksFromNewTab() {
		const divs = Object.values(document.querySelectorAll('#link-title div'))
		const data = await storage.sync.get()

		divs?.forEach((div) => div.classList.remove('selected'))
		div.classList.add('selected')
		data.linktabs.selected = divs.indexOf(div)
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
