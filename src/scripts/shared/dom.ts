export function toggleDisabled(element: Element | null, force?: boolean) {
	if (element) {
		const toggle = force !== undefined ? force : typeof element.getAttribute('disabled') === 'string'

		if (toggle) {
			element.setAttribute('disabled', '')
		} else {
			element.removeAttribute('disabled')
		}
	}
}

export function getSplitRangeData(id: string): { range?: string; button?: string } {
	const wrapper = document.querySelector<HTMLInputElement>(`#${id.replace('#', '')}`)
	const range = wrapper?.querySelector<HTMLInputElement>('input')
	const button = wrapper?.querySelector<HTMLElement>('button')
	const span = wrapper?.querySelectorAll<HTMLElement>('span')
	const isButtonOn = button?.classList?.contains('on')

	return {
		range: range?.value,
		button: span?.[isButtonOn ? 1 : 0].dataset.value,
	}
}

// goodbye typescript, you will be missed
export function getHTMLTemplate<T>(id: string, selector: string): T {
	const template = document.getElementById(id) as HTMLTemplateElement
	const clone = template?.content.cloneNode(true) as Element

	return clone?.querySelector(selector) as T
}

// getting .composedPath equivalent of touch events
export function getComposedPath(target: EventTarget | null): HTMLElement[] {
	if (!target) {
		return []
	}

	const path: HTMLElement[] = []
	let node = target as HTMLElement | null

	while (node) {
		path.push(node)
		node = node.parentElement
	}

	return path
}

export function turnRefreshButton(event: Event, canTurn: boolean) {
	let target = event.target as Element

	if (target.tagName === 'path' && target.parentElement) target = target.parentElement
	if (target.tagName !== 'svg' && target.firstElementChild) target = target.firstElementChild
	if (target.tagName !== 'svg' && target.firstElementChild) target = target.firstElementChild

	target?.animate(
		canTurn
			? [{ transform: 'rotate(360deg)' }]
			: [{ transform: 'rotate(0deg)' }, { transform: 'rotate(90deg)' }, { transform: 'rotate(0deg)' }],
		{ duration: 600, easing: 'ease-out' },
	)
}

export function fadeOut() {
	const dominterface = document.getElementById('interface') as HTMLElement
	dominterface.click()
	dominterface.style.transition = 'opacity .4s'

	setTimeout(() => {
		dominterface.style.opacity = '0'
	})

	setTimeout(() => {
		location.reload()
	}, 400)
}

export const inputThrottle = (elem: HTMLInputElement, time = 800) => {
	let isThrottled = true

	setTimeout(() => {
		isThrottled = false
		elem.removeAttribute('disabled')
	}, time)

	if (isThrottled) {
		elem.setAttribute('disabled', '')
	}
}

export function hexColorFromSplitRange(id: string): string {
	const { range, button } = getSplitRangeData(id)

	const opacity = Number.parseInt(range ?? '0')
	const color = button === 'dark' ? '#000' : '#fff'
	const alpha = opacity.toString(16)

	return color + alpha
}
