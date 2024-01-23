import { BROWSER } from '../defaults'
import storage from '../storage'
import { getHTMLTemplate } from '../utils'

const reviewURLs = {
	chrome: 'https://chrome.google.com/webstore/detail/bonjourr-%C2%B7-minimalist-lig/dlnejlppicbjfcfcedcflplfjajinajd/reviews',
	firefox: 'https://addons.mozilla.org/en-US/firefox/addon/bonjourr-startpage/',
	safari: 'https://apps.apple.com/fr/app/bonjourr-startpage/id1615431236',
	edge: 'https://microsoftedge.microsoft.com/addons/detail/bonjourr/dehmmlejmefjphdeoagelkpaoolicmid',
	other: 'https://bonjourr.fr/help#%EF%B8%8F-reviews',
}

export default function interfacePopup(review?: string | number, event?: { announce?: string }) {
	if (event?.announce) {
		const str = isAnnounce(event.announce) ? event.announce : 'major'
		storage.sync.set({ announce: str })
		return
	}

	if (typeof review === 'number' && review > 30) {
		displayPopup()
	}
	//
	else if (typeof review == 'number') {
		storage.sync.set({ reviewPopup: review + 1 })
	}
	//
	else if (review !== 'removed') {
		storage.sync.set({ reviewPopup: 0 })
	}
}

function displayPopup() {
	const popup = getHTMLTemplate<HTMLDivElement>('popup-template', 'div')
	document.body.appendChild(popup)

	document.getElementById('popup_review')?.setAttribute('href', reviewURLs[BROWSER])
	document.getElementById('popup_review')?.addEventListener('mousedown', closePopup)
	document.getElementById('popup_donate')?.addEventListener('mousedown', closePopup)
	document.getElementById('popup_text')?.addEventListener('click', closePopup)

	setTimeout(() => popup?.classList.add('shown'), 800)
	setTimeout(() => document.getElementById('creditContainer')?.classList.remove('shown'), 400)

	function closePopup(e: Event) {
		const isDesc = (e.target as HTMLElement)?.id === 'popup_text'

		if (isDesc) {
			popup?.classList.remove('shown')
			setTimeout(() => popup?.remove(), 200)
			setTimeout(() => document.getElementById('creditContainer')?.classList.add('shown'), 600)
		}

		storage.sync.set({ reviewPopup: 'removed' })
	}
}

function isAnnounce(s: string): s is Sync.Storage['announcements'] {
	return ['off', 'all', 'major'].includes(s)
}
