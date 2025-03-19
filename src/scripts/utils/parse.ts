export function parse<T>(str = ''): T | undefined {
	try {
		return JSON.parse(str)
	} catch (_error) {
		if (str !== '') {
		}
	}
}
