import { getVnCalendar } from '../../dependencies/vietnamese-calendar.ts'
import { getLang } from '../../utils/translations.ts'

import type { Sync } from '../../../types/sync.ts'

export type DateFormat = Sync['dateformat']

export function clockDate(wrapper: HTMLElement, date: Date, dateformat: DateFormat, timezone: string) {
	const datedom = wrapper.querySelector('.clock-date') as HTMLElement
	const aa = wrapper.querySelector('.clock-date-aa') as HTMLElement
	const bb = wrapper.querySelector('.clock-date-bb') as HTMLElement
	const cc = wrapper.querySelector('.clock-date-cc') as HTMLElement
	const secondary = wrapper.querySelector('.clock-date-secondary') as HTMLElement

	const lang = getLang().replaceAll('_', '-')

	const day = new Intl.DateTimeFormat(lang, { day: 'numeric' }).format(date)
	const month = new Intl.DateTimeFormat(lang, { month: 'long' }).format(date)
	const weekday = new Intl.DateTimeFormat(lang, { weekday: 'long' }).format(date)

	datedom.classList.remove('eu', 'us', 'cn')
	datedom.classList.add(dateformat)

	if (dateformat === 'auto') {
		const intl = new Intl.DateTimeFormat(lang, { weekday: 'long', month: 'long', day: 'numeric' })
		aa.textContent = intl.format(date)
		bb.textContent = ''
		cc.textContent = ''
	}

	if (dateformat === 'eu') {
		aa.textContent = weekday
		bb.textContent = day
		cc.textContent = month
	}

	if (dateformat === 'us') {
		aa.textContent = weekday
		bb.textContent = month
		cc.textContent = day
	}

	if (dateformat === 'cn') {
		aa.textContent = month
		bb.textContent = day
		cc.textContent = weekday
	}

	if (lang === 'vi' && (timezone === 'auto' || timezone === 'Asia/Ho_Chi_Minh')) {
		secondary.textContent = getVnCalendar(date)
	} else {
		secondary.textContent = ''
	}
}
