let userSetDate: Date

export default function userDate(timezone?: string): Date {
	if (!timezone && userSetDate) {
		return userSetDate
	}

	if (!timezone) {
		timezone = 'auto'
	}

	const isUTC = (timezone.includes('+') || timezone.includes('-')) && timezone.length < 6
	const date = new Date()

	if (timezone === 'auto') {
		return date
	}

	if (isUTC) {
		const offset = date.getTimezoneOffset() / 60 // hour
		let utcHour = date.getHours() + offset
		const utcMinutes = date.getMinutes() + date.getTimezoneOffset()
		let minutes

		if (timezone.split('.')[1]) {
			minutes = utcMinutes + Number.parseInt(timezone.split('.')[1])

			if (minutes > -30) {
				utcHour++
			}
		} else {
			minutes = date.getMinutes()
		}

		date.setHours(utcHour + Number.parseInt(timezone), minutes)

		return date
	}

	const intl = new Intl.DateTimeFormat('en', { timeZone: timezone, dateStyle: 'medium', timeStyle: 'medium' })

	userSetDate = new Date(intl.format(date))

	return userSetDate
}
