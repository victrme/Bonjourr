export default function parse<T>(str: string): T | undefined {
	try {
		return JSON.parse(str)
	} catch (error) {
		console.warn('Issue in parsing: ', error)
		return
	}
}
