import { tradThis } from '../utils/translations'
import { BROWSER } from '../defaults'
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

const ANNOUNCEMENT_TEXT = 'Bonjourr just got a major update! Learn more about the new quick links features and more in our update post. ✨'
const ANNOUNCEMENT_URL = 'https://ko-fi.com/post/Bonjourr-19-A0A6UMTY1'
const ANNOUNCEMENT_VERSION = '19.0.0'

const REVIEW_TEXT = 'Love using Bonjourr? Consider giving us a review or donating, that would help a lot! 😇'
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

	//
	// Announcements

	if (!init || init?.announce === 'off') {
		return
	}

	if (init.old && (init.review === -1 || init.review > 30)) {
		const major = (s: string) => parseInt(s.split('.')[0])
		const isMajorUpdate = major(init.new) > major(init.old)
		const isNewVersion = init.new !== init.old && init.new === ANNOUNCEMENT_VERSION

		const announceMajor = init.announce === 'major' && isMajorUpdate
		const announceAny = init.announce === 'all' && isNewVersion
		const canAnnounce = localStorage.hasUpdated === 'true' || announceAny || announceMajor

		if (canAnnounce) {
			localStorage.hasUpdated = 'true'
			displayPopup('announce')
			return
		}
	}

	//
	// Reviews

	if (init.review === -1) {
		return
	}

	if (init.review > 30) {
		displayPopup('review')
	} else {
		storage.sync.set({ review: init.review + 1 })
	}
}

function displayPopup(type: 'review' | 'announce') {
	const template = document.getElementById('popup-template') as HTMLTemplateElement
	const doc = document.importNode(template.content, true)
	const popup = doc.getElementById('popup')
	const desc = doc.getElementById('popup_desc') as HTMLElement
	const close = doc.getElementById('popup_close') as HTMLElement
	const buttons = doc.getElementById('popup_buttons') as HTMLElement

	if (!popup) {
		return
	}

	if (type === 'review') {
		desc.textContent = tradThis(REVIEW_TEXT)
		buttons.appendChild(createPopupButton(REVIEW_URLS[BROWSER], tradThis('Review')))
		buttons.appendChild(createPopupButton('https://ko-fi.com/bonjourr', tradThis('Donate')))
	}

	if (type === 'announce') {
		desc.textContent = tradThis(ANNOUNCEMENT_TEXT)
		buttons.appendChild(createPopupButton(ANNOUNCEMENT_URL, tradThis('Read the blog post')))
	}

	close?.addEventListener('click', closePopup)
	document.body.appendChild(popup)
	popup.classList.add(type)
	openPopup()
}

function createPopupButton(href: string, text: string): HTMLAnchorElement {
	const anchor = document.createElement('a')

	anchor.href = href
	anchor.rel = 'noreferrer'
	anchor.textContent = text
	anchor.addEventListener('pointerdown', removePopupTrigger)

	return anchor
}

//

function removePopupTrigger() {
	storage.sync.set({ review: -1 })
	localStorage.removeItem('hasUpdated')
}

function openPopup() {
	setTimeout(() => document.getElementById('popup')?.classList.add('shown'), 800)
	setTimeout(() => document.getElementById('creditContainer')?.setAttribute('style', 'opacity: 0'), 400)
}

function closePopup() {
	setTimeout(() => document.getElementById('popup')?.remove(), 200)
	setTimeout(() => document.getElementById('creditContainer')?.removeAttribute('style'), 600)
	document.getElementById('popup')?.classList.remove('shown')
	removePopupTrigger()
}
