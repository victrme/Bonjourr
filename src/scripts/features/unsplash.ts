import { $, tradThis, periodOfDay, turnRefreshButton, localDefaults, syncDefaults } from '../utils'
import { imgBackground, sunTime, freqControl } from '..'
import errorMessage from '../utils/errorMessage'
import storage from '../storage'

import { DynamicCache } from '../types/local'
import { Dynamic } from '../types/sync'
import UnsplashImage from '../types/unsplashImage'

export default async function unsplash(
	init: Dynamic | null,
	event?: {
		is: string
		value?: string
		button?: HTMLSpanElement | null
	}
) {
	// TODO: Separate Collection type with users string
	type CollectionType = 'night' | 'noon' | 'day' | 'evening' | 'user'

	function getCache() {
		try {
			return JSON.parse(localStorage.dynamicCache) as DynamicCache
		} catch (e) {
			return { ...localDefaults.dynamicCache }
		}
	}

	async function preloadImage(src: string) {
		const img = new Image()

		img.src = src
		await img.decode()
		img.remove()

		return
	}

	function imgCredits(image: UnsplashImage) {
		//
		// Filtering
		const domcredit = $('credit')
		let needsSpacer = false
		let artist = ''
		let photoLocation = ''
		let exifDescription = ''
		const referral = '?utm_source=Bonjourr&utm_medium=referral'
		const { city, country, name, username, link, exif } = image

		if (!city && !country) {
			photoLocation = tradThis('Photo by ')
		} else {
			if (city) photoLocation = city + ', '
			if (country) {
				photoLocation += country
				needsSpacer = true
			}
		}

		if (exif) {
			const orderedExifData = [
				{ key: 'model', format: `%val% - ` },
				{ key: 'aperture', format: `f/%val% ` },
				{ key: 'exposure_time', format: `%val%s ` },
				{ key: 'iso', format: `ISO %val% ` },
				{ key: 'focal_length', format: `%val%mm` },
			]

			orderedExifData.forEach(({ key, format }) => {
				if (Object.keys(exif).includes(key)) {
					const exifVal = exif[key as keyof typeof exif]

					if (exifVal) {
						exifDescription += key === 'iso' ? exifVal.toString() : format.replace('%val%', exifVal.toString())
					}
				}
			})
		}

		// Force Capitalization
		artist = name
			.split(' ')
			.map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLocaleLowerCase())
			.join(' ')

		// DOM element

		const locationDOM = document.createElement('a')
		const spacerDOM = document.createElement('span')
		const artistDOM = document.createElement('a')
		const exifDOM = document.createElement('p')

		exifDOM.className = 'exif'
		exifDOM.textContent = exifDescription
		locationDOM.textContent = photoLocation
		artistDOM.textContent = artist
		spacerDOM.textContent = ` - `

		locationDOM.href = link + referral
		artistDOM.href = 'https://unsplash.com/@' + username + referral

		if (domcredit) {
			domcredit.textContent = ''

			domcredit.appendChild(exifDOM)
			domcredit.appendChild(locationDOM)
			if (needsSpacer) domcredit.appendChild(spacerDOM)
			domcredit.appendChild(artistDOM)

			document.getElementById('creditContainer')?.classList.toggle('shown', true)
		}
	}

	function loadBackground(props: UnsplashImage) {
		imgBackground(props.url, props.color)
		imgCredits(props)

		// sets meta theme-color to main background's color
		document.querySelector('meta[name="theme-color"]')?.setAttribute('content', props.color)
	}

	async function requestNewList(collecType: CollectionType) {
		const header = new Headers()
		const collecString = allCollectionType[collecType] || allCollectionType.day
		const url = `https://api.unsplash.com/photos/random?collections=${collecString}&count=8`
		header.append('Authorization', `Client-ID @@UNSPLASH_API`)
		header.append('Accept-Version', 'v1')

		let resp: Response
		let json: JSON[]

		resp = await fetch(url, { headers: header })

		if (resp.status === 404) {
			if (collecType === 'user') {
				const defaultCollectionList: UnsplashImage[] = await requestNewList(chooseCollection() || 'day')
				return defaultCollectionList
			} else {
				return []
			}
		}

		json = await resp.json()

		if (json.length === 1) {
			const defaultCollectionList: UnsplashImage[] = await requestNewList(chooseCollection() || 'day')
			return defaultCollectionList
		}

		const filteredList: UnsplashImage[] = []
		const { width, height } = screen
		const dpr = window.devicePixelRatio

		// Increase compression with pixel density
		// https://docs.imgix.com/tutorials/responsive-images-srcset-imgix#use-variable-quality
		const quality = Math.min(100 - dpr * 20, 75)

		json.forEach((img: any) => {
			filteredList.push({
				url: `${img.urls.raw}&w=${width}&h=${height}&dpr=${dpr}&auto=format&q=${quality}&fit=crop`,
				link: img.links.html,
				username: img.user.username,
				name: img.user.name,
				city: img.location.city,
				country: img.location.country,
				color: img.color,
				exif: img.exif,
				desc: img.description,
			})
		})

		return filteredList
	}

	function chooseCollection(customCollection?: string): CollectionType {
		if (customCollection) {
			customCollection = customCollection.replaceAll(` `, '')
			allCollectionType.user = customCollection
			return 'user'
		}

		return periodOfDay(sunTime())
	}

	function collectionUpdater(dynamic: Dynamic): CollectionType {
		const { every, lastCollec, collection } = dynamic
		const pause = every === 'pause'
		const day = every === 'day'

		if ((pause || day) && lastCollec) {
			return lastCollec // Keeps same collection on >day so that user gets same type of backgrounds
		}

		const collec = chooseCollection(collection) // Or updates collection with sunTime or user collec
		dynamic.lastCollec = collec

		if (collec !== lastCollec) {
			storage.sync.set({ dynamic: dynamic }, () => console.warn('bad'))
		}

		return collec
	}

	async function populateEmptyList(collecType: CollectionType, cache: DynamicCache) {
		const newList = await requestNewList(collecType)

		if (!newList) {
			return // Don't save dynamicCache if request failed, also don't preload nothing
		}

		await preloadImage(newList[0].url)
		loadBackground(newList[0])

		cache[collecType] = newList
		localStorage.setItem('dynamicCache', JSON.stringify(cache))
		sessionStorage.setItem('waitingForPreload', 'true')

		//preload
		await preloadImage(newList[1].url)
		sessionStorage.removeItem('waitingForPreload')
	}

	async function cacheControl(dynamic: Dynamic, collecType: CollectionType) {
		const needNewImage = freqControl.get(dynamic.every, dynamic.time)
		const cache = getCache()
		let list = cache[collecType]

		if (cache[collecType].length === 0) {
			populateEmptyList(collecType, cache)
			return
		}

		if (sessionStorage.waitingForPreload) {
			loadBackground(list[0])
			await preloadImage(list[1].url) // Is trying to preload next
			sessionStorage.removeItem('waitingForPreload')
			return
		}

		if (!needNewImage) {
			loadBackground(list[0]) // No need for new, load the same image
			return
		}

		// Needs new image, Update time
		dynamic.lastCollec = collecType
		dynamic.time = freqControl.set()

		// Removes previous image from list
		if (list.length > 1) list.shift()

		// Load new image
		loadBackground(list[0])

		// If end of cache, get & save new list
		if (list.length === 1 && navigator.onLine) {
			const newList = await requestNewList(collecType)

			if (newList) {
				cache[collecType] = list.concat(newList)
				await preloadImage(newList[0].url)
				localStorage.setItem('dynamicCache', JSON.stringify(cache))
				sessionStorage.removeItem('waitingForPreload')
			}

			return
		}

		if (list.length > 1) await preloadImage(list[1].url) // Or preload next

		storage.sync.set({ dynamic: dynamic })
		localStorage.setItem('dynamicCache', JSON.stringify(cache))
		sessionStorage.removeItem('waitingForPreload')
	}

	async function updateDynamic(event: { is: string; value?: string; button?: HTMLSpanElement | null }) {
		const dynamicCache = getCache()
		const dynamic =
			((await new Promise((resolve) => {
				storage.sync.get('dynamic', (data) => resolve(data?.dynamic))
			})) as Dynamic) ?? structuredClone(syncDefaults.dynamic)

		switch (event.is) {
			case 'refresh': {
				if (!event.button) return console.log('No buttons to animate')

				// Only refreshes background if preload is over
				// If not, animate button to show it is trying
				if (!sessionStorage.waitingForPreload) {
					turnRefreshButton(event.button, true)

					const newDynamic = { ...dynamic, time: 0 }
					storage.sync.set({ dynamic: newDynamic })
					sessionStorage.setItem('waitingForPreload', 'true')

					setTimeout(() => {
						sessionStorage.removeItem('waitingForPreload')
						cacheControl(newDynamic, collectionUpdater(newDynamic))
					}, 400)

					return
				}

				turnRefreshButton(event.button, false)
				break
			}

			case 'every': {
				// Todo: fix bad manual value check
				if (!event.value || !event.value.match(/tabs|hour|day|period|pause/g)) {
					return console.log('Not valid "every" value')
				}

				dynamic.every = event.value
				dynamic.time = freqControl.set()
				storage.sync.set({ dynamic })
				break
			}

			// Back to dynamic and load first from chosen collection
			case 'removedCustom': {
				const firstImageFromCache = dynamicCache[collectionUpdater(dynamic)][0]
				loadBackground(firstImageFromCache)
				storage.sync.set({ background_type: 'dynamic' })
				break
			}

			// Always request another set, update last time image change and load background
			case 'collection': {
				if (!navigator.onLine || typeof event.value !== 'string') return

				// remove user collec
				if (event.value === '') {
					const defaultColl = chooseCollection()
					dynamicCache.user = []
					dynamic.collection = ''
					dynamic.lastCollec = defaultColl

					storage.sync.set({ dynamic })
					localStorage.setItem('dynamicCache', JSON.stringify(dynamicCache))

					unsplash(dynamic)
					return
				}

				// add new collec
				dynamic.collection = event.value
				dynamic.lastCollec = 'user'
				dynamic.time = freqControl.set()
				storage.sync.set({ dynamic })

				populateEmptyList(chooseCollection(event.value), dynamicCache)
				break
			}
		}
	}

	// collections source: https://unsplash.com/@bonjourr/collections
	const allCollectionType = {
		noon: 'GD4aOSg4yQE',
		day: 'o8uX55RbBPs',
		evening: '3M2rKTckZaQ',
		night: 'bHDh4Ae7O8o',
		user: '',
	}

	if (event) {
		updateDynamic(event)
		return
	}

	if (init) {
		try {
			cacheControl(init, collectionUpdater(init))
		} catch (e) {
			errorMessage(e)
		}
	}

	return
}
