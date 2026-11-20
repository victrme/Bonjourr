import { getVnCalendar } from '../../dependencies/vietnamese-calendar.ts'
import { getLang } from '../../utils/translations.ts'

import type { Sync } from '../../../types/sync.ts'

export type DateFormat = Sync['dateformat']

export function clockDate(
    wrapper: HTMLElement,
    date: Date,
    dateformat: DateFormat,
    timezone: string,
    customdatestring?: string,
): void {
    const datedom = wrapper.querySelector('.clock-date') as HTMLElement
    const aa = wrapper.querySelector('.clock-date-aa') as HTMLElement
    const bb = wrapper.querySelector('.clock-date-bb') as HTMLElement
    const cc = wrapper.querySelector('.clock-date-cc') as HTMLElement
    const custom = wrapper.querySelector('.clock-date-custom') as HTMLElement
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

    if (dateformat === 'custom' && customdatestring) {
        custom.textContent = customFormatDate(date, customdatestring, lang)
    }

    if (lang === 'vi' && (timezone === 'auto' || timezone === 'Asia/Ho_Chi_Minh')) {
        secondary.textContent = getVnCalendar(date)
    } else {
        secondary.textContent = ''
    }
}

// for custom dates
type DateFormatter = (date: Date, locale: string) => string | number

// custom implementation of PHP's date formatter
// loosely inspired by https://gist.github.com/kubiqsk/c60207a3075104df7cc1822a95053ecd
const dateTokens: Record<string, DateFormatter | undefined> = {
    // Day
    d: date => String(date.getDate()).padStart(2, '0'),
    j: date => date.getDate(),

    // Weekday
    D: (date, locale) =>
        new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date),
    l: (date, locale) =>
        new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date),

    // Month
    m: date => String(date.getMonth() + 1).padStart(2, '0'),
    n: date => date.getMonth() + 1,
    F: (date, locale) =>
        new Intl.DateTimeFormat(locale, { month: 'long' }).format(date),
    M: (date, locale) =>
        new Intl.DateTimeFormat(locale, { month: 'short' }).format(date),

    // Year
    y: date => String(date.getFullYear()).slice(-2),
    Y: date => date.getFullYear(),

    // Time
    H: date => String(date.getHours()).padStart(2, '0'),
    h: date => String(date.getHours() % 12 || 12).padStart(2, '0'),
    i: date => String(date.getMinutes()).padStart(2, '0'),
    s: date => String(date.getSeconds()).padStart(2, '0'),
    a: date => date.getHours() < 12 ? 'am' : 'pm',
}

export function customFormatDate(
    date: Date,
    format: string,
    locale = navigator.language,
): string {
    return format.replace(/\$([a-zA-Z])/g, (match, token: string) => {
        const formatter = dateTokens[token]
        return formatter ? String(formatter(date, locale)) : match
    })
}