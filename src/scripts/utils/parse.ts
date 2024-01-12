export default function parse<T>(str = ''): T | undefined {
	try {
		return JSON.parse(str)
	} catch (error) {
		if (str !== '') {
			console.warn('Issue in parsing: ', error)
		}
	}
}
