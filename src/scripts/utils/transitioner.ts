type Func = (...args: unknown[]) => void

type Transitioner = {
	first: (cb: Func) => void
	after: (cb: Func) => void
	finally: (cb: Func) => void
	cancel: () => void
	transition: (timeout: number) => Promise<void>
}

export function transitioner(): Transitioner {
	//
	let waitTimeout: number

	const steps: {
		first?: Func
		after?: Func
		finally?: Func
	} = {}

	return {
		first: (cb: Func) => {
			steps.first = cb
		},

		finally: (cb: Func) => {
			steps.finally = cb
		},

		after: (cb: Func) => {
			steps.after = cb
		},

		cancel: () => clearTimeout(waitTimeout),

		transition: async (timeout: number, ...rest) => {
			if (steps.first) {
				steps.first(rest)
			}

			await new Promise(r => {
				waitTimeout = setTimeout(() => r(true), Math.min(timeout, 2000))
			})

			if (steps.after) {
				steps.after(rest)
			}

			if (steps.finally) {
				steps.finally(rest)
			}

			steps.first = undefined
			steps.after = undefined
			steps.finally = undefined
		},
	}
}
