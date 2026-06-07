import { EXTENSION, IS_MOBILE, PLATFORM } from '../../defaults.ts'
import { isValidEngine, isValidUrl } from './searchbar.ts'
import { getSocket } from './suggestions.ts'
import { tradThis } from '../../utils/translations.ts'

import type { SearchEngines } from '../../../types/shared.ts'

export function submitSearch(e: Event): void {
    e.preventDefault()

    const domcontainer = document.querySelector<HTMLElement>('#sb_container')
    const domsearchbar = document.querySelector<HTMLInputElement>('#searchbar')
    const canUseDefault = !IS_MOBILE && (PLATFORM === 'chrome' || PLATFORM === 'firefox')
    const newtab = domcontainer?.dataset.newtab === 'true'
    const socket = getSocket()
    const val = domsearchbar?.value
    let engine = domcontainer?.dataset.engine ?? 'default'

    if (!val) {
        return
    }

    if (socket) {
        socket.close()
    }

    if (canUseDefault && engine === 'default') {
        ;(EXTENSION as typeof chrome)?.search.query({
            disposition: newtab ? 'NEW_TAB' : 'CURRENT_TAB',
            text: val,
        })
        return
    }

    engine = engine.replace('default', 'google')

    const hasProtocol = val.startsWith('http://') || val.startsWith('https://')
    const domainUrl = hasProtocol ? val : `https://${val}`
    const searchUrl = createSearchUrl(val, engine)
    const url = isValidUrl(domainUrl) ? domainUrl : searchUrl
    const target = newtab ? '_blank' : '_self'

    globalThis.open(url, target)
    return
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

const _topLevelDomains =
    'com,org,de,br,ru,uk,net,jp,it,fr,nl,pl,in,au,ca,cz,es,ch,be,co,eu,ua,ar,hu,at,ro,gr,tr,se,za,kr,mx,vn,id,info,cl,dk,ir,fi,nz,shop,sk,io,tw,il,online,no,pt,ai,рф,store,ie,cn,by,app,site,pro,xyz,lt,rs,us,my,me,pk,hr,kz,si,bg,biz,sg,ee,pe,ae,cc,top,world,lv,th,club,hk,live,tv,ng,ph,vip,ma,dev,sa,cat,uy,tech,blog,ke'
        .split(',')
