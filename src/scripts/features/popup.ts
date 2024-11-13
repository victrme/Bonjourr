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

const ANNOUNCEMENT_URL = 'https://github.com/victrme/Bonjourr/releases/tag/v20.2.0'
const ANNOUNCEMENT_VERSION = '20.2.0'

const ANNOUNCEMENT_TRNS = {
	en: '<b>Version 20.2 ✨</b> Added Chinese and Stoic quotes, improved translations and weather stability, and plenty of bug fixes!',
	fr: '<b>Version 20.2 ✨</b> Ajout de citations chinoises et stoïques, amélioration des traductions et de la stabilité météo, et nombreuses corrections de bugs !',
	de: '<b>Version 20.2 ✨</b> Chinesische und stoische Zitate hinzugefügt, verbesserte Übersetzungen und Wetterstabilität, sowie viele Fehlerbehebungen!',
	it: '<b>Versione 20.2 ✨</b> Aggiunte citazioni cinesi e stoiche, migliorate le traduzioni e la stabilità del meteo, e numerose correzioni di bug!',
	es: '<b>Versión 20.2 ✨</b> ¡Agregadas citas chinas y estoicas, mejoras en las traducciones y la estabilidad del clima, y muchas correcciones de errores!',
	'pt-BR':
		'<b>Versão 20.2 ✨</b> Adicionadas citações chinesas e estoicas, melhorias nas traduções e na estabilidade do clima, e muitas correções de bugs!',
	'pt-PT':
		'<b>Versão 20.2 ✨</b> Adicionadas citações chinesas e estoicas, melhorias nas traduções e na estabilidade meteorológica, e várias correções de erros!',
	nl: '<b>Versie 20.2 ✨</b> Chinese en stoïsche citaten toegevoegd, verbeterde vertalingen en weerstabiliteit, en veel bugfixes!',
	da: '<b>Version 20.2 ✨</b> Tilføjet kinesiske og stoiske citater, forbedrede oversættelser og vejrstabilitet, og mange fejlrettelser!',
	sv: '<b>Version 20.2 ✨</b> Lagt till kinesiska och stoiska citat, förbättrade översättningar och väderstabilitet, och många buggfixar!',
	nb: '<b>Versjon 20.2 ✨</b> Lagt til kinesiske og stoiske sitater, forbedret oversettelser og værstabilitet, og mange feilrettinger!',
	fi: '<b>Versio 20.2 ✨</b> Lisätty kiinalaisia ja stoalaisia lainauksia, paranneltu käännöksiä ja sään vakautta, sekä paljon vikakorjauksia!',
	pl: '<b>Wersja 20.2 ✨</b> Dodano cytaty chińskie i stoickie, ulepszono tłumaczenia i stabilność pogody, oraz mnóstwo poprawek błędów!',
	cs: '<b>Verze 20.2 ✨</b> Přidány čínské a stoické citáty, vylepšené překlady a stabilita počasí, a spousta oprav chyb!',
	hr: '<b>Verzija 20.2 ✨</b> Dodani kineski i stoički citati, poboljšani prijevodi i stabilnost vremenske prognoze, i mnoštvo ispravaka grešaka!',
	sk: '<b>Verzia 20.2 ✨</b> Pridané čínske a stoické citáty, vylepšené preklady a stabilita počasia, a množstvo opráv chýb!',
	hu: '<b>20.2-es verzió ✨</b> Kínai és sztoikus idézetek hozzáadása, fejlesztett fordítások és időjárás-stabilitás, valamint rengeteg hibajavítás!',
	ro: '<b>Versiunea 20.2 ✨</b> Adăugate citate chinezești și stoice, îmbunătățiri ale traducerilor și stabilității meteo, și numeroase remedieri de erori!',
	el: '<b>Έκδοση 20.2 ✨</b> Προστέθηκαν κινέζικα και στωικά αποφθέγματα, βελτιωμένες μεταφράσεις και σταθερότητα καιρού, και πολλές διορθώσεις σφαλμάτων!',
	hy: '<b>Տարբերակ 20.2 ✨</b> Ավելացվել են չինական և ստոիկյան մեջբերումներ, բարելավվել են թարգմանությունները և եղանակի կայունությունը, և բազմաթիվ սխալների ուղղումներ!',
	sr: '<b>Верзија 20.2 ✨</b> Додати кинески и стоички цитати, побољшани преводи и стабилност временске прогнозе, и много исправки грешака!',
	'sr-YU':
		'<b>Verzija 20.2 ✨</b> Dodati kineski i stoički citati, poboljšani prevodi i stabilnost vremenske prognoze, i mnogo ispravki grešaka!',
	uk: '<b>Версія 20.2 ✨</b> Додано китайські та стоїчні цитати, покращено переклади та стабільність погоди, та безліч виправлень помилок!',
	ru: '<b>Версия 20.2 ✨</b> Добавлены китайские и стоические цитаты, улучшены переводы и стабильность погоды, и множество исправлений ошибок!',
	tr: '<b>Sürüm 20.2 ✨</b> Çin ve Stoacı alıntılar eklendi, çeviriler ve hava durumu kararlılığı iyileştirildi, ve birçok hata düzeltmesi yapıldı!',
	ar: '<b>الإصدار 20.2 ✨</b> تمت إضافة اقتباسات صينية ورواقية، تحسينات في الترجمات واستقرار الطقس، والعديد من إصلاحات الأخطاء!',
	fa: '<b>نسخه 20.2 ✨</b> افزودن نقل‌قول‌های چینی و رواقی، بهبود ترجمه‌ها و ثبات آب و هوا، و اصلاح بسیاری از اشکالات!',
	'zh-CN': '<b>版本 20.2 ✨</b> 新增中国和斯多葛学派名言，改进翻译和天气稳定性，以及大量错误修复！',
	'zh-HK': '<b>版本 20.2 ✨</b> 新增中國和斯多葛學派名言，改進翻譯和天氣穩定性，以及大量錯誤修復！',
	'zh-TW': '<b>版本 20.2 ✨</b> 新增中國和斯多葛學派名言，改進翻譯和天氣穩定性，以及大量錯誤修復！',
	ja: '<b>バージョン20.2 ✨</b> 中国語とストア派の引用を追加、翻訳と天気の安定性を改善、そして多数のバグ修正！',
	id: '<b>Versi 20.2 ✨</b> Ditambahkan kutipan Cina dan Stoik, peningkatan terjemahan dan stabilitas cuaca, dan banyak perbaikan bug!',
	ca: "<b>Versió 20.2 ✨</b> Afegides citacions xineses i estoiques, millores en les traduccions i l'estabilitat meteorològica, i moltes correccions d'errors!",
	vi: '<b>Phiên bản 20.2 ✨</b> Đã thêm trích dẫn Trung Quốc và Khắc kỷ, cải thiện bản dịch và độ ổn định thời tiết, và nhiều sửa lỗi!',
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
