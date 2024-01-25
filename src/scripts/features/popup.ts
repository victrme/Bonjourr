import { BROWSER, ANNOUNCEMENT } from '../defaults'
import { tradThis } from '../utils/translations'
import storage from '../storage'

const LOVE_BONJOURR = 'Love using Bonjourr? Consider giving us a review or donating, that would help a lot! 😇'

const REVIEW_URLS = {
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
		displayPopup('love')
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

function displayPopup(type: 'love' | 'announce') {
	const popup = document.getElementById('popup')
	const desc = document.getElementById('popup_desc') as HTMLElement
	const anchors = document.querySelectorAll<HTMLAnchorElement>('#popup a')
	const text = type === 'love' ? LOVE_BONJOURR : ANNOUNCEMENT

	popup?.classList.remove('love', 'announce')
	popup?.classList.add(type)

	desc.textContent = tradThis(text)

	document.getElementById('popup_review')?.setAttribute('href', REVIEW_URLS[BROWSER])
	document.getElementById('popup_')?.addEventListener('click', closePopup)

	anchors.forEach((anchor) =>
		anchor?.addEventListener('pointerdown', function () {
			storage.sync.set({ reviewPopup: 'removed' })
		})
	)

	setTimeout(() => popup?.classList.add('shown'), 800)
	setTimeout(() => document.getElementById('creditContainer')?.classList.remove('shown'), 400)
}

function closePopup() {
	const popup = document.getElementById('popup')

	popup?.classList.remove('shown')
	setTimeout(() => popup?.remove(), 2000)
	setTimeout(() => document.getElementById('creditContainer')?.classList.add('shown'), 600)

	storage.sync.set({ reviewPopup: 'removed' })
}

function isAnnounce(s: string): s is Sync.Storage['announcements'] {
	return ['off', 'all', 'major'].includes(s)
}
