import { apiFetch, freqControl } from '../utils'
import storage from '../storage'
import parse from '../utils/parse'

type Quote = Quotes.Item

type QuotesInit = {
	sync: Sync.Storage
	local: Local.Storage
}

type QuotesUpdate = {
	toggle?: boolean
	author?: boolean
	refresh?: true
	type?: string
	userlist?: string
	frequency?: string
}

async function newQuoteFromAPI(lang: string, type: Quotes.Sync['type']): Promise<Quote[]> {
	try {
		if (!navigator.onLine || type === 'user') {
			return []
		}

		const query = (type += type === 'classic' ? `/${lang}` : '')
		const response = await apiFetch('/quotes/' + query)
		const json = await response?.json()

		if (response?.ok) {
			return json
		}
	} catch (error) {
		console.warn(error)
	}

	return []
}

function insertToDom(values: Quote) {
	const quoteDOM = document.getElementById('quote')
	const authorDOM = document.getElementById('author')

	if (!values || !quoteDOM || !authorDOM) {
		return
	}

	quoteDOM.textContent = values.content
	authorDOM.textContent = values.author
}

function controlCacheList(list: Quote[], lang: string, type: Quotes.Sync['type']) {
	//
	if (type === 'user') {
		const randIndex = Math.round(Math.random() * (list.length - 1))
		storage.local.set({ userQuoteSelection: randIndex })
		return list[randIndex]
	}

	list.shift()
	storage.local.set({ quotesCache: list })

	if (list.length < 2) {
		newQuoteFromAPI(lang, type).then((list) => {
			storage.local.set({ quotesCache: list })
		})
	}

	return list[0]
}

async function UpdateQuotes({ author, frequency, type, userlist, refresh }: QuotesUpdate, { quotes, lang }: Sync.Storage) {
	let quotesCache = (await storage.local.get('quotesCache'))?.quotesCache ?? []

	function isQuotesType(s = ''): s is Quotes.Sync['type'] {
		return ['classic', 'kaamelott', 'inspirobot', 'user'].includes(s)
	}

	async function handleQuotesType(type: Quotes.Sync['type']) {
		if (type !== 'user') {
			const list = await newQuoteFromAPI(lang, type)
			storage.local.set({ quotesCache: list })
			insertToDom(list[0])
			return
		}

		if (type === 'user' && userlist) {
			const selection = (await storage.local.get('userQuoteSelection'))?.userQuoteSelection ?? 0
			const list = csvUserInputToQuotes(quotes.userlist)
			insertToDom(list[selection])
		}

		const userlistdom = document.getElementById('quotes_userlist')
		userlistdom?.classList.toggle('shown', type === 'user')
	}

	function handleUserListChange(input: string): string | undefined {
		let array: Quote[] = []

		if (input.length === 0) {
			return ''
		}

		// old json format
		if (input.startsWith('[[')) {
			input = oldJSONToCSV(parse<Quotes.UserInput>(input) ?? [])
		}

		array = csvUserInputToQuotes(input)

		if (array.length > 0) {
			insertToDom({
				author: array[0].author,
				content: array[0].content,
			})

			document.getElementById('i_qtlist')?.blur()
			storage.local.set({ userQuoteSelection: 0 })
		}

		return input
	}

	function handleQuotesRefresh() {
		if (quotes.type === 'user') {
			if (!quotes.userlist) return
			quotesCache = csvUserInputToQuotes(quotes.userlist)
		}

		const quote = controlCacheList(quotesCache, lang, quotes.type)
		insertToDom(quote)
	}

	if (author) {
		quotes.author = author
		document.getElementById('author')?.classList.toggle('always-on', author)
	}

	// bad
	if (frequency?.match(/tabs|hour|day|period|pause/)) {
		quotes.frequency = frequency as Shared.Frequency
	}

	if (userlist) {
		quotes.userlist = handleUserListChange(userlist)
	}

	if (refresh) {
		quotes.last = freqControl.set()
		handleQuotesRefresh()
	}

	if (isQuotesType(type)) {
		quotes.type = type
		handleQuotesType(type)
	}

	storage.sync.set({ quotes })
}

export default async function quotes(init?: QuotesInit, update?: QuotesUpdate) {
	if (update) {
		const data = await storage.sync.get(['lang', 'quotes'])
		UpdateQuotes(update, data)
	}

	if (!init) {
		return
	}

	const { lang, quotes } = init.sync
	const needsNewQuote = freqControl.get(quotes.frequency, quotes.last)

	let userSel = init.local?.userQuoteSelection ?? 0
	let cache = init.local?.quotesCache ?? []

	const noCache = !cache || cache?.length === 0
	const isUser = quotes.type === 'user'

	let quote: Quote

	if (noCache) {
		cache = await newQuoteFromAPI(lang, quotes.type)
		storage.local.set({ quotesCache: cache })
	}

	if (isUser) {
		cache = csvUserInputToQuotes(quotes.userlist)
	}

	if (needsNewQuote) {
		quotes.last = freqControl.set()
		quote = controlCacheList(cache, lang, quotes.type)
		storage.sync.set({ quotes })
	} else {
		quote = cache[isUser ? userSel : 0]
	}

	if (quotes.author) {
		document.getElementById('author')?.classList.add('always-on')
	}

	if (isUser && quotes.userlist) {
		insertToDom(csvUserInputToQuotes(quotes.userlist)[userSel])
	} else if (!isUser) {
		insertToDom(cache[0])
	}

	insertToDom(quote)

	document.getElementById('quotes_container')?.classList.toggle('hidden', !quotes.on)

	document.dispatchEvent(new CustomEvent('interface', { detail: 'quotes' }))
}

//
// ─── HELPERS
//

function csvUserInputToQuotes(csv?: string | Quotes.UserInput): Quote[] {
	// convert <1.19.0 json format to csv
	if (Array.isArray(csv)) {
		csv = oldJSONToCSV(csv)
	}

	const rows = csv?.split('\n') ?? []
	const arr: Quote[] = []

	for (const row of rows) {
		const [author, ...rest] = row.split(',')
		const content = rest.join(',').trimStart()

		arr.push({ author, content })
	}

	return arr
}

export function oldJSONToCSV(input: Quotes.UserInput): string {
	return input.map((val) => val.join(',')).join('\n')
}
