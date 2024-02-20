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
		const buttontext = ANNOUNCEMENT_BTN_TRNS[lang] ?? ANNOUNCEMENT_BTN_TRNS.en
		desc.textContent = description
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
	setTimeout(() => document.getElementById('creditContainer')?.setAttribute('style', 'opacity: 0'), 400)
}

function closePopup() {
	setTimeout(() => document.getElementById('popup')?.remove(), 200)
	setTimeout(() => document.getElementById('creditContainer')?.removeAttribute('style'), 600)
	document.getElementById('popup')?.classList.remove('shown')
	removePopupTrigger()
}

// Don't translate this guys, its ok
const ANNOUNCEMENT_TRNS = {
	en: 'Bonjourr just got a major update! Learn more about the new quick links features and more in our update post. ✨',
	fr: "Bonjourr vient d'être mit à jour! Découvrez les nouvelles fonctionnalités de liens rapides et plus dans notre post de mise à jour. ✨",
	sk: 'Bonjourr bol práve aktualizovaný! Pozrite si nové funkcie rýchleho prepojenia a ďalšie informácie v našom aktualizačnom príspevku. ✨',
	sv: 'Bonjourr har precis fått en stor uppdatering! Läs mer om de nya snabblänksfunktionerna och mer i vårt uppdateringsinlägg. ✨',
	pl: 'Bonjourr został właśnie zaktualizowany! Sprawdź nowe funkcje szybkiego łącza i nie tylko w naszym poście dotyczącym aktualizacji. ✨',
	pt_BR: 'O Bonjourr acaba de ser atualizado! Confira os novos recursos de links rápidos e muito mais em nossa postagem de atualização. ✨',
	pt_PT: 'O Bonjourr acaba de ser atualizado! Confira os novos recursos de link rápido e muito mais em nossa postagem de atualização. ✨',
	nl: 'Bonjourr heeft zojuist een grote update gekregen! Ontdek meer over de nieuwe functies voor snelle links en meer in ons updatebericht. ✨',
	ro: 'Bonjourr tocmai a fost actualizat! Descoperiți noile funcții de link rapid și multe altele în postarea noastră de actualizare. ✨',
	ru: 'Bonjourr только что получил крупное обновление! Узнайте больше о новых функциях быстрых ссылок и многое другое в нашем сообщении об обновлении. ✨',
	zh_CN: 'Bonjourr 刚刚进行了重大更新！在我们的更新帖子中了解更多关于新的快速链接功能等内容。✨',
	zh_HK: 'Bonjourr 剛剛進行了重大更新！在我們的更新帖子中了解更多關於新的快速鏈接功能等內容。✨',
	jp: 'Bonjourr が大規模なアップデートを行いました！ 新しいクイックリンク機能などについて詳しくはアップデート投稿でご確認ください。✨',
	de: 'Bonjourr wurde soeben aktualisiert! Entdecken Sie die neuen Quicklink-Funktionen und mehr in unserem Update-Post. ✨',
	it: 'Bonjourr è stato appena aggiornato! Scoprite le nuove funzioni di collegamento rapido e molto altro nel nostro post di aggiornamento. ✨',
	es_ES: '¡Bonjourr acaba de ser actualizado! Echa un vistazo a las nuevas funciones de enlace rápido y más en nuestro post de actualización. ✨',
	tr: 'Bonjourr az önce güncellendi! Yeni hızlı bağlantı özelliklerine ve daha fazlasına güncelleme yazımızdan göz atın. ✨',
	uk: 'Bonjourr щойно отримав велике оновлення! Дізнайтеся більше про нові функції швидких посилань та інше у нашому оновлювальному пості. ✨',
	id: 'Bonjourr baru saja mendapatkan pembaruan besar! Pelajari lebih lanjut tentang fitur tautan cepat baru dan lainnya dalam pos pembaruan kami. ✨',
	da: 'Bonjourr har netop fået en stor opdatering! Læs mere om de nye hurtige links-funktioner og mere i vores opdateringsindlæg. ✨',
	fi: 'Bonjourr sai juuri suuren päivityksen! Lue lisää uusista pikalinkkien ominaisuuksista ja muusta päivitystiedotteessamme. ✨',
	hu: 'Bonjourr most frissült! Nézze meg az új gyorslink funkciókat és még többet a frissítésről szóló bejegyzésünkben. ✨',
	sr: 'Бонжур је управо добио велико ажурирање! Сазнајте више о новим функцијама брзих веза и више у нашем посту за ажурирање. ✨',
	sr_YU: 'Bonjourr je upravo dobio veliko ažuriranje! Saznajte više o novim funkcijama brzih veza i više u našem postu za ažuriranje. ✨',
	gr: 'Το Bonjourr μόλις ενημερώθηκε! Δείτε τα νέα χαρακτηριστικά γρήγορης σύνδεσης και άλλα στην ανάρτηση ενημέρωσης. ✨',
	fa: 'سلام به تازگی به روز شده است! در پست به‌روزرسانی ما درباره ویژگی‌های جدید پیوندهای سریع و موارد بیشتر بیاموزید. ✨',
}

const ANNOUNCEMENT_BTN_TRNS = {
	en: 'Read the blog post',
	fr: "Lire l'article de blog",
	sk: 'Prečítajte si blogový príspevok',
	sv: 'Läs blogginlägget',
	pl: 'Przeczytaj wpis na blogu',
	pt_BR: 'Leia o post do blog',
	pt_PT: 'Leia o artigo do blogue',
	nl: 'Lees het blogbericht',
	ro: 'Citește postarea pe blog',
	ru: 'Читать блог-пост',
	zh_CN: '阅读博客文章',
	zh_HK: '閱讀部落格文章',
	jp: 'ブログ記事を読む',
	de: 'Lies den Blogbeitrag',
	it: 'Leggi il post del blog',
	es_ES: 'Lee la entrada del blog',
	tr: 'Blog gönderisini oku',
	uk: 'Прочитати блог-пост',
	id: 'Baca postingan blog',
	da: 'Læs blogindlægget',
	fi: 'Lue blogikirjoitus',
	hu: 'Olvassad el a blogbejegyzést',
	sr: 'Прочитајте блог пост',
	sr_YU: 'Прочитајте блог пост',
	gr: 'Διαβάστε την ανάρτηση στο ιστολόγιο',
	fa: 'پست وبلاگ را بخوانید',
}
