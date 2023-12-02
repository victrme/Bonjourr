import { canDisplayInterface, freqControl } from '..'
import { apiFetch } from '../utils'
import superinput from '../utils/superinput'
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

const userQuotesInput = superinput('i_qtlist')

function userlistToQuotes(arr: [string, string][] = [['', '']]): Quote[] {
	return arr?.map(([author, content]) => ({ author, content }))
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
		let list: Quote[] = []
		const { userlist } = quotes

		document.getElementById('quotes_userlist')?.classList.toggle('shown', type === 'user')

		const isUserAndEmpty = type === 'user' && !userlist
		if (isUserAndEmpty) return

		// Fetch quotes from API and display
		if (type !== 'user') {
			list = await newQuoteFromAPI(lang, type)
			storage.local.set({ quotesCache: list })
			insertToDom(list[0])
			return
		}

		const selection = (await storage.local.get('userQuoteSelection'))?.userQuoteSelection ?? 0
		list = userlistToQuotes(userlist!)
		insertToDom(list[selection])
	}

	function handleUserListChange(userlist: string): Quotes.UserInput | undefined {
		function isUserQuotesList(json: unknown): json is Quotes.UserInput {
			return (
				Array.isArray(json) &&
				json.length > 0 &&
				json.every((val) => val.length === 2) &&
				json.flat().every((val) => typeof val === 'string')
			)
		}

		let array: Quotes.UserInput = []
		let quote: Quote = { author: '', content: '' }

		if (userlist !== '') {
			let userJSON = parse<Quotes.UserInput>(userlist)

			if (!userJSON) {
				userQuotesInput.warn('User quotes list is not valid JSON')
				return quotes.userlist
			}

			if (!isUserQuotesList(userJSON)) {
				userQuotesInput.warn('Should look like: [["author", "quote"], ..., ...]')
				return quotes.userlist
			}

			array = userJSON
			quote = { author: array[0][0], content: array[0][1] }
			return array
		}

		insertToDom(quote)
		document.getElementById('i_qtlist')?.blur()
		storage.local.set({ userQuoteSelection: 0 })

		return array
	}

	function handleQuotesRefresh() {
		if (quotes.type === 'user') {
			if (!quotes.userlist) return
			quotesCache = userlistToQuotes(quotes.userlist)
		}

		const quote = controlCacheList(quotesCache, lang, quotes.type)
		insertToDom(quote)
	}

	if (author) {
		quotes.author = author
		document.getElementById('author')?.classList.toggle('always-on', author)
	}

	if (isEvery(frequency)) {
		quotes.frequency = frequency
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
		cache = userlistToQuotes(quotes.userlist)
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
		insertToDom(userlistToQuotes(quotes.userlist)[userSel])
	} else if (!isUser) {
		insertToDom(cache[0])
	}

	insertToDom(quote)

	document.getElementById('quotes_container')?.classList.toggle('hidden', !quotes.on)

	canDisplayInterface('quotes')
}
