import { getLang, tradThis } from '../utils/translations.ts'
import { BROWSER } from '../defaults.ts'
import { storage } from '../storage.ts'

import type { Sync } from '../../types/sync.ts'

type PopupInit = {
	old?: string
	new: string
	review: number
	announce: Sync['announcements']
}

type PopupUpdate = {
	announcements?: string
}

const ANNOUNCEMENT_URL = 'https://github.com/victrme/Bonjourr/releases/tag/v21.0.0'
const ANNOUNCEMENT_VERSION = '21.0.0'

const ANNOUNCEMENT_TRNS = {
	en: '<b>Bonjourr just got a major update! ✨</b> Learn all about the new features: video backgrounds, texture overlays, background search and more.',
	fr: "<b>Version 20.4 ✨</b> Nouvelle notification pour les supporters, améliorations de la synchronisation Gist et petites corrections d'interaction !",
	de: '<b>Version 20.4 ✨</b> Neue Unterstützer-Benachrichtigung, Gist-Synchronisationsverbesserungen und kleine Interaktionskorrekturen!',
	it: '<b>Versione 20.4 ✨</b> Nuova notifica per i sostenitori, miglioramenti alla sincronizzazione Gist e piccole correzioni di interazione!',
	es: '<b>¡Actualización mayor de Bonjourr! ✨</b> Mira todas las nuevas características: videos como fondo, superposición de texturas, búsqueda de fondo y más.',
	'pt-BR':
		'<b>Versão 20.4 ✨</b> Nova notificação de apoiadores, melhorias na sincronização do Gist e pequenas correções de interação!',
	'pt-PT':
		'<b>Versão 20.4 ✨</b> Nova notificação de apoiantes, melhorias na sincronização do Gist e pequenas correções de interação!',
	nl: '<b>Versie 20.4 ✨</b> Nieuwe ondersteuners-notificatie, Gist-synchronisatie verbeteringen en kleine interactie-fixes!',
	da: '<b>Version 20.4 ✨</b> Ny supporter-notifikation, Gist-synkroniseringsforbedringer og små interaktionsrettelser!',
	sv: '<b>Version 20.4 ✨</b> Ny supporternotifikation, förbättringar av Gist-synkronisering och små interaktionskorrigeringar!',
	nb: '<b>Versjon 20.4 ✨</b> Ny støttespiller-varsling, Gist-synkroniseringsforbedringer og små interaksjonsforbedringer!',
	fi: '<b>Versio 20.4 ✨</b> Uusi tukijoiden ilmoitus, Gist-synkronoinnin parannuksia ja pieniä vuorovaikutuskorjauksia!',
	pl: '<b>Wersja 20.4 ✨</b> Nowe powiadomienie dla wspierających, ulepszenia synchronizacji Gist i drobne poprawki interakcji!',
	cs: '<b>Verze 20.4 ✨</b> Nové oznámení pro podporovatele, vylepšení synchronizace Gist a drobné opravy interakcí!',
	hr: '<b>Verzija 20.4 ✨</b> Nova obavijest za podržavatelje, poboljšanja Gist sinkronizacije i male popravke interakcije!',
	sk: '<b>Verzia 20.4 ✨</b> Nové upozornenie pre podporovateľov, vylepšenia synchronizácie Gist a drobné opravy interakcií!',
	hu: '<b>20.4 verzió ✨</b> Új támogatói értesítés, Gist szinkronizációs fejlesztések és apró interakciós javítások!',
	ro: '<b>Versiunea 20.4 ✨</b> Notificare nouă pentru susținători, îmbunătățiri la sincronizarea Gist și mici corecții de interacțiune!',
	el: '<b>Έκδοση 20.4 ✨</b> Νέα ειδοποίηση υποστηρικτών, βελτιώσεις συγχρονισμού Gist και μικρές διορθώσεις αλληλεπίδρασης!',
	hy: '<b>Տարբերակ 20.4 ✨</b> Աջակիցների նոր ծանուցում, Gist սինքրոնացման բարելավումներ և փոքր փոխազդեցության ուղղումներ!',
	sr: '<b>Верзија 20.4 ✨</b> Ново обавештење за подржаваоце, побољшања Gist синхронизације и мале исправке интеракције!',
	'sr-YU':
		'<b>Verzija 20.4 ✨</b> Novo obaveštenje za podržavaoce, poboljšanja Gist sinhronizacije i male ispravke interakcije!',
	uk: '<b>Версія 20.4 ✨</b> Нове сповіщення для прихильників, покращення синхронізації Gist та дрібні виправлення взаємодії!',
	ru: '<b>Версия 20.4 ✨</b> Новое уведомление для поддерживающих, улучшения синхронизации Gist и мелкие исправления взаимодействия!',
	tr: '<b>Sürüm 20.4 ✨</b> Yeni destekçi bildirimi, Gist senkronizasyon iyileştirmeleri ve küçük etkileşim düzeltmeleri!',
	ar: '<b>الإصدار 20.4 ✨</b> إشعار جديد للداعمين، تحسينات مزامنة Gist وإصلاحات صغيرة للتفاعل!',
	fa: '<b>نسخه 20.4 ✨</b> اعلان جدید برای حامیان، بهبود همگام‌سازی Gist و اصلاحات کوچک تعاملی!',
	'zh-CN': '<b>版本 20.4 ✨</b> 新的支持者通知、Gist同步改进和小互动修复！',
	'zh-HK': '<b>版本 20.4 ✨</b> 新的支持者通知、Gist同步改進和小互動修復！',
	'zh-TW': '<b>版本 20.4 ✨</b> 新的支持者通知、Gist同步改進和小互動修復！',
	ja: '<b>バージョン 20.4 ✨</b> 新しいサポーター通知、Gist同期の改善、および小さな対話の修正！',
	id: '<b>Versi 20.4 ✨</b> Notifikasi pendukung baru, peningkatan sinkronisasi Gist dan perbaikan interaksi kecil!',
	ca: "<b>Versió 20.4 ✨</b> Nova notificació per a seguidors, millores en la sincronització de Gist i petites correccions d'interacció!",
	vi: '<b>Phiên bản 20.4 ✨</b> Thông báo người ủng hộ mới, cải tiến đồng bộ hóa Gist và sửa lỗi tương tác nhỏ!',
}

const REVIEW_TEXT = 'Love using Bonjourr? Consider giving us a review or donating, that would help a lot! 😇'
const REVIEW_URLS = {
	chrome:
		'https://chrome.google.com/webstore/detail/bonjourr-%C2%B7-minimalist-lig/dlnejlppicbjfcfcedcflplfjajinajd/reviews',
	opera:
		'https://chrome.google.com/webstore/detail/bonjourr-%C2%B7-minimalist-lig/dlnejlppicbjfcfcedcflplfjajinajd/reviews',
	firefox: 'https://addons.mozilla.org/en-US/firefox/addon/bonjourr-startpage/',
	safari: 'https://apps.apple.com/fr/app/bonjourr-startpage/id1615431236',
	edge: 'https://microsoftedge.microsoft.com/addons/detail/bonjourr/dehmmlejmefjphdeoagelkpaoolicmid',
	other: 'https://bonjourr.fr/help#%EF%B8%8F-reviews',
}

export function interfacePopup(init?: PopupInit, event?: PopupUpdate) {
	if (isAnnouncement(event?.announcements)) {
		storage.sync.set({ announcements: event?.announcements })
		return
	}

	// Announcements

	if (!init || init?.announce === 'off') {
		return
	}

	if (init.old && (init.review === -1 || init.review > 30)) {
		const major = (s: string) => Number.parseInt(s.split('.')[0])
		const isMajorUpdate = major(init.new) > major(init.old)
		const isNewVersion = init.new !== init.old && init.new === ANNOUNCEMENT_VERSION

		const announceMajor = init.announce === 'major' && isMajorUpdate
		const announceAny = init.announce === 'all' && isNewVersion
		const canAnnounce = localStorage.hasUpdated === 'true' || announceAny || announceMajor

		if (canAnnounce) {
			localStorage.hasUpdated = 'true'
			displayPopup('announce', true)
			return
		}
	}

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

function displayPopup(type: 'review' | 'announce', showIcon = false) {
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
		const lang = getLang() as keyof typeof ANNOUNCEMENT_TRNS
		const description = ANNOUNCEMENT_TRNS[lang] ?? ANNOUNCEMENT_TRNS.en
		const buttontext = `${tradThis('Read the blog post')} 📝`
		desc.innerHTML = description
		buttons.appendChild(createPopupButton(ANNOUNCEMENT_URL, buttontext))
	}

	close?.addEventListener('click', closePopup)
	document.body.appendChild(popup)
	popup.classList.add(type)
	popup.classList.toggle('withIcon', showIcon)
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
	setTimeout(() => document.getElementById('credit-container')?.setAttribute('style', 'opacity: 0'), 400)
}

function closePopup() {
	setTimeout(() => document.getElementById('popup')?.remove(), 200)
	setTimeout(() => document.getElementById('credit-container')?.removeAttribute('style'), 600)
	document.getElementById('popup')?.classList.remove('shown')
	removePopupTrigger()
}

function isAnnouncement(str = ''): str is Sync['announcements'] {
	return ['all', 'major', 'off'].includes(str)
}
