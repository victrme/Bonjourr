import { getLang, tradThis } from '../utils/translations.ts'
import { BROWSER } from '../defaults.ts'
import { storage } from '../storage.ts'

type PopupInit = {
    old?: string
    new: string
    review: number
    announce: 'major' | 'off'
}

type PopupUpdate = {
    announcements?: boolean
}

const ANNOUNCEMENT_URL = 'https://ko-fi.com/post/Bonjourr-22-pomodoro-timer-new-look-right-click-F1F11P47J8'

const ANNOUNCEMENT_TRNS = {
    en: {
        title: 'Bonjourr just got a major update! ✨',
        body:
            'Discover what’s new: Pomodoro timer, universal right-click menu, improved links, refreshed design, and more.',
    },
    fr: {
        title: "Bonjourr vient d'avoir une mise à jour majeure ! ✨",
        body:
            'Découvrez les nouveautés : minuteur Pomodoro, menu clic droit universel, liens améliorés, nouveau design, et bien plus encore.',
    },
    de: {
        title: 'Bonjourr hat ein großes Update erhalten! ✨',
        body:
            'Entdecke die Neuerungen: Pomodoro-Timer, universelles Rechtsklick-Menü, verbesserte Links, neues Design und mehr.',
    },
    it: {
        title: 'Bonjourr ha ricevuto un aggiornamento importante! ✨',
        body:
            'Scopri le novità: timer Pomodoro, menu clic destro universale, link migliorati, design rinnovato e molto altro.',
    },
    es: {
        title: '¡Bonjourr acaba de recibir una gran actualización! ✨',
        body:
            'Descubre las novedades: temporizador Pomodoro, menú de clic derecho universal, enlaces mejorados, diseño renovado y mucho más.',
    },
    'pt-BR': {
        title: 'Bonjourr acabou de receber uma grande atualização! ✨',
        body:
            'Descubra as novidades: timer Pomodoro, menu de clique direito universal, links aprimorados, design renovado e muito mais.',
    },
    'pt-PT': {
        title: 'O Bonjourr recebeu uma grande atualização! ✨',
        body:
            'Descubra as novidades: temporizador Pomodoro, menu de clique direito universal, ligações melhoradas, design renovado e mais.',
    },
    nl: {
        title: 'Bonjourr heeft een grote update gekregen! ✨',
        body:
            'Ontdek wat er nieuw is: Pomodoro-timer, universeel rechtermuisknopmenu, verbeterde links, vernieuwd design en meer.',
    },

    da: {
        title: 'Bonjourr har fået en stor opdatering! ✨',
        body:
            'Se nyhederne: Pomodoro-timer, universel højreklikmenu, forbedrede links, opdateret design og meget mere.',
    },
    sv: {
        title: 'Bonjourr har fått en stor uppdatering! ✨',
        body:
            'Upptäck nyheterna: Pomodoro-timer, universell högerklicksmeny, förbättrade länkar, uppdaterad design och mer.',
    },
    nb: {
        title: 'Bonjourr har fått en stor oppdatering! ✨',
        body: 'Oppdag nyhetene: Pomodoro-timer, universell høyreklikkmeny, forbedrede lenker, oppdatert design og mer.',
    },
    fi: {
        title: 'Bonjourr on saanut suuren päivityksen! ✨',
        body:
            'Tutustu uutuuksiin: Pomodoro-ajastin, yleinen hiiren oikean painikkeen valikko, parannetut linkit, uudistettu ulkoasu ja paljon muuta.',
    },
    pl: {
        title: 'Bonjourr otrzymał dużą aktualizację! ✨',
        body:
            'Sprawdź nowości: timer Pomodoro, uniwersalne menu prawego przycisku myszy, ulepszone linki, odświeżony wygląd i więcej.',
    },
    cs: {
        title: 'Bonjourr dostal velkou aktualizaci! ✨',
        body:
            'Objevte novinky: Pomodoro časovač, univerzální nabídka pravého kliknutí, vylepšené odkazy, obnovený design a další.',
    },
    hr: {
        title: 'Bonjourr je dobio veliko ažuriranje! ✨',
        body:
            'Otkrijte novosti: Pomodoro mjerač vremena, univerzalni izbornik desnog klika, poboljšane poveznice, osvježen dizajn i još mnogo toga.',
    },
    sk: {
        title: 'Bonjourr dostal veľkú aktualizáciu! ✨',
        body:
            'Objavte novinky: Pomodoro časovač, univerzálne menu pravého kliknutia, vylepšené odkazy, obnovený dizajn a viac.',
    },
    hu: {
        title: 'A Bonjourr jelentős frissítést kapott! ✨',
        body:
            'Fedezd fel az újdonságokat: Pomodoro időzítő, univerzális jobbklikk menü, továbbfejlesztett hivatkozások, megújult dizájn és még sok más.',
    },
    ro: {
        title: 'Bonjourr a primit o actualizare majoră! ✨',
        body:
            'Descoperă noutățile: cronometru Pomodoro, meniu universal de clic dreapta, linkuri îmbunătățite, design reîmprospătat și multe altele.',
    },
    el: {
        title: 'Το Bonjourr μόλις απέκτησε μια μεγάλη ενημέρωση! ✨',
        body:
            'Ανακαλύψτε τι νέο υπάρχει: χρονοδιακόπτης Pomodoro, καθολικό μενού δεξιού κλικ, βελτιωμένοι σύνδεσμοι, ανανεωμένος σχεδιασμός και πολλά ακόμη.',
    },
    hy: {
        title: 'Bonjourr-ը ստացել է մեծ թարմացում։ ✨',
        body:
            'Բացահայտեք նորությունները․ Pomodoro ժամանակաչափ, ունիվերսալ աջ սեղմման ընտրացանկ, բարելավված հղումներ, թարմացված դիզայն և ավելին։',
    },
    sr: {
        title: 'Bonjourr је добио велико ажурирање! ✨',
        body:
            'Откријте новости: Pomodoro тајмер, универзални мени десног клика, унапређене везе, освежен дизајн и још много тога.',
    },
    'sr-YU': {
        title: 'Bonjourr je dobio veliko ažuriranje! ✨',
        body:
            'Otkrijte novosti: Pomodoro tajmer, univerzalni meni desnog klika, unapređene veze, osvežen dizajn i još mnogo toga.',
    },
    uk: {
        title: 'Bonjourr отримав велике оновлення! ✨',
        body:
            'Дізнайтеся, що нового: таймер Pomodoro, універсальне меню правої кнопки миші, покращені посилання, оновлений дизайн та інше.',
    },
    ru: {
        title: 'Bonjourr получил крупное обновление! ✨',
        body:
            'Узнайте, что нового: таймер Pomodoro, универсальное контекстное меню, улучшенные ссылки, обновлённый дизайн и многое другое.',
    },
    tr: {
        title: 'Bonjourr büyük bir güncelleme aldı! ✨',
        body:
            'Yenilikleri keşfedin: Pomodoro zamanlayıcı, evrensel sağ tık menüsü, geliştirilmiş bağlantılar, yenilenmiş tasarım ve daha fazlası.',
    },
    ar: {
        title: 'حصل Bonjourr على تحديث كبير! ✨',
        body:
            'اكتشف الميزات الجديدة: مؤقّت بومودورو، قائمة نقر بزر الفأرة الأيمن شاملة، روابط محسّنة، تصميم مُحدّث والمزيد.',
    },

    fa: {
        title: 'Bonjourr یک به‌روزرسانی بزرگ دریافت کرد! ✨',
        body:
            'ویژگی‌های جدید را کشف کنید: تایمر پومودورو، منوی کلیک راست سراسری، لینک‌های بهبودیافته، طراحی تازه و موارد بیشتر.',
    },

    'zh-CN': {
        title: 'Bonjourr 刚刚迎来一次重大更新！✨',
        body: '探索新功能：番茄钟、通用右键菜单、改进的链接、焕然一新的设计等。',
    },

    'zh-HK': {
        title: 'Bonjourr 剛剛推出重大更新！✨',
        body: '探索新功能：番茄鐘、通用右鍵選單、改進的連結、煥然一新的設計等。',
    },

    'zh-TW': {
        title: 'Bonjourr 剛推出重大更新！✨',
        body: '探索新功能：番茄鐘、通用右鍵選單、改進的連結、全新設計等。',
    },

    ja: {
        title: 'Bonjourr に大規模アップデートが登場！✨',
        body:
            '新機能をご紹介：ポモドーロタイマー、ユニバーサル右クリックメニュー、リンクの改善、刷新されたデザインなど。',
    },

    id: {
        title: 'Bonjourr baru saja mendapatkan pembaruan besar! ✨',
        body:
            'Temukan fitur baru: timer Pomodoro, menu klik kanan universal, tautan yang ditingkatkan, desain baru, dan banyak lagi.',
    },

    ca: {
        title: 'Bonjourr ha rebut una actualització important! ✨',
        body:
            'Descobreix les novetats: temporitzador Pomodoro, menú de clic dret universal, enllaços millorats, disseny renovat i molt més.',
    },

    vi: {
        title: 'Bonjourr vừa nhận được bản cập nhật lớn! ✨',
        body:
            'Khám phá các tính năng mới: bộ hẹn giờ Pomodoro, menu chuột phải toàn cục, liên kết được cải thiện, giao diện làm mới và nhiều hơn nữa.',
    },
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

export function interfacePopup(init?: PopupInit, event?: PopupUpdate): void {
    // // force popup for debugging
    // displayPopup('announce', true)
    // displayPopup('review', true)

    if (event?.announcements !== undefined) {
        storage.sync.set({ announcements: event.announcements ? 'major' : 'off' })
        return
    }

    // Announcements

    if (!init || init?.announce === 'off') {
        return
    }

    if (init.old) {
        const major = (s: string) => Number.parseInt(s.split('.')[0]) // returns something like 22
        const isMajorUpdate = major(init.new) > major(init.old)

        const announceMajor = init.announce === 'major' && isMajorUpdate
        const canAnnounce = localStorage.hasUpdated === 'true' || announceMajor

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

    // careful: reviewCounter and init.review are not the same
    const reviewCounter = getReviewCounter()

    if (reviewCounter > 30) {
        displayPopup('review')
    }

    // removes the review popup automatically after 200 tabs
    if (reviewCounter > 200) {
        closePopup()
    }

    localStorage.reviewCounter = reviewCounter + 1
}

function displayPopup(type: 'review' | 'announce', showIcon = false): void {
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
        const { title, body } = ANNOUNCEMENT_TRNS[lang] ?? ANNOUNCEMENT_TRNS.en

        const strong = document.createElement('b')
        strong.textContent = title

        desc.replaceChildren(strong, document.createTextNode(` ${body}`))

        const buttontext = `${tradThis('Read the blog post')} 📝`
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

function removePopupTrigger(): void {
    storage.sync.set({ review: -1 })
    localStorage.removeItem('reviewCounter')
    localStorage.removeItem('hasUpdated')
}

function openPopup(): void {
    setTimeout(() => document.getElementById('popup')?.classList.add('shown'), 800)
    setTimeout(() => document.getElementById('credit-container')?.setAttribute('style', 'opacity: 0'), 400)
}

function closePopup(): void {
    setTimeout(() => document.getElementById('popup')?.remove(), 200)
    setTimeout(() => document.getElementById('credit-container')?.removeAttribute('style'), 600)
    document.getElementById('popup')?.classList.remove('shown')
    removePopupTrigger()

    console.info('Popup closed.')
}

export function getReviewCounter(): number {
    return parseInt(localStorage.reviewCounter ?? 0)
}
