/*
 * Copyright (c) 2006 Ho Ngoc Duc. All Rights Reserved.
 * Astronomical algorithms from the book "Astronomical Algorithms" by Jean Meeus, 1998
 *
 * Permission to use, copy, modify, and redistribute this software and its
 * documentation for personal, non-commercial use is hereby granted provided that
 * this copyright notice and appropriate documentation appears in all copies.
 * source: https://www.informatik.uni-leipzig.de/~duc/amlich/calrules.html
 *
 * Modified to be typescript & linter compliant by Victor Azevedo, 2025
 */

/* Discard the fractional part of a number, e.g., INT(3.2) = 3 */
function INT(d: number) {
	return Math.floor(d)
}

/* Compute the (integral) Julian day number of day dd/mm/yyyy, i.e., the number
 * of days between 1/1/4713 BC (Julian calendar) and dd/mm/yyyy.
 * Formula from http://www.tondering.dk/claus/calendar.html
 */
function jdFromDate(dd: number, mm: number, yy: number) {
	const a = INT((14 - mm) / 12)
	const y = yy + 4800 - a
	const m = mm + 12 * a - 3
	let jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045
	if (jd < 2299161) {
		jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083
	}

	return jd
}

/* Convert a Julian day number to day/month/year. Parameter jd is an integer */
function jdToDate(jd: number) {
	let a: number
	let b: number
	let c: number

	if (jd > 2299160) {
		// After 5/10/1582, Gregorian calendar
		a = jd + 32044
		b = INT((4 * a + 3) / 146097)
		c = a - INT((b * 146097) / 4)
	} else {
		b = 0
		c = jd + 32082
	}

	const d = INT((4 * c + 3) / 1461)
	const e = c - INT((1461 * d) / 4)
	const m = INT((5 * e + 2) / 153)
	const day = e - INT((153 * m + 2) / 5) + 1
	const month = m + 3 - 12 * INT(m / 10)
	const year = b * 100 + d - 4800 + INT(m / 10)

	return new Array(day, month, year)
}

/* Compute the time of the k-th new moon after the new moon of 1/1/1900 13:52 UCT
 * (measured as the number of days since 1/1/4713 BC noon UCT, e.g., 2451545.125 is 1/1/2000 15:00 UTC).
 * Returns a floating number, e.g., 2415079.9758617813 for k=2 or 2414961.935157746 for k=-2
 * Algorithm from: "Astronomical Algorithms" by Jean Meeus, 1998
 */
function NewMoon(k: number) {
	let deltat: number

	const T = k / 1236.85 // Time in Julian centuries from 1900 January 0.5
	const T2 = T * T
	const T3 = T2 * T
	const dr = Math.PI / 180

	let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3
	Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr) // Mean new moon

	const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3 // Sun's mean anomaly
	const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3 // Moon's mean anomaly
	const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3 // Moon's argument of latitude

	let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M)
	C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr)
	C1 -= 0.0004 * Math.sin(dr * 3 * Mpr)
	C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr))
	C1 = C1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M))
	C1 = C1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr))
	C1 = C1 + 0.001 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M))

	if (T < -11) {
		deltat = 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
	} else {
		deltat = -0.000278 + 0.000265 * T + 0.000262 * T2
	}

	const JdNew = Jd1 + C1 - deltat

	return JdNew
}

/* Compute the longitude of the sun at any time.
 * Parameter: floating number jdn, the number of days since 1/1/4713 BC noon
 * Algorithm from: "Astronomical Algorithms" by Jean Meeus, 1998
 */
function SunLongitude(jdn: number) {
	const T = (jdn - 2451545.0) / 36525 // Time in Julian centuries from 2000-01-01 12:00:00 GMT
	const T2 = T * T
	const dr = Math.PI / 180 // degree to radian
	const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2 // mean anomaly, degree
	const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2 // mean longitude, degree
	let dl = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M)
	dl = dl + (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.00029 * Math.sin(dr * 3 * M)
	let L = L0 + dl // true longitude, degree
	L *= dr
	L -= Math.PI * 2 * INT(L / (Math.PI * 2)) // Normalize to (0, 2*PI)

	return L
}

/* Compute sun position at midnight of the day with the given Julian day number.
 * The time zone if the time difference between local time and UTC: 7.0 for UTC+7:00.
 * The function returns a number between 0 and 11.
 * From the day after March equinox and the 1st major term after March equinox, 0 is returned.
 * After that, return 1, 2, 3 ...
 */
function getSunLongitude(dayNumber: number, timeZone: number) {
	return INT((SunLongitude(dayNumber - 0.5 - timeZone / 24) / Math.PI) * 6)
}

/* Compute the day of the k-th new moon in the given time zone.
 * The time zone if the time difference between local time and UTC: 7.0 for UTC+7:00
 */
function getNewMoonDay(k: number, timeZone: number) {
	return INT(NewMoon(k) + 0.5 + timeZone / 24)
}

/* Find the day that starts the luner month 11 of the given year for the given time zone */
function getLunarMonth11(yy: number, timeZone: number) {
	//off = jdFromDate(31, 12, yy) - 2415021.076998695;
	const off = jdFromDate(31, 12, yy) - 2415021
	const k = INT(off / 29.530588853)
	let nm = getNewMoonDay(k, timeZone)
	const sunLong = getSunLongitude(nm, timeZone) // sun longitude at local midnight

	if (sunLong >= 9) {
		nm = getNewMoonDay(k - 1, timeZone)
	}

	return nm
}

/* Find the index of the leap month after the month starting on the day a11. */
function getLeapMonthOffset(a11: number, timeZone: number) {
	const k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5)
	let last = 0
	let i = 1 // We start with the month following lunar month 11
	let arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone)

	do {
		last = arc
		i++
		arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone)
	} while (arc !== last && i < 14)

	return i - 1
}

/* Comvert solar date dd/mm/yyyy to the corresponding lunar date */
function convertSolar2Lunar(dd: number, mm: number, yy: number, timeZone: number) {
	const dayNumber = jdFromDate(dd, mm, yy)
	const k = INT((dayNumber - 2415021.076998695) / 29.530588853)
	let monthStart = getNewMoonDay(k + 1, timeZone)

	if (monthStart > dayNumber) {
		monthStart = getNewMoonDay(k, timeZone)
	}

	//alert(dayNumber+" -> "+monthStart);

	let a11 = getLunarMonth11(yy, timeZone)
	let b11 = a11
	let lunarYear: number

	if (a11 >= monthStart) {
		lunarYear = yy
		a11 = getLunarMonth11(yy - 1, timeZone)
	} else {
		lunarYear = yy + 1
		b11 = getLunarMonth11(yy + 1, timeZone)
	}

	const lunarDay = dayNumber - monthStart + 1
	const diff = INT((monthStart - a11) / 29)
	let lunarLeap = 0
	let lunarMonth = diff + 11

	if (b11 - a11 > 365) {
		const leapMonthDiff = getLeapMonthOffset(a11, timeZone)

		if (diff >= leapMonthDiff) {
			lunarMonth = diff + 10
			if (diff === leapMonthDiff) {
				lunarLeap = 1
			}
		}
	}
	if (lunarMonth > 12) {
		lunarMonth -= 12
	}
	if (lunarMonth >= 11 && diff < 4) {
		lunarYear -= 1
	}

	return new Array(lunarDay, lunarMonth, lunarYear, lunarLeap)
}

/* Convert a lunar date to the corresponding solar date */
function _convertLunar2Solar(
	lunarDay: number,
	lunarMonth: number,
	lunarYear: number,
	lunarLeap: number,
	timeZone: number,
) {
	let a11: number
	let b11: number

	if (lunarMonth < 11) {
		a11 = getLunarMonth11(lunarYear - 1, timeZone)
		b11 = getLunarMonth11(lunarYear, timeZone)
	} else {
		a11 = getLunarMonth11(lunarYear, timeZone)
		b11 = getLunarMonth11(lunarYear + 1, timeZone)
	}

	const k = INT(0.5 + (a11 - 2415021.076998695) / 29.530588853)
	let off = lunarMonth - 11

	if (off < 0) {
		off += 12
	}

	if (b11 - a11 > 365) {
		const leapOff = getLeapMonthOffset(a11, timeZone)
		let leapMonth = leapOff - 2

		if (leapMonth < 0) {
			leapMonth += 12
		}

		if (lunarLeap !== 0 && lunarMonth !== leapMonth) {
			return new Array(0, 0, 0)
		}

		if (lunarLeap !== 0 || off >= leapOff) {
			off += 1
		}
	}

	const monthStart = getNewMoonDay(k + off, timeZone)

	return jdToDate(monthStart + lunarDay - 1)
}

export function getVnCalendar(date: Date) {
	const can = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý']
	const chi = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi']

	const ld = convertSolar2Lunar(date.getDate(), date.getMonth() + 1, date.getFullYear(), 7)
	const yearCanChi = `${can[(ld[2] + 6) % 10]} ${chi[(ld[2] + 8) % 12]}`
	const leapText = ld[3] ? ' (nhuận)' : ''

	return `Âm lịch: ${ld[0]} tháng ${ld[1]}${leapText} năm ${yearCanChi}`
}
