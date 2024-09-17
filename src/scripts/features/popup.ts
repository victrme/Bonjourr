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

const ANNOUNCEMENT_URL = 'https://ko-fi.com/post/Bonjour-20-the-miscellaneous-update-L4L5127P2S'
const ANNOUNCEMENT_VERSION = '20.0.0'

const ANNOUNCEMENT_TRNS = {
	en: '<b>Bonjourr just got a major update! ✨</b> Discover the new quick links features, fancy analog clocks and much more. ',
	fr: 'Dans cette mise à jour : Groupes et liens "Les plus visités", style d\'horloge analogique, et plus... disponible sur iOS !',
	de: 'In diesem Update: Gruppen und "Meistbesuchte" Links, Analoguhr-Styling und mehr... verfügbar auf iOS!',
	it: 'In questo aggiornamento: Gruppi e link "Più visitati", stile orologio analogico e altro... disponibile su iOS!',
	es: 'En esta actualización: Grupos y enlaces "Más visitados", estilo de reloj analógico y más... ¡disponible en iOS!',
	'pt-BR': 'Nesta atualização: Grupos e links "Mais visitados", estilo de relógio analógico e mais... disponível no iOS!',
	'pt-PT': 'Nesta atualização: Grupos e ligações "Mais visitadas", estilo de relógio analógico e mais... disponível no iOS!',
	nl: 'In deze update: Groepen en "Meest bezochte" links, analoge klokstijl en meer... beschikbaar op iOS!',
	da: 'I denne opdatering: Grupper og "Mest besøgte" links, analog ur-styling og mere... tilgængelig på iOS!',
	sv: 'I denna uppdatering: Grupper och "Mest besökta" länkar, analog klocka-styling och mer... tillgängligt på iOS!',
	nb: 'I denne oppdateringen: Grupper og "Mest besøkte" lenker, analog klokkestil og mer... tilgjengelig på iOS!',
	fi: 'Tässä päivityksessä: Ryhmät ja "Eniten vieraillut" linkit, analogisen kellon tyyli ja muuta... saatavilla iOS:lle!',
	pl: 'W tej aktualizacji: Grupy i linki "Najczęściej odwiedzane", styl zegara analogowego i więcej... dostępne na iOS!',
	cs: 'V této aktualizaci: Skupiny a odkazy "Nejnavštěvovanější", styl analogových hodin a další... k dispozici na iOS!',
	sk: 'V tejto aktualizácii: Skupiny a odkazy "Najnavštevovanejšie", štýl analógových hodín a ďalšie... dostupné na iOS!',
	hu: 'Ebben a frissítésben: Csoportok és "Leggyakrabban látogatott" linkek, analóg óra stílus és még több... elérhető iOS-en!',
	ro: 'În această actualizare: Grupuri și linkuri "Cele mai vizitate", stilizare ceas analogic și mai multe... disponibil pe iOS!',
	el: 'Σε αυτήν την ενημέρωση: Ομάδες και σύνδεσμοι "Πιο επισκέψιμοι", στυλ αναλογικού ρολογιού και άλλα... διαθέσιμα στο iOS!',
	sr: 'У овом ажурирању: Групе и везе "Најпосећеније", стил аналогног сата и још тога... доступно на iOS-у!',
	'sr-YU': 'U ovom ažuriranju: Grupe i veze "Najposećenije", stil analognog sata i još toga... dostupno na iOS-u!',
	uk: 'У цьому оновленні: Групи та посилання "Найбільш відвідувані", стиль аналогового годинника та інше... доступно на iOS!',
	ru: 'В этом обновлении: Группы и ссылки "Часто посещаемые", стиль аналоговых часов и многое другое... доступно на iOS!',
	tr: 'Bu güncellemede: Gruplar ve "En çok ziyaret edilen" bağlantılar, analog saat stili ve daha fazlası... iOS\'ta mevcut!',
	ar: 'في هذا التحديث: المجموعات وروابط "الأكثر زيارة"، وتصميم الساعة التناظرية، والمزيد... متاح على نظام iOS!',
	fa: 'در این به‌روزرسانی: گروه‌ها و پیوندهای "پربازدیدترین"، سبک ساعت آنالوگ و موارد دیگر... در دسترس برای iOS!',
	'zh-CN': '本次更新：群组和"最常访问"链接、模拟时钟样式等...适用于iOS！',
	'zh-HK': '本次更新：群組和「最常瀏覽」連結、類比時鐘樣式等...適用於iOS！',
	ja: 'このアップデート：グループと「よく訪れるサイト」リンク、アナログ時計のスタイリング、その他... iOSで利用可能！',
	id: 'Dalam pembaruan ini: Grup dan tautan "Paling sering dikunjungi", gaya jam analog, dan lainnya... tersedia di iOS!',
	vi: 'Trong bản cập nhật này: Nhóm và liên kết "Được truy cập nhiều nhất", kiểu đồng hồ kim và hơn thế nữa... có sẵn trên iOS!',
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
