import { EXTENSION, IS_MOBILE, PLATFORM } from '../../defaults.ts'
import { isDistantUrl, isLocalIp, isValidEngine, safeURL } from './searchbar.ts'
import { getSocket } from './suggestions.ts'
import { tradThis } from '../../utils/translations.ts'

import type { SearchEngines } from '../../../types/shared.ts'

export function submitSearch(e: Event): void {
    e.preventDefault()

    const domcontainer = document.querySelector<HTMLElement>('#sb_container')
    const domsearchbar = document.querySelector<HTMLInputElement>('#searchbar')
    const canUseDefault = !IS_MOBILE && (PLATFORM === 'chrome' || PLATFORM === 'firefox')
    const newtab = domcontainer?.dataset.newtab === 'true'
    const openTarget = newtab ? '_blank' : '_self'
    const val = domsearchbar?.value
    const socket = getSocket()

    let engine = domcontainer?.dataset.engine ?? 'default'

    if (!val) {
        return
    }

    if (socket) {
        socket.close()
    }

    engine = engine.replace('default', 'google')
    const hasProtocol = val.startsWith('http://') || val.startsWith('https://')
    const domainUrl = hasProtocol ? val : `http://${val}`
    const url = safeURL(domainUrl)

    if (url && isLocalIp(url)) {
        globalThis.open(url, openTarget)
        return
    }

    if (url && isDistantUrl(url)) {
        globalThis.open(
            domainUrl.replace('http', 'https'),
            openTarget,
        )
        return
    }

    if (EXTENSION && canUseDefault && engine === 'default') {
        EXTENSION.search.query({
            disposition: newtab ? 'NEW_TAB' : 'CURRENT_TAB',
            text: val,
        })
    } else {
        globalThis.open(createSearchUrl(val, engine), openTarget)
    }
}

function createSearchUrl(val: string, engine: string): string {
    const domcontainer = document.querySelector<HTMLElement>('#sb_container')

    const urls: Record<SearchEngines, string> = {
        default: '',
        google: 'https://www.google.com/search?q=%s',
        ddg: 'https://duckduckgo.com/?q=%s',
        startpage: 'https://www.startpage.com/do/search?query=%s',
        qwant: 'https://www.qwant.com/?q=%s',
        yahoo: 'https://search.yahoo.com/search?q=%s',
        bing: 'https://www.bing.com/search?q=%s',
        brave: 'https://search.brave.com/search?q=%s',
        ecosia: 'https://www.ecosia.org/search?q=%s',
        lilo: 'https://search.lilo.org/?q=%s',
        baidu: 'https://www.baidu.com/s?wd=%s',
        custom: domcontainer?.dataset.request || '',
    }

    if (!isValidEngine(engine)) {
        return 'about:blank'
    }

    if (engine === 'custom' && !urls.custom) {
        return 'about:blank'
    }

    let result = ''
    const query = encodeURIComponent(val ?? '')
    const localizedEngine = tradThis(engine)

    result = localizedEngine.includes('%s') ? localizedEngine : urls[engine]
    result = result.replace('%s', query)

    return result
}
