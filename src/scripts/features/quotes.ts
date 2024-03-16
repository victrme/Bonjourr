import { apiFetch, freqControl, isEvery } from '../utils'
import { displayInterface } from '../index'
import networkForm from '../utils/networkform'
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

const quotesTypeForm = networkForm('f_qttype')

export default async function quotes(init?: QuotesInit, update?: QuotesUpdate) {
	if (update) {
		updateQuotes(update)
		return
	}

	if (!init) {
		return
	}

	const { lang, quotes } = init.sync
	const needsNewQuote = freqControl.get(quotes.frequency, quotes.last)

	let list = init.local?.quotesCache ?? []
	let selection = init.local?.userQuoteSelection ?? 0
	let quote: Quote = list[0]

	const noCache = !list || list?.length === 0
	const isUser = quotes.type === 'user'

	if (noCache) {
		list = await newQuoteFromAPI(lang, quotes.type)
		quote = list[0]
		storage.local.set({ quotesCache: list })
	}

	if (isUser) {
		list = csvUserInputToQuotes(quotes.userlist)
		quote = list[selection]
	}

	if (needsNewQuote) {
		quotes.last = freqControl.set()
		quote = controlCacheList(list, lang, quotes.type)
		storage.sync.set({ quotes })
	}

	insertToDom(quote)
	toggleAuthorAlwaysOn(quotes.author)

	document.getElementById('quotes_container')?.classList.toggle('hidden', !quotes.on)

	displayInterface('quotes')
}

//
// ─── UPDATE
//

async function updateQuotes({ author, frequency, type, userlist, refresh }: QuotesUpdate) {
	const data = await storage.sync.get(['lang', 'quotes'])
	const local = await storage.local.get('quotesCache')

	if (author !== undefined) {
		data.quotes.author = author
		toggleAuthorAlwaysOn(author)
	}

	if (userlist) {
		data.quotes.userlist = handleUserListChange(userlist)
	}

	if (refresh) {
		data.quotes.last = freqControl.set()
		refreshQuotes(data, local?.quotesCache)
	}

	if (isEvery(frequency)) {
		data.quotes.frequency = frequency
	}

	if (isQuotesType(type)) {
		data.quotes.type = type
		updateQuotesType(data, type)
	}

	storage.sync.set({ quotes: data.quotes })
}

async function updateQuotesType(data: Sync.Storage, type: Quotes.Sync['type']) {
	const isUser = type === 'user'
	let list: Quote[] = []
	let selection = 0

	if (isUser && data.quotes.userlist) {
		const local = await storage.local.get('userQuoteSelection')
		selection = local?.userQuoteSelection ?? 0
		list = csvUserInputToQuotes(data.quotes.userlist)
	}

	if (!isUser) {
		quotesTypeForm.load()

		list = await newQuoteFromAPI(data.lang, type)
		storage.local.set({ quotesCache: list })
	}

	if (list.length > 0) {
		insertToDom(list[selection])
	}

	document.getElementById('quotes_userlist')?.classList.toggle('shown', isUser)
	quotesTypeForm.accept()
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

function refreshQuotes(data: Sync.Storage, list: Local.Storage['quotesCache'] = []) {
	if (data.quotes.type === 'user' && data.quotes.userlist) {
		list = csvUserInputToQuotes(data.quotes.userlist)
	}

	insertToDom(controlCacheList(list, data.lang, data.quotes.type))
}

//
// ─── API / STORAGE
//

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

function controlCacheList(list: Quote[], lang: string, type: Quotes.Sync['type']): Quote {
	//
	if (type === 'user') {
		const randIndex = Math.round(Math.random() * (list.length - 1))
		storage.local.set({ userQuoteSelection: randIndex })
		return list[randIndex]
	}

	if (list.length > 1) {
		list.shift()
		storage.local.set({ quotesCache: list })
	}

	if (list.length < 2) {
		newQuoteFromAPI(lang, type).then((list) => {
			storage.local.set({ quotesCache: list })
		})
	}

	return list[0]
}

//
// ─── DOM
//

function toggleAuthorAlwaysOn(state: boolean) {
	document.getElementById('author')?.classList.toggle('always-on', state)
}

function insertToDom(quote?: Quote) {
	const quoteDOM = document.getElementById('quote')
	const authorDOM = document.getElementById('author')

	if (!quote || !quoteDOM || !authorDOM) {
		return
	}

	quoteDOM.textContent = quote.content
	authorDOM.textContent = quote.author
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

function isQuotesType(type = ''): type is Quotes.Types {
	const types: Quotes.Types[] = ['classic', 'kaamelott', 'inspirobot', 'user']
	return types.includes(type as Quotes.Types)
}
