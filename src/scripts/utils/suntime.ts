import { minutator } from '../utils'

type Suntime = {
	sunrise: number
	sunset: number
	update: (rise?: number, set?: number) => void
}

const suntime: Suntime = {
	sunrise: 420,
	sunset: 1320,
	update: (rise, set) => {
		if (rise && set) {
			suntime.sunrise = minutator(new Date(rise * 1000))
			suntime.sunset = minutator(new Date(set * 1000))
		}
	},
}

export default suntime
