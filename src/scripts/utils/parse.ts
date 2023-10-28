export default function parse(str: string): unknown | undefined {
	try {
		return JSON.parse(str)
	} catch (error) {
		console.warn('Issue in parsing: ', error)
		return
	}
}
