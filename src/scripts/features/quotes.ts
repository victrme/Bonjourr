import { Quote } from '../types/local'
import { Sync } from '../types/sync'

import { canDisplayInterface, freqControl } from '..'
import { $ } from '../utils'
import storage from '../storage'
import parse from '../utils/JSONparse'

type QuotesUpdate = {
	toggle?: boolean
	author?: boolean
	refresh?: true
	type?: string
	userlist?: string
	frequency?: string
}

function getUserQuoteSelection() {
	return parseInt(localStorage.userQuoteSelection || '0')
}

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

		const API = Math.random() > 0.5 ? '@@QUOTES_API_1' : '@@QUOTES_API_2'

		const response = await fetch(atob(API) + query)
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
		localStorage.setItem('userQuoteSelection', JSON.stringify(randIndex))
		return list[randIndex]
	}

	//
	// APIs

	list.shift() // removes used quote
	localStorage.setItem('quotesCache', JSON.stringify(list))

	if (list.length < 2) {
		newQuoteFromAPI(lang, type).then((list) => {
			localStorage.setItem('quotesCache', JSON.stringify(list))
		})
	}

	return list[0]
}

function UpdateQuotes({ author, frequency, type, userlist, refresh }: QuotesUpdate, { quotes, lang }: Sync) {
	let quotesCache = parse(localStorage.quotesCache) ?? []

	async function handleQuotesType(type: string) {
		let list: Quote[] = []
		const { userlist } = quotes

		document.getElementById('quotes_userlist')?.classList.toggle('shown', type === 'user')

		const isUserAndEmpty = type === 'user' && !userlist
		if (isUserAndEmpty) return

		// Fetch quotes from API and display
		if (type !== 'user') {
			list = await newQuoteFromAPI(lang, type)
			localStorage.setItem('quotesCache', JSON.stringify(list))
			insertToDom(list[0])
			return
		}

		const selection = getUserQuoteSelection()
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

		function inputError(log: string) {
			;($('i_qtlist') as HTMLInputElement).value = ''
			console.log(log)
		}

		let array: [string, string][] = []
		let quote: Quote = { author: '', content: '' }

		if (userlist !== '') {
			let userJSON = parse(userlist)

			if (!userJSON) {
				inputError('User quotes list is not valid JSON')
				return quotes.userlist
			}

			// if list is not valid, skip
			if (validateUserQuotes(userJSON) === false) {
				inputError('User quotes list is not of type [string, string][]')
				return quotes.userlist
			}

			array = userJSON
			quote = { author: array[0][0], content: array[0][1] }
		}

		insertToDom(quote)
		document.getElementById('i_qtlist')?.blur()
		localStorage.setItem('userQuoteSelection', '0')

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

	storage.set({ quotes })
}

export default async function quotes(init: Sync | null, update?: QuotesUpdate) {
	if (update) {
		const data = await storage.get(['lang', 'quotes'])
		UpdateQuotes(update, data as Sync)
	}

	if (!init) {
		return
	}

	const { lang, quotes } = init
	const isUser = quotes.type === 'user'
	const needsNewQuote = freqControl.get(quotes.frequency, quotes.last)

	let userSel = getUserQuoteSelection()
	let cache = parse(localStorage.quotesCache) ?? []
	let quote: Quote

	// First startup, create classic cache
	if (!cache || cache?.length === 0) {
		cache = await newQuoteFromAPI(lang, quotes.type)
		localStorage.setItem('quotesCache', JSON.stringify(cache))
	}

	// If user quotes, replace cache
	if (isUser) {
		cache = userlistToQuotes(quotes.userlist) // force because list check is above
	}

	// Frequence control, get new quote from controlCacheList
	if (needsNewQuote) {
		quotes.last = freqControl.set() // updates last quotes timestamp
		quote = controlCacheList(cache, lang, quotes.type)
		storage.set({ quotes })
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
