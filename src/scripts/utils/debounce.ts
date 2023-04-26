// Typing from
// https://gist.github.com/ca0v/73a31f57b397606c9813472f7493a940?permalink_comment_id=4276799#gistcomment-4276799

export default function debounce<F extends (...args: Parameters<F>) => ReturnType<F>>(callback: F, waitFor: number) {
	let timeout: ReturnType<typeof setTimeout>

	const debounced = (...args: Parameters<F>) => {
		clearTimeout(timeout)
		timeout = setTimeout(() => callback(...args), waitFor)
	}

	debounced.cancel = () => clearTimeout(timeout)

	return debounced
}
