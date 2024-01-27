import { BROWSER, ANNOUNCEMENT } from '../defaults'
import { tradThis } from '../utils/translations'
import storage from '../storage'

type PopupInit = {
	old?: string
	new: string
	review: number
	announce: Sync.Storage['announcements']
}

type PopupUpdate = {
	announcements?: string
}

const LOVE_BONJOURR = 'Love using Bonjourr? Consider giving us a review or donating, that would help a lot! 😇'

const REVIEW_URLS = {
	chrome: 'https://chrome.google.com/webstore/detail/bonjourr-%C2%B7-minimalist-lig/dlnejlppicbjfcfcedcflplfjajinajd/reviews',
	firefox: 'https://addons.mozilla.org/en-US/firefox/addon/bonjourr-startpage/',
	safari: 'https://apps.apple.com/fr/app/bonjourr-startpage/id1615431236',
	edge: 'https://microsoftedge.microsoft.com/addons/detail/bonjourr/dehmmlejmefjphdeoagelkpaoolicmid',
	other: 'https://bonjourr.fr/help#%EF%B8%8F-reviews',
}

export default function interfacePopup(init?: PopupInit, event?: PopupUpdate) {
	if (event?.announcements) {
		storage.sync.set({ announcements: event?.announcements })
		return
	}

	if (!init) {
		return
	}

	if (init?.announce !== 'off' && init.old) {
		const major = (s: string) => parseInt(s.split('.')[0])
		const isMajorUpdate = major(init.new) > major(init.old)
		const isNewVersion = init.new !== init.old

		const announceMajor = init.announce === 'major' && isMajorUpdate
		const announceAny = init.announce === 'all' && isNewVersion
		const canAnnounce = localStorage.hasUpdated === 'true' || announceAny || announceMajor

		if (canAnnounce && ANNOUNCEMENT) {
			localStorage.hasUpdated = 'true'
			displayPopup('announce')
			return
		}
	}

	if (init.review > 0) {
		if (init.review > 30) {
			displayPopup('love')
			storage.sync.set({ review: -1 })
		} else {
			storage.sync.set({ review: init.review + 1 })
		}
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
	document.getElementById('popup_close')?.addEventListener('click', closePopup)
	anchors.forEach((anchor) => anchor?.addEventListener('pointerdown', removePopupTrigger))

	setTimeout(() => popup?.classList.add('shown'), 800)
	setTimeout(() => document.getElementById('creditContainer')?.classList.remove('shown'), 400)
}

function removePopupTrigger() {
	storage.sync.set({ review: -1 })
	localStorage.removeItem('hasUpdated')
}

function closePopup() {
	const popup = document.getElementById('popup')

	removePopupTrigger()
	popup?.classList.remove('shown')
	setTimeout(() => popup?.remove(), 200)
	setTimeout(() => document.getElementById('creditContainer')?.classList.add('shown'), 600)
}
