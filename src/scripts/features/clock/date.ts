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

    custom.textContent = ''
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

// Custom implementation inspired by Ruby/Python strftime
// https://www.foragoodstrftime.com/
const dateTokens: Record<string, DateFormatter | undefined> = {
    // Days
    a: (date, locale) =>
        // Abbreviated weekday name (e.g. Sun)
        new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date),
    A: (date, locale) =>
        // Full weekday name (e.g. Sunday)
        new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date),
    w: (date) => date.getDay(), // Weekday number, Sunday = 0 (0–6)
    u: (date) => date.getDay() || 7, // ISO weekday number, Monday = 1 (1–7)
    d: (date) => String(date.getDate()).padStart(2, '0'), // Day of the month, zero-padded (01–31)
    e: (date) => date.getDate(), // Day of the month, no leading zero (1–31)
    o: (date) => { // English ordinal for day of the month
        const day = date.getDate()

        if (day >= 11 && day <= 13) return 'th'

        switch (day % 10) {
            case 1:
                return 'st'
            case 2:
                return 'nd'
            case 3:
                return 'rd'
            default:
                return 'th'
        }
    },

    j: (date) => { // Day of the year, zero-padded (001–366)
        const year = date.getFullYear()
        const start = Date.UTC(year, 0, 1)
        const current = Date.UTC(year, date.getMonth(), date.getDate())
        const day = Math.floor((current - start) / 86400000) + 1

        return String(day).padStart(3, '0')
    },

    // Weeks
    U: (date) => { // Week number, Sunday as first day (00–53)
        const start = Date.UTC(date.getFullYear(), 0, 1)
        const current = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
        const startWeekday = new Date(start).getUTCDay()
        const firstSunday = start + (7 - startWeekday) % 7 * 86400000
        const week = current < firstSunday ? 0 : Math.floor((current - firstSunday) / (7 * 86400000)) + 1

        return String(week).padStart(2, '0')
    },
    V: (date) => { // ISO week number, Monday as first day (01–53)
        const target = new Date(
            Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
        )
        const weekday = target.getUTCDay() || 7
        target.setUTCDate(target.getUTCDate() + 4 - weekday)

        const yearStart = Date.UTC(target.getUTCFullYear(), 0, 1)
        const week = Math.ceil(
            ((target.getTime() - yearStart) / 86400000 + 1) / 7,
        )

        return String(week).padStart(2, '0')
    },

    // Months
    b: (date, locale) =>
        // Abbreviated month name (e.g. Jan)
        new Intl.DateTimeFormat(locale, { month: 'short' }).format(date),
    B: (date, locale) =>
        // Full month name (e.g. January)
        new Intl.DateTimeFormat(locale, { month: 'long' }).format(date),
    m: (date) => String(date.getMonth() + 1).padStart(2, '0'), // Month number, zero-padded (01–12)

    // Years
    y: (date) => String(date.getFullYear()).slice(-2), // Two-digit year (00–99)
    Y: (date) => date.getFullYear(), // Four-digit year (e.g. 2026)
    C: (date) => Math.floor(date.getFullYear() / 100), // Century (e.g. 20 for 2026)
}

export function customFormatDate(
    date: Date,
    format: string,
    locale = navigator.language,
): string {
    return format.replace(/%([a-zA-Z%])/g, (match, token: string) => {
        if (token === '%') return '%'

        const formatter = dateTokens[token]
        return formatter ? String(formatter(date, locale)) : match
    })
}
