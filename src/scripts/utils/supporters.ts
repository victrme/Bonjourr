import { getLang, tradThis } from '../utils/translations'
import onSettingsLoad from './onsettingsload'
import storage from '../storage'

interface SupportersUpdate {
	wasClosed?: boolean
	enabled?: boolean
	storedMonth?: number
}

const date = new Date() // prod
// const date = new Date('January 17, 2025 03:24:00') // testing

const currentMonth = date.getMonth() + 1
const currentYear = date.getFullYear()

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

export function supportersNotifications(init?: Sync.Supporters, update?: SupportersUpdate) {
	if (update) {
		updateSupportersOption(update)
		return
	}

	//
	if (init) {
		if (!init?.enabled) return

		const wasClosed = init?.wasClosed
		const storedMonth = init?.storedMonth

		// extracts notification template from index.html
		const template = document.getElementById('supporters-notif-template') as HTMLTemplateElement
		const doc = document.importNode(template.content, true)
		const supporters_notif = doc.getElementById('supporters-notif')

		// if it's a new month and notif was closed previously
		if (!supporters_notif || (currentMonth === storedMonth && wasClosed)) {
			return
		}

		const close = doc.getElementById('supporters-notif-close') as HTMLElement

		// resets closing and stores new month
		supportersNotifications(undefined, {
			wasClosed: false,
			storedMonth: currentMonth,
		})

		document.documentElement.setAttribute('supporters_notif_visible', '')

		onSettingsLoad(() => {
			const currentMonthLocale = date.toLocaleDateString(getLang(), { month: 'long' })
			const introString = `This <currentMonth>, Bonjourr is brought to you by our lovely supporters.`
			const notifTitle = doc.getElementById('supporters-notif-title')
			const notifButton = doc.getElementById('supporters-notif-button')

			if (notifTitle && notifButton) {
				notifTitle.textContent = tradThis(introString).replace('<currentMonth>', currentMonthLocale)
				notifButton.textContent = tradThis('Find out who they are')
			}

			// sets backgound image
			const background = monthBackgrounds[currentMonth - 1]
			supporters_notif.style.setProperty('--supporters-notif-background', `url(${background})`)

			document.querySelector('#settings-notifications')?.insertAdjacentElement('beforebegin', supporters_notif)

			// CSS needs the exact notification height for closing animation trick to work
			const mobileDragZone = document.querySelector('#mobile-drag-zone') as HTMLElement

			setVariableHeight(supporters_notif, mobileDragZone)
			window.onresize = () => setVariableHeight(supporters_notif, mobileDragZone)

			// inserts supporters modal dom
			supportersModal(true)

			notifButton?.onclickdown(function () {
				supportersModal(undefined, true)
				loadModalData()
			})
		})

		close?.onclickdown(function () {
			document.documentElement.removeAttribute('supporters_notif_visible')

			// updates data to not show notif again this month
			supportersNotifications(undefined, { wasClosed: true })

			// completely removes notif HTML after animation is done
			setTimeout(function () {
				supporters_notif.remove()
			}, 200)
		})
	}

	function getHeight(element: HTMLElement): number {
		const rect = element.getBoundingClientRect()
		const style = window.getComputedStyle(element)

		// Get the margins
		const marginTop = parseFloat(style.marginTop)
		const marginBottom = parseFloat(style.marginBottom)

		// Return the height including margins
		return rect.height + marginTop + marginBottom
	}

	function setVariableHeight(element: HTMLElement, mobileDragZone: HTMLElement) {
		const isMobileSettings = window.getComputedStyle(mobileDragZone).display === 'block' ? true : false
		const height = (getHeight(element) + (isMobileSettings ? 40 : 0)).toString()
		const notif = document.getElementById('supporters-notif')

		notif?.style.setProperty('--supporters-notif-height', `-${height}px`)
	}
}

async function updateSupportersOption(update: SupportersUpdate) {
	const data = await storage.sync.get()
	const newSupporters: any = { ...data.supporters }

	if (update.enabled !== undefined) {
		newSupporters.enabled = update.enabled
	}

	if (update.wasClosed !== undefined) {
		newSupporters.wasClosed = update.wasClosed
	}

	if (update.storedMonth !== undefined) {
		newSupporters.storedMonth = update.storedMonth
	}

	storage.sync.set({
		supporters: newSupporters,
	})
}

export function supportersModal(init?: boolean, state?: boolean) {
	if (init) {
		const template = document.getElementById('supporters-modal-template') as HTMLTemplateElement
		const doc = document.importNode(template.content, true)
		const supporters_modal = doc.getElementById('supporters-modal-container')

		if (supporters_modal) {
			onSettingsLoad(() => {
				tradTemplateString(doc, '#title', 'Supporters like you make Bonjourr possible')
				tradTemplateString(
					doc,
					'#desc',
					'Here are the wonderful people who supported us last month. Thanks to them, we can keep Bonjourr free, open source, and constantly evolving.'
				)
				tradTemplateString(doc, '#monthly #title', 'Our monthly supporters')
				tradTemplateString(doc, '#once #title', 'Our one-time supporters')
				tradTemplateString(doc, '#phrase', 'Join the community and get your name in Bonjourr.')
				tradTemplateString(doc, '#donate-button-text', 'Donate')

				const close = doc.getElementById('supporters-modal-close') as HTMLElement

				// inserts modal dom
				document.querySelector('#interface')?.insertAdjacentElement('beforebegin', supporters_modal)

				// close button event
				close.addEventListener('click', function () {
					supportersModal(undefined, false)
				})

				// close when click on background
				supporters_modal.addEventListener('click', function (event) {
					if ((event.target as HTMLElement)?.id === 'supporters-modal-container') {
						supportersModal(undefined, false)
					}
				})

				// close when esc key
				document.addEventListener('keyup', (event) => {
					if (event.key === 'Escape' && document.documentElement.hasAttribute('supporters_modal_open')) {
						supportersModal(undefined, false)
					}
				})
			})
		}
	}

	if (state !== undefined) {
		document.dispatchEvent(new Event('toggle-settings'))

		if (state) {
			document.documentElement.setAttribute('supporters_modal_open', '')
		} else {
			document.documentElement.removeAttribute('supporters_modal_open')
		}
	}
}

let modalDataLoaded = false
export async function loadModalData() {
	if (modalDataLoaded) return

	if (!document.body.className.includes('potato')) {
		initGlitter()
	}

	interface Supporter {
		date: string
		name: string
		amount: number
		monthly: boolean
		paidWith: string
		hashedEmail: string
	}

	let monthToGet: number
	let yearToGet: number = currentYear

	if (currentMonth === 1) {
		// january exception
		monthToGet = 12
		yearToGet = yearToGet - 1
	} else {
		monthToGet = currentMonth - 1
	}

	function injectError(string: string) {
		let main = document.querySelector('#supporters-modal main')
		if (main) main.innerHTML = `<i>${string}</i>`
	}

	function injectData(supporters: Supporter[] = []) {
		// sorts in descending order
		supporters.sort((a, b) => b.amount - a.amount)

		const monthlyFragment = document.createDocumentFragment()
		const onceFragment = document.createDocumentFragment()

		supporters.forEach((supporter) => {
			const li = document.createElement('li')
			li.innerHTML = supporter.name

			const targetFragment = supporter.monthly ? monthlyFragment : onceFragment
			targetFragment.appendChild(li)
		})

		document.querySelector('#supporters-modal #monthly #list')?.appendChild(monthlyFragment)
		document.querySelector('#supporters-modal #once #list')?.appendChild(onceFragment)

		console.info(`Loaded supporters data from ${monthToGet}/${yearToGet}.`)
	}

	try {
		let response: Response | undefined
		let supporters: Supporter[] = []
		response = await fetch(`https://kofi.bonjourr.fr/list?date=${monthToGet}/${yearToGet}`)

		if (!response.ok) {
			console.error(`HTTP error when fetching supporters list! status: ${response.status}`)
		} else {
			supporters = await response.json()
		}

		// removes loader
		document.querySelector('#supporters-modal')?.classList.add('loaded')

		if (supporters.length !== 0) {
			injectData(supporters)
		} else {
			console.error(`No supporters data found for ${monthToGet}/${yearToGet}`)
			injectError('An error occured or there were no supporters last month.')
		}
	} catch (error) {
		console.error('An error occurred:', error)
		injectError('An Internet connection is required to see the supporters names.')
	}

	modalDataLoaded = true
}

function tradTemplateString(doc: DocumentFragment, selector: string, text: string): void {
	const toTranslate = doc.querySelector(selector) as HTMLElement

	if (toTranslate) {
		toTranslate.innerText = tradThis(text)
	} else {
		console.error(`Error when trying to translate "${selector}"`)
	}
}

// glitter animation based off this: github.com/pweth/javascript-snow
function initGlitter() {
	const snowfall: {
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
		flakes: Array<ReturnType<typeof snowfall.snowflake>>
	} = {} as any

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

	window.addEventListener('resize', snowfall.setup)

	// Animation loop function
	snowfall.animate = () => {
		requestAnimationFrame(snowfall.animate)
		snowfall.context.clearRect(0, 0, snowfall.canvas.width, snowfall.canvas.height)
		for (let snowflake of snowfall.flakes) {
			snowflake.draw()
		}
	}

	// Let it snow!
	snowfall.setup()
	snowfall.animate()
}
