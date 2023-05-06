import { Quote, Local } from '../types/local'
import { Sync } from '../types/sync'

import { canDisplayInterface, freqControl } from '..'
import { $, clas } from '../utils'
import storage from '../storage'

function getCache() {
	return JSON.parse(localStorage.quotesCache ?? '[]')
}

function getUserQuoteSelection() {
	return parseInt(localStorage.userQuoteSelection || '0')
}

function userlistToQuotes(arr: [string, string][] = [['', '']]): Quote[] {
	return arr?.map(([author, content]) => ({ author, content }))
}

async function newQuoteFromAPI(lang: string, type: string) {
	try {
		if (!navigator.onLine) {
			return []
		}

		// Fetch a random quote from the quotes API
		const query = (type += type === 'classic' ? `/${lang}` : '')

		const day = new Date().getDay() % 3
		const API = day === 0 ? '@@QUOTES_API_1' : day === 1 ? '@@QUOTES_API_2' : '@@QUOTES_API_3'

		const response = await fetch(API + query)
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

export default async function quotes(
	init: Sync | null,
	update?: {
		is: 'toggle' | 'author' | 'frequency' | 'type' | 'refresh' | 'userlist'
		value?: string
		checked?: boolean
	}
) {
	function updateSettings({
		lang,
		quotes,
		quotesCache,
	}: {
		lang: string
		quotes: Sync['quotes']
		quotesCache: Local['quotesCache']
	}) {
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
				let userJSON = []

				try {
					userJSON = JSON.parse(userlist)
				} catch (error) {
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

		const updated = { ...quotes }
		const { checked, value } = update! // force because updateSettings is only called after update check

		switch (update?.is) {
			case 'author': {
				if (typeof checked !== 'boolean') return
				updated.author = checked
				clas($('author'), checked, 'always-on')
				break
			}

			case 'frequency': {
				if (!value) return
				updated.frequency = value
				break
			}

			case 'type': {
				if (!value) return
				updated.type = value
				handleQuotesType(value)
				break
			}

			case 'userlist': {
				if (typeof value !== 'string') return
				updated.userlist = handleUserListChange(value)
				break
			}

			case 'refresh': {
				updated.last = freqControl.set()
				handleQuotesRefresh()
				break
			}
		}

		storage.sync.set({ quotes: updated })
	}

	// get sync & local, update, and quit
	if (update) {
		storage.sync.get(['lang', 'quotes'], async (data) => {
			const { lang, quotes } = data as Sync
			const quotesCache = getCache()
			updateSettings({ quotes, lang, quotesCache })
		})
		return
	}

	// Cache:
	// storage.local = { quotesCache: Array(20) }
	// NeedsNewQuote: Removes first element of the list
	// if list is too small, fetches new batch of quotes
	// All quotes type share the same cache
	// changing quotes type fetches new batch

	if (!init) {
		return
	}

	const { lang, quotes } = init
	const isUser = quotes.type === 'user'
	const needsNewQuote = freqControl.get(quotes.frequency, quotes.last)

	let userSel = getUserQuoteSelection()
	let cache = getCache()
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
