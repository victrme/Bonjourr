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
    voice?: boolean
    voiceLang?: string
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

const domsuggestions = document.getElementById('sb-suggestions') as HTMLUListElement | undefined
const domcontainer = document.getElementById('sb_container') as HTMLDivElement | undefined
const domsearchbar = document.getElementById('searchbar') as HTMLInputElement | undefined
const dombuttons = document.getElementById('sb-buttons') as HTMLDivElement | undefined
const domvoice = document.getElementById('sb_voice') as HTMLButtonElement | undefined
const emptyButton = document.getElementById('sb_empty')

const display = (shown = false) => domcontainer?.classList.toggle('hidden', !shown)
const setVoice = (value = false) => {
    domcontainer?.setAttribute('data-voice', value.toString())
    domvoice?.classList.toggle('hidden', !value)
}
const setVoiceLang = (value = 'auto') => domcontainer?.setAttribute('data-voicelang', value)
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
        setVoice(init?.voice)
        setVoiceLang(init?.voiceLang)

        domvoice?.addEventListener('click', toggleVoiceSearch)
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
        document.addEventListener('keydown', voiceShortcut)
        document.addEventListener('visibilitychange', onVisibilityChange)
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
    voice,
    voiceLang,
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

    if (voice !== undefined) {
        searchbar.voice = voice
        setVoice(voice)
    }

    if (voiceLang !== undefined) {
        searchbar.voiceLang = voiceLang
        setVoiceLang(voiceLang)
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

function isValidUrl(string: string): boolean {
    try {
        const basicURL = !!new URL(string)
        const regexMatch = domainPattern.test(string)
        return basicURL && regexMatch
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

    if (isListening) {
        stopVoiceSearch()
    }

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

    const hasProtocol = val.startsWith('http://') || val.startsWith('https://')
    const domainUrl = hasProtocol ? val : `https://${val}`
    const searchUrl = createSearchUrl(val, engine)
    const url = isValidUrl(domainUrl) ? domainUrl : searchUrl
    if (newtab) {
        globalThis.open(url, '_blank', 'noopener')
        return
    }

    globalThis.open(url, '_self')
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
    const hasProtocol = value.startsWith('http://') || value.startsWith('https://')
    const withProtocol = hasProtocol ? value : `https://${value}`
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

    if (startsTypingProtocol || isValidUrl(withProtocol)) {
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
    if (isListening) {
        abortVoiceSearch()
    }

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

//
//	Voice Search (Web Speech API)
//

interface SpeechRecognitionResultItem {
    transcript: string
    confidence: number
}

interface SpeechRecognitionResultLike {
    isFinal: boolean
    length: number
    [index: number]: SpeechRecognitionResultItem
}

interface SpeechRecognitionEventLike extends Event {
    resultIndex: number
    results: {
        length: number
        [index: number]: SpeechRecognitionResultLike
    }
}

interface SpeechRecognitionErrorEventLike extends Event {
    error: string
    message?: string
}

interface SpeechRecognitionInstance extends EventTarget {
    continuous: boolean
    interimResults: boolean
    lang: string
    start(): void
    stop(): void
    abort(): void
    onstart: ((event: Event) => void) | null
    onresult: ((event: SpeechRecognitionEventLike) => void) | null
    onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
    onend: ((event: Event) => void) | null
}

type SpeechRecognitionClass = new () => SpeechRecognitionInstance

let activeRecognition: SpeechRecognitionInstance | undefined
let isListening = false
let voiceTimeoutId: ReturnType<typeof setTimeout> | undefined
let errorTimeoutId: ReturnType<typeof setTimeout> | undefined
let initialSearchValue = ''
let originalPlaceholder = ''

function getSpeechRecognition(): SpeechRecognitionClass | undefined {
    const globalObj = globalThis as unknown as {
        SpeechRecognition?: SpeechRecognitionClass
        webkitSpeechRecognition?: SpeechRecognitionClass
    }
    return globalObj.SpeechRecognition || globalObj.webkitSpeechRecognition
}

function getVoiceLanguage(): string {
    const configured = domcontainer?.dataset.voicelang
    if (configured && configured !== 'auto') {
        return configured
    }
    return navigator.language || getLang() || 'en-US'
}

function setVoiceState(state: 'idle' | 'requesting' | 'listening' | 'processing' | 'error'): void {
    if (!domvoice) {
        return
    }

    domvoice.classList.remove('listening', 'requesting', 'processing', 'error')

    if (state === 'idle') {
        domvoice.setAttribute('aria-label', tradThis('Voice search'))
        domvoice.setAttribute('title', tradThis('Voice search'))
    } else if (state === 'listening') {
        domvoice.classList.add('listening')
        domvoice.setAttribute('aria-label', tradThis('Listening... Click to stop'))
        domvoice.setAttribute('title', tradThis('Listening... Click to stop'))
    } else if (state === 'requesting') {
        domvoice.classList.add('requesting')
    } else if (state === 'processing') {
        domvoice.classList.add('processing')
    } else if (state === 'error') {
        domvoice.classList.add('error')
        clearTimeout(errorTimeoutId)
        errorTimeoutId = setTimeout(() => {
            domvoice?.classList.remove('error')
            domvoice?.setAttribute('aria-label', tradThis('Voice search'))
            domvoice?.setAttribute('title', tradThis('Voice search'))
        }, 2000)
    }
}

async function checkOrRequestMicrophonePermission(): Promise<boolean> {
    try {
        if (navigator.permissions && navigator.permissions.query) {
            try {
                const status = await navigator.permissions.query({ name: 'microphone' as PermissionName })
                if (status.state === 'granted') {
                    return true
                }
            } catch (_) {
                // Ignore query error on unsupported platforms
            }
        }

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            stream.getTracks().forEach((track) => track.stop())
            return true
        }

        return true
    } catch (_) {
        return false
    }
}

function restorePlaceholder(): void {
    if (domsearchbar) {
        domsearchbar.setAttribute('placeholder', originalPlaceholder)
    }
}

export async function startVoiceSearch(): Promise<void> {
    const SpeechRecognition = getSpeechRecognition()
    if (!SpeechRecognition) {
        setVoiceState('error')
        return
    }

    if (isListening) {
        stopVoiceSearch()
        return
    }

    setVoiceState('requesting')

    const hasPermission = await checkOrRequestMicrophonePermission()
    if (!hasPermission) {
        setVoiceState('error')
        return
    }

    try {
        const recognition = new SpeechRecognition()
        activeRecognition = recognition

        recognition.continuous = false
        recognition.interimResults = true
        recognition.lang = getVoiceLanguage()

        initialSearchValue = domsearchbar?.value ?? ''
        originalPlaceholder = domsearchbar?.getAttribute('placeholder') ?? ''

        recognition.onstart = () => {
            isListening = true
            setVoiceState('listening')
            if (domsearchbar) {
                domsearchbar.setAttribute('placeholder', tradThis('Listening...'))
            }

            clearTimeout(voiceTimeoutId)
            voiceTimeoutId = setTimeout(() => {
                if (isListening) {
                    stopVoiceSearch()
                }
            }, 15000)
        }

        recognition.onresult = (event: SpeechRecognitionEventLike) => {
            let transcript = ''
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                transcript += event.results[i][0]?.transcript ?? ''
            }

            if (domsearchbar && transcript) {
                const val = initialSearchValue ? `${initialSearchValue.trim()} ${transcript.trimStart()}` : transcript
                domsearchbar.value = val
                toggleInputButton(val.length > 0)
                domsearchbar.dispatchEvent(new Event('input', { bubbles: true }))
            }
        }

        recognition.onerror = () => {
            clearTimeout(voiceTimeoutId)
            isListening = false
            setVoiceState('error')
            restorePlaceholder()
        }

        recognition.onend = () => {
            clearTimeout(voiceTimeoutId)
            const wasListening = isListening
            isListening = false
            activeRecognition = undefined

            if (wasListening) {
                setVoiceState('idle')
            }
            restorePlaceholder()

            if (domsearchbar) {
                domsearchbar.focus()
                const len = domsearchbar.value.length
                domsearchbar.setSelectionRange(len, len)
                toggleInputButton(len > 0)
            }
        }

        recognition.start()
    } catch (_) {
        clearTimeout(voiceTimeoutId)
        isListening = false
        activeRecognition = undefined
        setVoiceState('error')
        restorePlaceholder()
    }
}

export function stopVoiceSearch(): void {
    clearTimeout(voiceTimeoutId)
    if (activeRecognition) {
        try {
            setVoiceState('processing')
            activeRecognition.stop()
        } catch (_) {
            activeRecognition.abort()
        }
    }
}

export function abortVoiceSearch(): void {
    clearTimeout(voiceTimeoutId)
    if (activeRecognition) {
        try {
            activeRecognition.abort()
        } catch (_) {
            // ignore
        }
    }
    isListening = false
    activeRecognition = undefined
    if (domsearchbar) {
        domsearchbar.value = initialSearchValue
        toggleInputButton(initialSearchValue.length > 0)
    }
    setVoiceState('idle')
    restorePlaceholder()
}

function toggleVoiceSearch(): void {
    if (isListening) {
        stopVoiceSearch()
    } else {
        startVoiceSearch()
    }
}

function voiceShortcut(event: KeyboardEvent): void {
    if (event.key === 'Escape' && isListening) {
        abortVoiceSearch()
        event.preventDefault()
    }
}

function onVisibilityChange(): void {
    if (document.hidden && isListening) {
        abortVoiceSearch()
    }
}
