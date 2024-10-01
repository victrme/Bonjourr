import { getLang, tradThis } from '../utils/translations'
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

const ANNOUNCEMENT_URL = 'https://github.com/victrme/Bonjourr/releases/tag/v20.1.2'
const ANNOUNCEMENT_VERSION = '20.1.2'

const ANNOUNCEMENT_TRNS = {
	en: '<b>Version 20 fixes (bis):</b> All links are now working as normal !',
	// fr: '<b>Bonjourr vient de recevoir une mise à jour majeure ! ✨</b> Découvrez les nouvelles fonctionnalités de liens rapides, des horloges analogiques élégantes et bien plus encore. ',
	// de: '<b>Bonjourr hat ein großes Update erhalten! ✨</b> Entdecken Sie die neuen Schnellverknüpfungsfunktionen, stilvolle Analoguhren und vieles mehr. ',
	// it: '<b>Bonjourr ha appena ricevuto un grande aggiornamento! ✨</b> Scopri le nuove funzionalità di collegamenti rapidi, eleganti orologi analogici e molto altro. ',
	// es: '<b>¡Bonjourr acaba de recibir una gran actualización! ✨</b> Descubre las nuevas funciones de enlaces rápidos, relojes analógicos elegantes y mucho más. ',
	// 'pt-BR': '<b>Bonjourr acabou de receber uma grande atualização! ✨</b> Descubra os novos recursos de links rápidos, relógios analógicos elegantes e muito mais. ',
	// 'pt-PT': '<b>Bonjourr acabou de receber uma grande atualização! ✨</b> Descubra as novas funcionalidades de ligações rápidas, relógios analógicos elegantes e muito mais. ',
	// nl: '<b>Bonjourr heeft zojuist een grote update gekregen! ✨</b> Ontdek de nieuwe snelkoppelingsfuncties, stijlvolle analoge klokken en nog veel meer. ',
	// da: '<b>Bonjourr har lige fået en stor opdatering! ✨</b> Udforsk de nye hurtiglinksfunktioner, smarte analoge ure og meget mere. ',
	// sv: '<b>Bonjourr har precis fått en stor uppdatering! ✨</b> Upptäck de nya snabblänksfunktionerna, snygga analoga klockor och mycket mer. ',
	// nb: '<b>Bonjourr har akkurat fått en stor oppdatering! ✨</b> Oppdag de nye funksjonene for hurtigkoblinger, stilige analoge klokker og mye mer. ',
	// fi: '<b>Bonjourr sai juuri suuren päivityksen! ✨</b> Tutustu uusiin pikalinkkiominaisuuksiin, tyylikkäisiin analogisiin kelloihin ja paljon muuhun. ',
	// pl: '<b>Bonjourr właśnie otrzymało dużą aktualizację! ✨</b> Odkryj nowe funkcje szybkich linków, eleganckie zegary analogowe i wiele więcej. ',
	// cs: '<b>Bonjourr právě dostalo velkou aktualizaci! ✨</b> Objevte nové funkce rychlých odkazů, stylové analogové hodiny a mnohem více. ',
	// sk: '<b>Bonjourr práve dostalo veľkú aktualizáciu! ✨</b> Objavte nové funkcie rýchlych odkazov, štýlové analógové hodiny a oveľa viac. ',
	// hu: '<b>A Bonjourr most kapott egy nagy frissítést! ✨</b> Fedezd fel az új gyorshivatkozás funkciókat, elegáns analóg órákat és még sok mást. ',
	// ro: '<b>Bonjourr tocmai a primit o actualizare majoră! ✨</b> Descoperiți noile funcționalități de linkuri rapide, ceasuri analogice elegante și multe altele. ',
	// el: '<b>Το Bonjourr μόλις έλαβε μια σημαντική ενημέρωση! ✨</b> Ανακαλύψτε τις νέες λειτουργίες γρήγορων συνδέσμων, τα κομψά αναλογικά ρολόγια και πολλά άλλα. ',
	// sr: '<b>Bonjourr је управо добио велико ажурирање! ✨</b> Откријте нове функције брзих веза, стилске аналогне сатове и још много тога. ',
	// 'sr-YU': '<b>Bonjourr je upravo dobio veliko ažuriranje! ✨</b> Otkrijte nove funkcije brzih veza, stilske analogne satove i još mnogo toga. ',
	// uk: '<b>Bonjourr щойно отримав велике оновлення! ✨</b> Відкрийте для себе нові функції швидких посилань, стильні аналогові годинники та багато іншого. ',
	// ru: '<b>Bonjourr только что получил большое обновление! ✨</b> Откройте новые функции быстрых ссылок, стильные аналоговые часы и многое другое. ',
	// tr: '<b>Bonjourr büyük bir güncelleme aldı! ✨</b> Yeni hızlı bağlantı özelliklerini, şık analog saatleri ve çok daha fazlasını keşfedin. ',
	// ar: '<b>حصل Bonjourr على تحديث رئيسي! ✨</b> اكتشف الميزات الجديدة للروابط السريعة، والساعات التناظرية الأنيقة والمزيد. ',
	// fa: '<b>Bonjourr به‌روزرسانی بزرگی دریافت کرد! ✨</b> ویژگی‌های جدید پیوندهای سریع، ساعت‌های آنالوگ شیک و موارد دیگر را کشف کنید. ',
	// 'zh-CN': '<b>Bonjourr 刚刚进行了重大更新！✨</b> 发现全新的快速链接功能、精美的模拟时钟等更多内容。',
	// 'zh-HK': '<b>Bonjourr 剛剛進行了重大更新！✨</b> 發現全新的快速連結功能、精美的模擬時鐘等更多內容。',
	// ja: '<b>Bonjourrに大きなアップデートがありました！✨</b> 新しいクイックリンク機能、スタイリッシュなアナログ時計などをお楽しみください。',
	// id: '<b>Bonjourr baru saja mendapatkan pembaruan besar! ✨</b> Temukan fitur tautan cepat baru, jam analog yang keren, dan banyak lagi. ',
	// vi: '<b>Bonjourr vừa nhận được bản cập nhật lớn! ✨</b> Khám phá các tính năng liên kết nhanh mới, đồng hồ kim thời trang và nhiều hơn nữa. ',
	// hy: '<b>Bonjourr-ը հենց նոր մեծ թարմացում ստացավ! ✨</b> Բացահայտեք նոր արագ հղումների ֆունկցիաները, նրբագեղ անալոգ ժամացույցները և ավելին։ ',
	// ca: '<b>Bonjourr acaba de rebre una gran actualització! ✨</b> Descobreix les noves funcionalitats d\'enllaços ràpids, rellotges analògics elegants i molt més. ',
}

const REVIEW_TEXT = 'Love using Bonjourr? Consider giving us a review or donating, that would help a lot! 😇'
const REVIEW_URLS = {
	chrome: 'https://chrome.google.com/webstore/detail/bonjourr-%C2%B7-minimalist-lig/dlnejlppicbjfcfcedcflplfjajinajd/reviews',
	opera: 'https://chrome.google.com/webstore/detail/bonjourr-%C2%B7-minimalist-lig/dlnejlppicbjfcfcedcflplfjajinajd/reviews',
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
		const lang = getLang() as keyof typeof ANNOUNCEMENT_TRNS
		const description = ANNOUNCEMENT_TRNS[lang] ?? ANNOUNCEMENT_TRNS.en
		const buttontext = tradThis('Read the release notes') + ' 📝'
		desc.innerHTML = description
		buttons.appendChild(createPopupButton(ANNOUNCEMENT_URL, buttontext))
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
	setTimeout(() => document.getElementById('credit-container')?.setAttribute('style', 'opacity: 0'), 400)
}

function closePopup() {
	setTimeout(() => document.getElementById('popup')?.remove(), 200)
	setTimeout(() => document.getElementById('credit-container')?.removeAttribute('style'), 600)
	document.getElementById('popup')?.classList.remove('shown')
	removePopupTrigger()
}
