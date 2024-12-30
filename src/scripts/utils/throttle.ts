export default function throttle<F extends (...args: Parameters<F>) => ReturnType<F>>(callback: F, waitFor: number) {
	let timeout: ReturnType<typeof setTimeout>
	let inThrottle: boolean
	let lastTime: number

	return function (...args: Parameters<F>) {
		if (!inThrottle) {
			callback(...args)

			lastTime = Date.now()
			inThrottle = true
			return
		}

		clearTimeout(timeout)

		timeout = setTimeout(
			() => {
				if (Date.now() - lastTime >= waitFor) {
					lastTime = Date.now()
					callback(...args)
				}
			},
			Math.max(waitFor - (Date.now() - lastTime), 0),
		)
	}
}
