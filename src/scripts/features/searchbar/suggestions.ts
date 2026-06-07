import { apiWebSocket } from '../../shared/api.ts'
import { submitSearch } from './submission.ts'
import { parse } from '../../utils/parse.ts'

type Suggestions = {
    text: string
    desc?: string
    image?: string
}[]

type UndefinedElement = Element | undefined | null

let searchbarSocket: WebSocket | undefined

export function initSuggestions(): void {
    const domcontainer = document.querySelector<HTMLElement>('#sb_container')
    const domsearchbar = document.querySelector<HTMLInputElement>('#searchbar')
    const domsuggestions = document.querySelector<HTMLElement>('#sb-suggestions')
    const emptyButton = document.querySelector<HTMLElement>('#sb_empty')

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
        const socket = setSocket(await apiWebSocket('suggestions'))

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
    const domsearchbar = document.querySelector<HTMLInputElement>('#searchbar')
    const domsuggestions = document.querySelector<HTMLElement>('#sb-suggestions')

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

export function getSocket(): WebSocket | undefined {
    return searchbarSocket
}
export function setSocket(socket: WebSocket | undefined): WebSocket | undefined {
    searchbarSocket = socket
    return socket
}
