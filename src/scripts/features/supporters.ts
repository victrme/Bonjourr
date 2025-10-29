import { tradThis } from '../utils/translations.ts'
import { onSettingsLoad } from '../utils/onsettingsload.ts'
import { onclickdown } from 'clickdown/mod'
import { debounce } from '../utils/debounce.ts'
import { storage } from '../storage.ts'

import type { Sync } from '../../types/sync.ts'

interface SupportersApi {
	date: string
	name: string
	amount: number
	monthly: boolean
	paidWith: string
	hashedEmail: string
}

interface SupportersUpdate {
	enabled?: boolean
	closed?: boolean
	month?: true
	translate?: true
}

const monthBackgrounds = [
	'https://images.unsplash.com/photo-1457269449834-928af64c684d?q=80&w=700&auto=format&fit=crop',
	'https://images.unsplash.com/photo-1613136391099-c2757009bb12?q=80&w=700&auto=format&fit=crop',
	'https://images.unsplash.com/photo-1457670912047-6ad4485d43eb?q=80&w=700&auto=format&fit=crop',
	'https://images.unsplash.com/photo-1528834342297-fdefb9a5a92b?q=80&w=700&auto=format&fit=crop',
	'https://images.unsplash.com/photo-1486608766848-9b9fe0c37b9d?q=80&w=700&auto=format&fit=crop',
	'https://images.unsplash.com/photo-1551516114-063f4cef7213?q=80&w=700&auto=format&fit=crop',
	'https://images.unsplash.com/photo-1577353716826-9151912dcdd1?q=80&w=700&auto=format&fit=crop',
	'https://images.unsplash.com/photo-1600699260196-aca47e6d2125?q=80&w=700&auto=format&fit=crop',
	'https://images.unsplash.com/photo-1508255139162-e1f7b7288ab7?q=80&w=700&auto=format&fit=crop',
	'https://images.unsplash.com/photo-1507834392452-0559ec185662?q=80&w=700&auto=format&fit=crop',
	'https://images.unsplash.com/photo-1505567745926-ba89000d255a?q=80&w=700&auto=format&fit=crop',
	'https://images.unsplash.com/photo-1513267257196-91be473829b3?q=80&w=700&auto=format&fit=crop',
]

let modalDataLoaded = false

export function supportersNotifications(init?: Sync, update?: SupportersUpdate) {
	if (update?.translate) {
		setNotifStrings()
		return
	}

	if (update) {
		updateSupportersOption(update)
		return
	}

	if (canShowSupporters(init)) {
		updateSupportersOption({
			closed: false,
			month: true,
		})

		onSettingsLoad(() => {
			initSupportersModal()
		})

		document.documentElement.dataset.supporters = ''
	}
}

function canShowSupporters(sync?: Sync): boolean {
	if (!sync?.supporters || !sync.supporters.enabled) {
		return false
	}

	const closed = sync?.supporters.closed
	const month = sync?.supporters.month
	const hasClosedReview = sync?.review === -1
	const currentMonth = new Date().getMonth() + 1
	const closedThisMonth = currentMonth === month && closed

	return hasClosedReview && !closed && !closedThisMonth
}

export function initSupportersSettingsNotif(sync: Sync) {
	if (!canShowSupporters(sync)) {
		return
	}

	const settingsNotifs = document.getElementById('supporters-notif-container')
	const settingsNotifContent = document.getElementById('supporters-notif-content')
	const notifClose = document.getElementById('supporters-notif-close')
	const image = monthBackgrounds[sync.supporters.month - 1]

	settingsNotifs?.classList.add('shown')
	settingsNotifs?.style.setProperty('--background', `url(${image})`)

	setNotifStrings()

	onclickdown(settingsNotifContent, (e) => {
		if (e instanceof PointerEvent && e.button !== 0) return // only left click
		toggleSupportersModal(true)

		onSettingsLoad(() => {
			loadModalData()
		})
		
	})

	onclickdown(notifClose, () => {
		delete document.documentElement.dataset.supporters
		settingsNotifs?.classList.remove('shown')
		updateSupportersOption({ closed: true })
	})
}

async function updateSupportersOption(update: SupportersUpdate) {
	const data = await storage.sync.get()

	if (update.enabled !== undefined) {
		data.supporters.enabled = update.enabled
	}
	if (update.closed !== undefined) {
		data.supporters.closed = update.closed
	}
	if (update.month !== undefined) {
		data.supporters.month = new Date().getMonth() + 1
	}

	storage.sync.set({ supporters: data.supporters })
}

function setNotifStrings() {
	const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });
	const introString = `This ${currentMonth}, Bonjourr is brought to you by our lovely supporters.`
	const notifTitle = document.getElementById('supporters-notif-title')
	const notifButton = document.getElementById('supporters-notif-button')

	if (notifTitle && notifButton) {
		notifTitle.textContent = tradThis(introString)
		notifButton.textContent = tradThis('Find out who they are')
	}
}

function initSupportersModal() {
	const template = document.getElementById('supporters-modal-template') as HTMLTemplateElement
	const doc = document.importNode(template.content, true)
	const supportersModal = doc.getElementById('supporters-modal-container') as HTMLElement

	tradTemplateString(doc, 'header h2 span', 'Supporters like you make Bonjourr possible')
	tradTemplateString(
		doc,
		'header p',
		'Here are the wonderful people who supported us last month. Thanks to them, we can keep Bonjourr free, open source, and constantly evolving.',
	)
	tradTemplateString(doc, '#supporters-monthly h3', 'Our monthly supporters')
	tradTemplateString(doc, '#supporters-once h3', 'Our one-time supporters')
	tradTemplateString(doc, 'footer p', 'Join the community and get your name in Bonjourr.')
	tradTemplateString(doc, 'footer a span', 'Donate')

	const close = doc.getElementById('supporters-modal-close') as HTMLElement

	// inserts modal dom
	document.querySelector('#interface')?.insertAdjacentElement('beforebegin', supportersModal)

	// close button event
	close.addEventListener('click', () => {
		toggleSupportersModal(false)
	})

	// close when click on background
	supportersModal.addEventListener('click', (event) => {
		if ((event.target as HTMLElement)?.id === 'supporters-modal-container') {
			toggleSupportersModal(false)
		}
	})

	// close when esc key
	document.addEventListener('keyup', (event) => {
		const hasDataset = document.documentElement.dataset.supportersModal !== undefined
		const isEscape = event.key === 'Escape'

		if (isEscape && hasDataset) {
			toggleSupportersModal(false)
		}
	})
}

function toggleSupportersModal(toggle: boolean) {
	document.dispatchEvent(new CustomEvent('toggle-settings'))

	if (toggle) {
		document.documentElement.dataset.supportersModal = ''
	} else {
		delete document.documentElement.dataset.supportersModal
	}
}

export async function loadModalData() {
	if (modalDataLoaded) {
		return
	}

	if (!document.body.className.includes('potato')) {
		initGlitter()
	}

	const currentMonth = new Date().getMonth() + 1
	const currentYear = new Date().getFullYear()
	const isJanuary = currentMonth === 1
	let monthToGet: number
	let yearToGet: number = currentYear

	if (isJanuary) {
		monthToGet = 12
		yearToGet -= 1
	} else {
		monthToGet = currentMonth - 1
	}

	const modal = document.querySelector('#supporters-modal')
	const main = document.querySelector('#supporters-modal main')
	const monthly = document.querySelector('#supporters-monthly ul')
	const once = document.querySelector('#supporters-once ul')

	try {
		const url = `https://kofi.bonjourr.fr/list?date=${yearToGet}-${monthToGet}`
		const supporters: SupportersApi[] = await (await fetch(url))?.json()

		if (supporters.length > 0) {
			supporters.sort((a, b) => b.amount - a.amount)

			for (const supporter of supporters) {
				const parent = supporter.monthly ? monthly : once
				const li = `<li>${supporter.name}</li>`

				parent?.insertAdjacentHTML('beforeend', li)
			}

			modal?.classList.add('loaded')
		}
	} catch (_error) {
		if (main) {
			main.innerHTML = `<i>An error occured or we might be offline!</i>`
		}
	}

	modalDataLoaded = true
}

function tradTemplateString(doc: DocumentFragment, selector: string, text: string): void {
	const toTranslate = doc.querySelector(selector) as HTMLElement

	if (toTranslate) {
		toTranslate.innerText = tradThis(text)
	}
}

// glitter animation based off this: github.com/pweth/javascript-snow
function initGlitter() {
	interface Snowfall {
		canvas: HTMLCanvasElement
		context: CanvasRenderingContext2D
		snowflake: new () => {
			size: number
			x: number
			baseX: number
			distance: number
			opacity: number
			radians: number
			fallSpeed: number
			y: number
			draw: () => void
		}
		setup: () => void
		animate: () => void
		flakes: InstanceType<typeof snowfall.snowflake>[]
	}

	//@ts-expect-error: Type '{}' is missing properties from type Snowfall ...
	const snowfall: Snowfall = {}

	snowfall.canvas = document.getElementById('glitter') as HTMLCanvasElement
	snowfall.context = snowfall.canvas.getContext('2d') as CanvasRenderingContext2D

	// Snowflake constructor
	snowfall.snowflake = class {
		size: number
		x: number
		baseX: number
		distance: number
		opacity: number
		radians: number
		fallSpeed: number
		y: number

		constructor() {
			this.size = Math.random() * 1.5 + 1.5
			this.x = Math.random() * snowfall.canvas.width - this.size - 1 + this.size + 1
			this.baseX = this.x
			this.distance = Math.random() * 50 + 1
			this.opacity = Math.random()
			this.radians = Math.random() * Math.PI * 2
			this.fallSpeed = Math.random() * 1.5 + 0.5
			this.y = Math.random() * snowfall.canvas.height - this.size - 1 + this.size + 1
		}

		draw = () => {
			// Moves snowflakes down the screen, pushing them to the top when they go off the canvas

			if (this.y > snowfall.canvas.height + this.size) {
				this.y = -this.size
			} else {
				this.y += this.fallSpeed
			}
			// Side to side motion on snowflakes
			this.radians += 0.02
			this.x = this.baseX + this.distance * Math.sin(this.radians)

			// Apply the shadow blur for the blurry effect
			snowfall.context.beginPath()
			snowfall.context.arc(this.x, this.y, this.size, 0, Math.PI * 2) // Draws a circle

			// Apply shadow blur and color
			snowfall.context.shadowBlur = 8 // Adjust blur amount
			snowfall.context.shadowColor = `rgba(255, 202, 56, ${this.opacity})` // Shadow color (same as snowflake color)

			snowfall.context.fillStyle = `rgba(255, 202, 56, ${this.opacity})` // Sets the fill color
			snowfall.context.fill() // Fills the circle with the color
			snowfall.context.closePath() // Closes the path

			// Reset the shadow properties for the next frame
			snowfall.context.shadowBlur = 0
			snowfall.context.shadowColor = 'transparent'
		}
	}

	// Initial setup function
	snowfall.setup = () => {
		const particleDivisor = 20000 // the higher this number, the lower number of particles
		snowfall.canvas.width = snowfall.context.canvas.clientWidth
		snowfall.canvas.height = snowfall.context.canvas.clientHeight
		snowfall.flakes = []
		for (let x = 0; x < Math.ceil((snowfall.canvas.width * snowfall.canvas.height) / particleDivisor); x++) {
			//
			snowfall.flakes.push(new snowfall.snowflake())
		}
	}

	const snowfallDebounce = debounce(snowfall.setup, 200)

	globalThis.addEventListener('resize', snowfallDebounce)

	// Animation loop function
	snowfall.animate = () => {
		requestAnimationFrame(snowfall.animate)
		snowfall.context.clearRect(0, 0, snowfall.canvas.width, snowfall.canvas.height)
		for (const snowflake of snowfall.flakes) {
			snowflake.draw()
		}
	}

	// Let it snow!
	snowfall.setup()
	snowfall.animate()
}
