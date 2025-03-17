type Func = (...args: unknown[]) => void
type AsyncFunc = (...args: unknown[]) => Promise<void>

type Transitioner = {
	first: (cb: Func) => void
	finally: (cb: Func) => void
	then: (cb: AsyncFunc) => void
	cancel: () => void
	transition: (timeout: number) => Promise<void>
}

export default function transitioner(): Transitioner {
	//
	let waitTimeout: number

	const steps: {
		first?: Func
		then?: AsyncFunc
		finally?: Func
	} = {}

	return {
		first: (cb: Func) => {
			steps.first = cb
		},

		finally: (cb: Func) => {
			steps.finally = cb
		},

		then: (cb: AsyncFunc) => {
			steps.then = cb
		},

		cancel: () => clearTimeout(waitTimeout),

		transition: async (timeout: number, ...rest) => {
			if (steps.first) {
				steps.first(rest)
			}

			await new Promise((r) => {
				waitTimeout = setTimeout(() => r(true), Math.min(timeout, 2000))
			})

			if (steps.then) {
				await steps.then(rest)
			}

			if (steps.finally) {
				steps.finally(rest)
			}

			steps.first = undefined
			steps.then = undefined
			steps.finally = undefined
		},
	}
}
