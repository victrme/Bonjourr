export default function parse(str: string) {
	try {
		return JSON.parse(str)
	} catch (error) {
		console.warn('Issue in parsing: ', error)
		return null
	}
}
