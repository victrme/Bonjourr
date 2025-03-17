// https://dmitripavlutin.com/how-to-compare-objects-in-javascript/#4-deep-equality
export default function deepEqual(object1: Record<string, unknown>, object2: Record<string, unknown>) {
	function isObject(object: unknown) {
		return object != null && typeof object === 'object'
	}

	const keys1 = Object.keys(object1)
	const keys2 = Object.keys(object2)

	if (keys1.length !== keys2.length) {
		return false
	}

	for (const key of keys1) {
		const val1 = object1[key]
		const val2 = object2[key]
		const areObjects = isObject(val1) && isObject(val2)
		const areDifferent = (areObjects && !deepEqual(val1, val2)) || (!areObjects && val1 !== val2)

		if (areDifferent) {
			console.log(val1, val2)
			return false
		}
	}

	return true
}
