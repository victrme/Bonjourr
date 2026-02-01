import { darkmode, favicon, pageControl, tabTitle, textShadow } from './features/others.ts'
import { supportersNotifications } from './features/supporters.ts'
import { synchronization } from './features/synchronization/index.ts'
import { backgroundsInit } from './features/backgrounds/index.ts'
import { interfacePopup } from './features/popup.ts'
import { moveElements } from './features/move/index.ts'
import { hideElements } from './features/hide.ts'
import { customFont } from './features/fonts.ts'
import { quickLinks } from './features/links/index.ts'
import { searchbar } from './features/searchbar.ts'
import { customCss } from './features/css.ts'
import { weather } from './features/weather/index.ts'
import { quotes } from './features/quotes.ts'
import { pomodoro } from './features/pomodoro.ts'
import { notes } from './features/notes.ts'
import { clock } from './features/clock/index.ts'
import './features/contextmenu.ts'

import { displayInterface, onInterfaceDisplay } from './shared/display.ts'
import { setTranslationCache, traduction } from './utils/translations.ts'
import { operaExtensionExplainer } from './startup/opera.ts'
import { setPotatoComputerMode } from './startup/potato.ts'
import { suntime, userDate } from './shared/time.ts'
import { onlineAndMobile } from './startup/online.ts'
import { serviceWorker } from './startup/serviceworker.ts'
import { tabsTracking } from './startup/tabstracking.ts'
import { settingsInit } from './settings.ts'
import { userActions } from './events.ts'
import { filterData } from './compatibility/apply.ts'
import { storage } from './storage.ts'

import { BROWSER, CURRENT_VERSION, LOCAL_DEFAULT, PLATFORM, SYNC_DEFAULT, SYSTEM_OS } from './defaults.ts'

try {
	startup()
	serviceWorker()
	onlineAndMobile()
} catch (_) {
	console.warn('Startup failed')
}

async function startup() {
	let { sync, local } = await storage.init()
	const oldVersion = sync?.about?.version

	if (!sync || !local) {
		console.warn('Storage failed, loading Bonjourr with default settings')
		sync = structuredClone(SYNC_DEFAULT)
		local = structuredClone(LOCAL_DEFAULT)
	}

	if (oldVersion !== CURRENT_VERSION) {
		console.info(`Updated Bonjourr, ${oldVersion} => ${CURRENT_VERSION}`)

		localStorage.setItem('update-archive', JSON.stringify(sync))

		sync = filterData('update', sync)

		local.translations = undefined
		storage.local.remove('translations')
		local = { ...LOCAL_DEFAULT, ...local }

		// <!> do not move
		// <!> must delete old keys before upgrading storage
		await storage.sync.clear()
		await storage.sync.set(sync)
	}

	await setTranslationCache(sync.lang, local)

	displayInterface(undefined, sync)
	traduction(null, sync.lang)
	userDate(sync.clock.timezone)
	suntime(local.lastWeather?.sunrise, local.lastWeather?.sunset)
	weather({ sync: sync, lastWeather: local.lastWeather })
	customFont(sync.font)
	textShadow(sync.textShadow)
	favicon(sync.favicon)
	tabTitle(sync.tabtitle)
	clock(sync)
	darkmode(sync.dark)
	searchbar(sync.searchbar)
	quotes({ sync, local })
	pomodoro(sync.pomodoro)
	notes(sync.notes)
	moveElements(sync.move)
	customCss(sync.css)
	hideElements(sync.hide)
	backgroundsInit(sync, local, true)
	quickLinks({ sync, local })
	synchronization(local)
	settingsInit(sync, local)
	pageControl({ width: sync.pagewidth, gap: sync.pagegap })
	operaExtensionExplainer(local.operaExplained)
	tabsTracking()

	document.documentElement.dataset.system = SYSTEM_OS as string
	document.documentElement.dataset.browser = BROWSER as string
	document.documentElement.dataset.platform = PLATFORM as string

	document.getElementById('time')?.classList.toggle('hidden', !sync.time)
	document.getElementById('main')?.classList.toggle('hidden', !sync.main)

	onInterfaceDisplay(() => {
		document.body.classList.remove('init')

		supportersNotifications(sync)
		setPotatoComputerMode()
		userActions()

		interfacePopup({
			announce: sync.announcements,
			review: sync.review ?? 0,
			new: CURRENT_VERSION,
			old: oldVersion,
		})
	})
}
