import { opacityFromHex, stringMaxSize } from '../../shared/generic.ts'
import { hexColorFromSplitRange } from '../../shared/dom.ts'
import { toggleSettingsDropdown } from '../../settings.ts'
import { getLang, tradThis } from '../../utils/translations.ts'
import { SEARCHBAR_ENGINES } from '../../defaults.ts'
import { eventDebounce } from '../../utils/debounce.ts'
import { networkForm } from '../../shared/form.ts'
import { storage } from '../../storage.ts'

import { getSocket, initSuggestions } from './suggestions.ts'
import { submitSearch } from './submission.ts'

import type { SearchEngines } from '../../../types/shared.ts'
import type { Searchbar } from '../../../types/sync.ts'

type SearchbarUpdate = {
    suggestions?: boolean
    placeholder?: string
    background?: true
    newtab?: boolean
    engine?: string
    request?: true
    width?: string
}

const customEngineForm = networkForm('f_sbrequest')
const domcontainer = document.querySelector<HTMLElement>('#sb_container')
const domsearchbar = document.querySelector<HTMLInputElement>('#searchbar')

export function searchbar(init?: Searchbar, update?: SearchbarUpdate): void {
    if (update) {
        updateSearchbar(update)
        return
    }

    try {
        const dombuttons = document.querySelector<HTMLElement>('#sb-buttons')
        const emptyButton = document.querySelector<HTMLElement>('#sb_empty')

        setWidth(init?.width)
        setEngine(init?.engine)
        setRequest(init?.request)
        setNewtab(init?.newtab)
        setDisplay(init?.on)
        setPlaceholder(init?.placeholder)
        setSuggestions(init?.suggestions)
        setBackground(init?.background)

        domcontainer?.addEventListener('submit', submitSearch)
        domsearchbar?.addEventListener('focus', closeContextMenu)
        domsearchbar?.addEventListener('input', handleUserInput)
        emptyButton?.addEventListener('click', removeInputText)
        dombuttons?.addEventListener('click', focusSearchbar)
        document.addEventListener('keydown', searchbarShortcut)
    } catch (_) {
        //...
    }
}

async function updateSearchbar(update: SearchbarUpdate): Promise<void> {
    const { searchbar } = await storage.sync.get('searchbar')

    if (!searchbar) {
        return
    }

    if (isValidEngine(update.engine)) {
        toggleSettingsDropdown('searchbar_request', update.engine === 'custom')
        searchbar.engine = update.engine
        setEngine(update.engine)
    }

    if (update.suggestions !== undefined) {
        searchbar.suggestions = update.suggestions
        setSuggestions(update.suggestions)
    }

    if (update.newtab !== undefined) {
        searchbar.newtab = update.newtab
        setNewtab(update.newtab)
    }

    if (update.width !== undefined) {
        searchbar.width = Number.parseInt(update.width)
        setWidth(searchbar.width)
    }

    if (update.placeholder !== undefined) {
        searchbar.placeholder = update.placeholder
        setPlaceholder(update.placeholder)
    }

    if (update.background) {
        searchbar.background = hexColorFromSplitRange('sb-background-range')
        setBackground(searchbar.background)
    }

    if (update.request) {
        const form = document.querySelector<HTMLFormElement>('#f_sbrequest')

        if (!form) {
            return
        }

        const formdata = new FormData(form)
        const value = formdata.get('sbrequest')?.toString() ?? ''
        const noQueryPlaceholder = !value.includes('%s') && value.length > 0
        const badCustomDomain = safeURL(value) === undefined

        if (badCustomDomain) {
            customEngineForm.warn(tradThis('URL seems wrong'))
            return
        }
        if (noQueryPlaceholder) {
            customEngineForm.warn(tradThis('No %s present in URL'))
            return
        }

        searchbar.request = stringMaxSize(value, 512)
        setRequest(searchbar.request)
        customEngineForm.accept()
    }

    eventDebounce({ searchbar })
}

/*
 * Searchbar events
 */

function handleUserInput(e: Event): void {
    const domsuggestions = document.querySelector<HTMLElement>('#sb-suggestions')

    const value = ((e as InputEvent).target as HTMLInputElement).value ?? ''
    const socket = getSocket()

    // Button display toggle
    if (domsearchbar) {
        toggleInputButton(value.length > 0)
    }

    if (value === '') {
        for (const li of document.querySelectorAll('#sb-suggestions li.shown') ?? []) {
            li.classList.remove('shown')
        }
        domsuggestions?.classList.remove('shown')
        return
    }

    const isHttp = value.startsWith('http://') || value.startsWith('https://')
    const valueURL = safeURL(isHttp ? value : `http://${value}`)
    const isValidUrl = valueURL && (isDistantUrl(valueURL) || isLocalIp(valueURL))

    if (startAsHttpUrl(value) || isValidUrl) {
        domsuggestions?.classList.remove('shown')
        return
    }

    if (domcontainer?.dataset.suggestions === 'true' && domsuggestions?.childElementCount === 0) {
        initSuggestions()
    }

    // request suggestions
    if (domcontainer?.dataset.suggestions === 'true' && socket && socket.readyState === socket.OPEN) {
        const engine = (domcontainer?.dataset.engine ?? 'ddg').replace('custom', 'ddg').replace('default', 'google')
        const query = encodeURIComponent(value ?? '')
        socket.send(JSON.stringify({ q: query, with: engine, lang: getLang() }))
    }
}

function toggleInputButton(enabled: boolean): void {
    document.getElementById('sb-buttons')?.classList.toggle('shown', enabled)
    document.getElementById('sb_empty')?.toggleAttribute('disabled', !enabled)
    document.getElementById('sb_submit')?.toggleAttribute('disabled', !enabled)
}

function removeInputText(): void {
    if (domsearchbar) {
        domsearchbar.focus()
        domsearchbar.value = ''
        toggleInputButton(false)
    }
}

function focusSearchbar(): void {
    const dombuttons = document.querySelector<HTMLElement>('#sb-buttons')

    if (dombuttons?.classList.contains('shown') === false) {
        domsearchbar?.focus()
    }
}

function searchbarShortcut(event: KeyboardEvent): void {
    const target = event.target as Element
    const fromBody = target.tagName === 'BODY'

    if (fromBody && event.key === '/') {
        domsearchbar?.focus()
        domsearchbar?.select()
        event.preventDefault()
    }
}

function closeContextMenu(): void {
    document.dispatchEvent(new Event('close-edit'))
    domsearchbar?.focus()
}

/*
 * Setters
 */

function setDisplay(shown = false): void {
    domcontainer?.classList.toggle('hidden', !shown)
}
function setEngine(value = 'google'): void {
    domcontainer?.setAttribute('data-engine', value)
}
function setRequest(value = ''): void {
    domcontainer?.setAttribute('data-request', stringMaxSize(value, 512))
}
function setNewtab(value = false): void {
    domcontainer?.setAttribute('data-newtab', value.toString())
}
function setSuggestions(value = true): void {
    domcontainer?.setAttribute('data-suggestions', value.toString())
}
function setPlaceholder(value = ''): void {
    domsearchbar?.setAttribute('placeholder', value)
}
function setWidth(value = 30): void {
    document.documentElement.style.setProperty('--searchbar-width', `${value.toString()}em`)
}
function setBackground(value = '#fff2'): void {
    document.documentElement.style.setProperty('--searchbar-background', value)
    domcontainer?.classList.toggle('opaque', value.includes('#fff') && opacityFromHex(value) > 7)
}

/*
 * Helpers
 */

const topLevelDomains =
    'com,org,de,br,ru,uk,net,jp,it,fr,nl,pl,in,au,ca,cz,es,ch,be,co,eu,ua,ar,hu,at,ro,gr,tr,se,za,kr,mx,vn,id,info,cl,dk,ir,fi,nz,shop,sk,io,tw,il,online,no,pt,ai,рф,store,ie,cn,by,app,site,pro,xyz,lt,rs,us,my,me,pk,hr,kz,si,bg,biz,sg,ee,pe,ae,cc,top,world,lv,th,club,hk,live,tv,ng,ph,vip,ma,dev,sa,cat,uy,tech,blog,ke,ovh'
        .split(',')

export function isValidEngine(str = ''): str is SearchEngines {
    return SEARCHBAR_ENGINES.includes(str as SearchEngines)
}

export function safeURL(s: string): URL | undefined {
    try {
        const url = new URL(s)
        const hasSpaces = url.hostname.includes('%20')

        if (hasSpaces) {
            throw 'URL contructor allows spaces, not me'
        }

        return url
    } catch (_) { //
    }
}

function startAsHttpUrl(string: string): boolean {
    return 'https://'.startsWith(string) ||
        'localhost'.startsWith(string) ||
        '192.168.'.startsWith(string) ||
        'http://'.startsWith(string) ||
        '::1'.startsWith(string)
}

export function isLocalIp({ hostname }: URL): boolean {
    return hostname.includes('192.168.') ||
        hostname.startsWith('127.0.0.1') ||
        hostname.startsWith('localhost')
}

export function isDistantUrl({ host }: URL): boolean {
    const tld = host.split('.').at(-1) ?? ''
    return topLevelDomains.includes(tld)
}
