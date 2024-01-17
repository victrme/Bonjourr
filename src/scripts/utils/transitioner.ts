type Func = (...args: unknown[]) => void
type AsyncFunc = (...args: unknown[]) => Promise<void>

export default async function transitioner(start?: Func, middle?: AsyncFunc, end?: Func, timeout = 200): Promise<void> {
	if (start) {
		start(...arguments)
	}

	await new Promise((r) => {
		setTimeout(() => r(true), Math.min(timeout, 2000))
	})

	if (middle) {
		await middle(...arguments)
	}

	if (end) {
		end(...arguments)
	}

	return
}
