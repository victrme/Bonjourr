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

const ANNOUNCEMENT_URL = 'https://ko-fi.com/post/Bonjourr-21-the-background-update-R6R61FLG0Z'
const ANNOUNCEMENT_VERSION = '21.0.0'

const ANNOUNCEMENT_TRNS = {
	en: '<b>Bonjourr just got a major update! ✨</b> Learn all about the new features: video backgrounds, texture overlays, background search and more.',
	fr: "<b>Bonjourr vient d'avoir une mise à jour majeure ! ✨</b> Découvrez les nouvelles fonctionnalités: arrière-plans vidéo, superpositions de textures, recherche d'arrière-plan et bien plus encore.",
	de: '<b>Bonjourr hat gerade ein großes Update erhalten! ✨</b> Erfahren Sie alles über die neuen Funktionen: Videohintergründe, Textur-Overlays, Hintergrundsuche und vieles mehr.',
	it: '<b>Bonjourr ha appena ricevuto un aggiornamento importante! ✨</b> Scopri tutte le nuove funzionalità: sfondi video, sovrapposizioni di texture, ricerca di sfondi e altro ancora.',
	es: '<b>¡Bonjourr acaba de recibir una actualización importante! ✨</b> Mira todas las nuevas características: fondos de video, superposición de texturas, búsqueda de fondos y mucho más.',
	'pt-BR':
		'<b>Bonjourr acabou de receber uma grande atualização! ✨</b> Saiba tudo sobre os novos recursos: planos de fundo em vídeo, sobreposições de textura, pesquisa de plano de fundo e muito mais.',
	'pt-PT':
		'<b>Bonjourr acaba de receber uma grande atualização! ✨</b> Saiba tudo sobre as novas funcionalidades: fundos de vídeo, sobreposições de textura, pesquisa de fundo e muito mais.',
	nl: '<b>Bonjourr heeft zojuist een grote update gekregen! ✨</b> Leer alles over de nieuwe functies: video-achtergronden, textuur-overlays, achtergrond zoeken en meer.',
	da: '<b>Bonjourr har lige fået en større opdatering! ✨</b> Lær alt om de nye funktioner: videobaggrunde, teksturoverlays, baggrundssøgning og meget mere.',
	sv: '<b>Bonjourr har precis fått en stor uppdatering! ✨</b> Läs allt om de nya funktionerna: videobakgrunder, texturöverlägg, bakgrundssökning och mycket mer.',
	nb: '<b>Bonjourr har nettopp fått en stor oppdatering! ✨</b> Lær alt om de nye funksjonene: videobakgrunner, teksturoverlegg, bakgrunnssøk og mer.',
	fi: '<b>Bonjourr sai juuri suuren päivityksen! ✨</b> Lue kaikki uusista ominaisuuksista: videotaustat, tekstuuripeittokuvat, taustahaku ja paljon muuta.',
	pl: '<b>Bonjourr właśnie otrzymał dużą aktualizację! ✨</b> Dowiedz się wszystkiego o nowych funkcjach: teł wideo, nakładkach tekstur, wyszukiwaniu tła i wielu innych.',
	cs: '<b>Bonjourr právě obdržel velkou aktualizaci! ✨</b> Zjistěte vše o nových funkcích: video pozadí, texturové překryvy, vyhledávání pozadí a další.',
	hr: '<b>Bonjourr je upravo dobio veliko ažuriranje! ✨</b> Saznajte sve o novim značajkama: video pozadinama, prekrivanjima tekstura, pretraživanju pozadine i još mnogo toga.',
	sk: '<b>Bonjourr práve dostal veľkú aktualizáciu! ✨</b> Zistite všetko o nových funkciách: video pozadia, prekrytia textúr, vyhľadávanie pozadia a oveľa viac.',
	hu: '<b>A Bonjourr most kapott egy nagy frissítést! ✨</b> Tudjon meg mindent az új funkciókról: videó hátterek, textúra fedvények, háttérkeresés és még sok más.',
	ro: '<b>Bonjourr tocmai a primit o actualizare majoră! ✨</b> Aflați totul despre noile funcții: fundaluri video, suprapuneri de texturi, căutare de fundal și multe altele.',
	el: '<b>Το Bonjourr μόλις έλαβε μια μεγάλη ενημέρωση! ✨</b> Μάθετε τα πάντα για τις νέες λειτουργίες: φόντα βίντεο, επικαλύψεις υφών, αναζήτηση φόντου και πολλά άλλα.',
	hy: '<b>Bonjourr-ը հենց նոր ստացավ մեծ թարմացում: ✨</b> Իմացեք ամեն ինչ նոր հնարավորությունների մասին՝ տեսանյութերի ֆոներ, տեքստուրային ծածկույթներ, ֆոնի որոնում և այլն։',
	sr: '<b>Bonjourr је управо добио велико ажурирање! ✨</b> Сазнајте све о новим функцијама: видео позадинама, текстурним преклапањима, претрази позадине и још много тога.',
	'sr-YU':
		'<b>Bonjourr je upravo dobio veliko ažuriranje! ✨</b> Saznajte sve o novim funkcijama: video pozadinama, teksturnim preklapanjima, pretrazi pozadine i još mnogo toga.',
	uk: '<b>Bonjourr щойно отримав велике оновлення! ✨</b> Дізнайтеся все про нові функції: відеофони, накладання текстур, пошук фону та багато іншого.',
	ru: '<b>Bonjourr только что получил крупное обновление! ✨</b> Узнайте все о новых функциях: видеофоны, наложения текстур, поиск фона и многое другое.',
	tr: '<b>Bonjourr büyük bir güncelleme aldı! ✨</b> Yeni özellikler hakkında her şeyi öğrenin: video arka planları, doku kaplamaları, arka plan araması ve daha fazlasını.',
	ar: '<b>تلقى Bonjourr للتو تحديثًا كبيرًا! ✨</b> تعرف على جميع الميزات الجديدة: خلفيات الفيديو، وتراكبات النسيج، والبحث عن الخلفيات والمزيد.',
	fa: '<b>Bonjourr به تازگی یک بروزرسانی بزرگ دریافت کرده است! ✨</b> همه چیز را در مورد ویژگی‌های جدید بیاموزید: پس‌زمینه‌های ویدیویی، پوشش‌های بافت، جستجوی پس‌زمینه و موارد دیگر.',
	'zh-CN': '<b>Bonjourr 刚刚获得了重大更新！✨</b> 了解所有新功能：视频背景、纹理叠加、背景搜索等等。',
	'zh-HK': '<b>Bonjourr 剛剛獲得了重大更新！✨</b> 了解所有新功能：影片背景、紋理疊加、背景搜尋等等。',
	'zh-TW': '<b>Bonjourr 剛剛獲得了重大更新！✨</b> 瞭解所有新功能：影片背景、紋理疊加、背景搜尋等等。',
	ja: '<b>Bonjourr が大幅なアップデートを行いました！✨</b> 新機能についてすべて学びましょう：動画背景、テクスチャオーバーレイ、背景検索など。',
	id: '<b>Bonjourr baru saja mendapatkan pembaruan besar! ✨</b> Pelajari semua tentang fitur baru: latar belakang video, overlay tekstur, pencarian latar belakang, dan lainnya.',
	ca: '<b>Bonjourr acaba de rebre una actualització important! ✨</b> Descobreix totes les noves funcionalitats: fons de vídeo, superposicions de textures, cerca de fons i molt més.',
	vi: '<b>Bonjourr vừa nhận được một bản cập nhật lớn! ✨</b> Tìm hiểu tất cả về các tính năng mới: hình nền video, lớp phủ họa tiết, tìm kiếm hình nền và nhiều hơn nữa.',
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
