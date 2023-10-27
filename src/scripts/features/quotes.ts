import { canDisplayInterface, freqControl } from '..'
import superinput from '../utils/superinput'
import parse from '../utils/parse'
import storage from '../storage'

import { Local, Quote } from '../types/local'
import { Sync } from '../types/sync'

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

async function newQuoteFromAPI(lang: string, type: string) {
	try {
		if (!navigator.onLine || type === 'user') {
			return []
		}

		// Fetch a random quote from the quotes API
		const query = (type += type === 'classic' ? `/${lang}` : '')

		const response = await fetch('https://api.bonjourr.lol/quotes/' + query)
		const json = await response.json()

		if (response.ok) {
			return json
		}
	} catch (error) {
		console.warn(error)
		return []
	}
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

function controlCacheList(list: Quote[], lang: string, type: string) {
	//
	// User

	if (type === 'user') {
		const randIndex = Math.round(Math.random() * (list.length - 1))
		storage.local.set({ userQuoteSelection: randIndex })
		return list[randIndex]
	}

	//
	// APIs

	list.shift() // removes used quote
	storage.local.set({ quotesCache: list })

	if (list.length < 2) {
		newQuoteFromAPI(lang, type).then((list) => {
			storage.local.set({ quotesCache: list })
		})
	}

	return list[0]
}

async function UpdateQuotes({ author, frequency, type, userlist, refresh }: QuotesUpdate, { quotes, lang }: Sync) {
	let quotesCache = (await storage.local.get('quotesCache'))?.quotesCache ?? []

	async function handleQuotesType(type: string) {
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

	function handleUserListChange(userlist: string) {
		function validateUserQuotes(json: JSON) {
			return (
				Array.isArray(json) &&
				json.length > 0 &&
				json.every((val) => val.length === 2) &&
				json.flat().every((val) => typeof val === 'string')
			)
		}

		let array: [string, string][] = []
		let quote: Quote = { author: '', content: '' }

		if (userlist !== '') {
			let userJSON = parse(userlist)

			if (!userJSON) {
				userQuotesInput.warn('User quotes list is not valid JSON')
				return quotes.userlist
			}

			// if list is not valid, skip
			if (validateUserQuotes(userJSON) === false) {
				userQuotesInput.warn('Should look like: [["author", "quote"], ..., ...]')
				return quotes.userlist
			}

			array = userJSON
			quote = { author: array[0][0], content: array[0][1] }
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

	if (frequency) {
		quotes.frequency = frequency
	}

	if (type) {
		quotes.type = type
		handleQuotesType(type)
	}

	if (userlist) {
		quotes.userlist = handleUserListChange(userlist)
	}

	if (refresh) {
		quotes.last = freqControl.set()
		handleQuotesRefresh()
	}

	storage.sync.set({ quotes })
}

export default async function quotes(init: { sync: Sync; local: Local } | null, update?: QuotesUpdate) {
	if (update) {
		const data = await storage.sync.get(['lang', 'quotes'])
		UpdateQuotes(update, data as Sync)
	}

	if (!init) {
		return
	}

	const { lang, quotes } = init.sync
	const isUser = quotes.type === 'user'
	const needsNewQuote = freqControl.get(quotes.frequency, quotes.last)

	let userSel = init.local?.userQuoteSelection ?? 0
	let cache = init.local?.quotesCache ?? []
	let quote: Quote

	// First startup, create classic cache
	if (!cache || cache?.length === 0) {
		cache = await newQuoteFromAPI(lang, quotes.type)
		storage.local.set({ quotesCache: cache })
	}

	// If user quotes, replace cache
	if (isUser) {
		cache = userlistToQuotes(quotes.userlist)
	}

	// Frequence control, get new quote from controlCacheList
	if (needsNewQuote) {
		quotes.last = freqControl.set()
		quote = controlCacheList(cache, lang, quotes.type)
		storage.sync.set({ quotes })
	} else {
		quote = cache[isUser ? userSel : 0]
	}

	// Displays

	if (quotes.author) {
		document.getElementById('author')?.classList.add('always-on')
	}

	if (isUser && quotes.userlist) {
		insertToDom(userlistToQuotes(quotes.userlist!)[userSel])
	} else if (!isUser) {
		insertToDom(cache[0])
	}

	insertToDom(quote)
	document.getElementById('quotes_container')?.classList.toggle('hidden', !quotes.on)

	canDisplayInterface('quotes')
}
