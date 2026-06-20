import { EXTENSION, IS_MOBILE, PLATFORM, SEARCHBAR_ENGINES } from '../defaults.ts'
import { opacityFromHex, stringMaxSize } from '../shared/generic.ts'
import { hexColorFromSplitRange } from '../shared/dom.ts'
import { getLang, tradThis } from '../utils/translations.ts'
import { eventDebounce } from '../utils/debounce.ts'
import { apiWebSocket } from '../shared/api.ts'
import { storage } from '../storage.ts'
import { parse } from '../utils/parse.ts'

import type { SearchEngines } from '../../types/shared.ts'
import type { Searchbar } from '../../types/sync.ts'
import { networkForm } from '../shared/form.ts'
import { toggleSettingsDropdown } from '../settings.ts'

type SearchbarUpdate = {
    engine?: string
    newtab?: boolean
    width?: string
    suggestions?: boolean
    placeholder?: string
    request?: true
    background?: true
}

type Suggestions = {
    text: string
    desc?: string
    image?: string
}[]

type UndefinedElement = Element | undefined | null

const customEngineForm = networkForm('f_sbrequest')

let socket: WebSocket | undefined
const domainPattern = /^(?!.*\s)(?:https?:\/\/)?([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z0-9-]{2,})/i
const COMMON_TLDS = new Set([
    'ac',
    'ad',
    'ae',
    'af',
    'ag',
    'ai',
    'al',
    'am',
    'app',
    'ar',
    'at',
    'au',
    'be',
    'bg',
    'biz',
    'br',
    'ca',
    'cc',
    'ch',
    'cl',
    'cloud',
    'club',
    'cn',
    'co',
    'com',
    'cz',
    'de',
    'dev',
    'dk',
    'edu',
    'ee',
    'es',
    'eu',
    'fi',
    'fm',
    'fr',
    'gg',
    'gov',
    'gr',
    'hk',
    'hr',
    'hu',
    'id',
    'ie',
    'il',
    'in',
    'info',
    'io',
    'is',
    'it',
    'jp',
    'kr',
    'li',
    'lt',
    'lu',
    'lv',
    'me',
    'mil',
    'mx',
    'net',
    'nl',
    'no',
    'nz',
    'online',
    'org',
    'pl',
    'pro',
    'pt',
    'ro',
    'rs',
    'ru',
    'se',
    'sg',
    'shop',
    'site',
    'sk',
    'space',
    'store',
    'tech',
    'to',
    'tr',
    'tv',
    'tw',
    'ua',
    'uk',
    'us',
    'vn',
    'xyz',
])

const domsuggestions = document.getElementById('sb-suggestions') as HTMLUListElement | undefined
const domcontainer = document.getElementById('sb_container') as HTMLDivElement | undefined
const domsearchbar = document.getElementById('searchbar') as HTMLInputElement | undefined
const dombuttons = document.getElementById('sb-buttons') as HTMLDivElement | undefined
const emptyButton = document.getElementById('sb_empty')

const display = (shown = false) => domcontainer?.classList.toggle('hidden', !shown)
const setEngine = (value = 'google') => domcontainer?.setAttribute('data-engine', value)
const setRequest = (value = '') => domcontainer?.setAttribute('data-request', stringMaxSize(value, 512))
const setNewtab = (value = false) => domcontainer?.setAttribute('data-newtab', value.toString())
const setSuggestions = (value = true) => domcontainer?.setAttribute('data-suggestions', value.toString())
const setPlaceholder = (value = '') => domsearchbar?.setAttribute('placeholder', value)
const setWidth = (value = 30) =>
    document.documentElement.style.setProperty('--searchbar-width', `${value.toString()}em`)
const setBackground = (value = '#fff2') => {
    document.documentElement.style.setProperty('--searchbar-background', value)
    document
        .getElementById('sb_container')
        ?.classList.toggle('opaque', value.includes('#fff') && opacityFromHex(value) > 7)
}

export function searchbar(init?: Searchbar, update?: SearchbarUpdate): void {
    if (update) {
        updateSearchbar(update)
        return
    }

    try {
        display(init?.on)
        setWidth(init?.width)
        setEngine(init?.engine)
        setRequest(init?.request)
        setNewtab(init?.newtab)
        setPlaceholder(init?.placeholder)
        setSuggestions(init?.suggestions)
        setBackground(init?.background)

        dombuttons?.addEventListener('click', focusSearchbar)
        emptyButton?.addEventListener('click', removeInputText)
        domcontainer?.addEventListener('submit', submitSearch)
        domsearchbar?.addEventListener('input', handleUserInput)

        // closes context menu when searchbar is focused
        domsearchbar?.addEventListener('focus', () => {
            document.dispatchEvent(new Event('close-edit'))
            domsearchbar.focus()
        })

        document.addEventListener('keydown', searchbarShortcut)
    } catch (_) {
        //...
    }
}

async function updateSearchbar({
    engine,
    newtab,
    background,
    placeholder,
    request,
    suggestions,
    width,
}: SearchbarUpdate): Promise<void> {
    const { searchbar } = await storage.sync.get('searchbar')

    if (!searchbar) {
        return
    }

    if (isValidEngine(engine)) {
        toggleSettingsDropdown('searchbar_request', engine === 'custom')
        searchbar.engine = engine
        setEngine(engine)
    }

    if (suggestions !== undefined) {
        searchbar.suggestions = suggestions
        setSuggestions(suggestions)
    }

    if (newtab !== undefined) {
        searchbar.newtab = newtab
        setNewtab(newtab)
    }

    if (width !== undefined) {
        searchbar.width = Number.parseInt(width)
        setWidth(searchbar.width)
    }

    if (placeholder !== undefined) {
        searchbar.placeholder = placeholder
        setPlaceholder(placeholder)
    }

    if (background) {
        searchbar.background = hexColorFromSplitRange('sb-background-range')
        setBackground(searchbar.background)
    }

    if (request) {
        const form = document.querySelector<HTMLFormElement>('#f_sbrequest')

        if (!form) {
            return
        }

        const formdata = new FormData(form)
        const value = formdata.get('sbrequest')?.toString() ?? ''
        const noQueryPlaceholder = !value.includes('%s') && value.length > 0
        const badCustomDomain = !value.match(domainPattern)

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

//
//	Search Submission
//

function cleanHostname(hostname: string): string {
    return hostname.toLowerCase().replace(/\.$/, '')
}

function isLocalHostname(hostname: string): boolean {
    const clean = cleanHostname(hostname)

    if (clean === 'localhost') {
        return true
    }

    const parts = clean.split('.')
    if (parts.length !== 4 || parts.some((part) => !/^\d+$/.test(part))) {
        return false
    }

    const octets = parts.map(Number)
    if (octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
        return false
    }

    const [first, second] = octets
    return first === 10 ||
        first === 127 ||
        (first === 172 && second >= 16 && second <= 31) ||
        (first === 192 && second === 168)
}

function getInputHostname(value: string): string {
    const withoutProtocol = value.replace(/^https?:\/\//i, '')
    const host = withoutProtocol.split(/[/?#]/)[0]?.split('@').pop() ?? ''
    const hostname = host.startsWith('[') ? host : host.split(':')[0] ?? ''
    return cleanHostname(hostname)
}

function hasCommonTld(hostname: string): boolean {
    const labels = cleanHostname(hostname).split('.')
    const tld = labels[labels.length - 1] ?? ''
    const validLabels = labels.every((label) =>
        /^[a-z0-9-]+$/.test(label) && !label.startsWith('-') && !label.endsWith('-')
    )
    return validLabels && COMMON_TLDS.has(tld)
}

function hasProtocol(value: string): boolean {
    return value.startsWith('http://') || value.startsWith('https://')
}

function createDomainUrl(value: string): string {
    if (hasProtocol(value)) {
        return value
    }

    const secureUrl = `https://${value}`

    return isLocalHostname(getInputHostname(secureUrl)) ? `http://${value}` : secureUrl
}

export function isValidUrl(string: string, hadProtocol = true): boolean {
    try {
        const url = new URL(string)
        const basicURL = !!url
        const regexMatch = domainPattern.test(string)
        const localHostname = isLocalHostname(getInputHostname(string))
        const allowedTld = hadProtocol || hasCommonTld(url.hostname)
        return basicURL && (localHostname || (regexMatch && allowedTld))
    } catch (_) {
        return false
    }
}

function createSearchUrl(val: string, engine: string): string {
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

function submitSearch(e: Event): void {
    e.preventDefault()

    const canUseDefault = !IS_MOBILE && (PLATFORM === 'chrome' || PLATFORM === 'firefox')
    const newtab = domcontainer?.dataset.newtab === 'true'
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

    const hadProtocol = hasProtocol(val)
    const domainUrl = createDomainUrl(val)
    const searchUrl = createSearchUrl(val, engine)
    const url = isValidUrl(domainUrl, hadProtocol) ? domainUrl : searchUrl
    const target = newtab ? '_blank' : '_self'

    globalThis.open(url, target)
    return
}

//
//	Suggestions
//

function initSuggestions(): void {
    function selectShownResult(next: UndefinedElement): UndefinedElement {
        return next?.classList.contains('shown') ? next : null
    }

    function applyResultContentToInput(elem: UndefinedElement): void {
        if (!(elem && domsearchbar)) {
            return
        }

        domsearchbar.value = elem?.querySelector('.suggest-result')?.textContent ?? ''
    }

    for (let ii = 0; ii < 10; ii++) {
        const li = document.createElement('li')
        const image = document.createElement('img')
        const wrapper = document.createElement('div')
        const result = document.createElement('p')
        const description = document.createElement('p')

        li.setAttribute('tabindex', '0')
        image.setAttribute('draggable', 'false')
        image.setAttribute('width', '16')
        image.setAttribute('height', '16')

        result.classList.add('suggest-result')
        description.classList.add('suggest-desc')

        wrapper.appendChild(result)
        wrapper.appendChild(description)
        li.appendChild(image)
        li.appendChild(wrapper)

        li.addEventListener('mouseenter', () => {
            domcontainer?.querySelector('li[aria-selected="true"]')?.removeAttribute('aria-selected')
            li?.setAttribute('aria-selected', 'true')
        })

        li.addEventListener('mouseleave', () => {
            li?.removeAttribute('aria-selected')
        })

        li.addEventListener('click', (e) => {
            applyResultContentToInput(li)
            submitSearch(e)
        })

        domsuggestions?.appendChild(li)
    }

    function toggleSuggestions(e: FocusEvent): void {
        const relatedTarget = e?.relatedTarget as Element
        const targetIsResult = relatedTarget?.parentElement?.id === 'sb-suggestions'
        const hasResults = document.querySelectorAll('#sb-suggestions li.shown')?.length > 0
        const isFocus = e.type === 'focus'

        if (!targetIsResult) {
            domsuggestions?.classList.toggle('shown', isFocus && hasResults)
        }
    }

    function navigateSuggestions(e: KeyboardEvent): void {
        const isArrowDown = e.code === 'ArrowDown'
        const isArrowUp = e.code === 'ArrowUp'
        const isEnter = e.code === 'Enter'
        const isEscape = e.code === 'Escape'
        let lastSelected = domsuggestions?.querySelector('li[aria-selected="true"]')

        lastSelected?.removeAttribute('aria-selected')

        if (isEscape) {
            return
        }

        if (isArrowDown) {
            lastSelected = selectShownResult(lastSelected?.nextElementSibling) ??
                domsuggestions?.querySelector('li.shown')
            applyResultContentToInput(lastSelected)
        }

        if (isArrowUp) {
            lastSelected = selectShownResult(lastSelected?.previousElementSibling)
            applyResultContentToInput(lastSelected)
            e.preventDefault()
        }

        if (isEnter && lastSelected) {
            applyResultContentToInput(lastSelected)
            submitSearch(e)
        }

        lastSelected?.setAttribute('aria-selected', 'true')
    }

    function hideResultsAndSuggestions(): void {
        const children = Object.values(domsuggestions?.children ?? [])
        for (const child of children) {
            child.classList.remove('shown')
        }
        domsuggestions?.classList.remove('shown')
    }

    async function createSuggestionSocket(): Promise<void> {
        socket = await apiWebSocket('suggestions')

        socket?.addEventListener('message', (event: MessageEvent) => {
            const data = parse<Suggestions | { error: string }>(event.data)

            if (Array.isArray(data)) {
                suggestions(data as Suggestions)
            } else if (data?.error) {
                createSuggestionSocket()
            }
        })
    }

    domcontainer?.addEventListener('keydown', navigateSuggestions)
    domsearchbar?.addEventListener('focus', toggleSuggestions)
    domsearchbar?.addEventListener('blur', toggleSuggestions)
    emptyButton?.addEventListener('click', hideResultsAndSuggestions)

    createSuggestionSocket()
}

function suggestions(results: Suggestions): void {
    const input = domsearchbar as HTMLInputElement
    const liList = domsuggestions?.querySelectorAll('li') ?? []

    domsuggestions?.classList.toggle('shown', results.length > 0)
    domsuggestions?.querySelector('li[aria-selected="true"]')?.removeAttribute('aria-selected')

    liList.forEach((li, i) => {
        const result = results[i]
        const resultdom = li.querySelector('.suggest-result')
        const descdom = li.querySelector('.suggest-desc')

        if (!(result && resultdom && descdom)) {
            return
        }

        // flaw: suggestions magnifying glass isn't colored by --font-on-blur-color
        const searchIcon = 'src/assets/interface/magnifying-glass.svg'
        const image = result.image ?? searchIcon
        const desc = result.desc ?? ''

        if (resultdom) {
            resultdom.textContent = result.text
        }

        if (result.text.includes(input.value)) {
            const queryIndex = result.text.indexOf(input.value)
            const startdom = document.createElement('span')
            const querydom = document.createElement('b')
            const enddom = document.createElement('span')

            startdom.textContent = result.text.slice(0, queryIndex)
            querydom.textContent = result.text.slice(queryIndex, input.value.length)
            enddom.textContent = result.text.slice(input.value.length)

            resultdom.textContent = ''
            resultdom.appendChild(startdom)
            resultdom.appendChild(querydom)
            resultdom.appendChild(enddom)
        }

        const imgdom = li.querySelector('img') as HTMLImageElement
        imgdom.classList.toggle('default-search-icon', image === searchIcon)
        imgdom.src = image

        descdom.textContent = desc
        li.classList.toggle('shown', !!result)

        // This cuts results short if it overflows the interface
        const rect = li.getBoundingClientRect()
        const yLimit = rect.y + rect.height + 40 // 40 is arbitrary padding in px
        const isOverflowing = yLimit > document.body.offsetHeight

        if (isOverflowing) {
            li.classList.remove('shown')
        }
    })

    if (domsuggestions?.querySelectorAll('li.shown')?.length === 0) {
        domsuggestions?.classList.remove('shown')
    }
}

//
//	Searchbar Events
//

function handleUserInput(e: Event): void {
    const value = ((e as InputEvent).target as HTMLInputElement).value ?? ''
    const startsTypingProtocol = 'https://'.startsWith(value) || 'http://'.startsWith(value)

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

    if (startsTypingProtocol || isValidUrl(createDomainUrl(value), hasProtocol(value))) {
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

function isValidEngine(str = ''): str is SearchEngines {
    return SEARCHBAR_ENGINES.includes(str as SearchEngines)
}
