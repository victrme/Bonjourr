export default function parse(str: string) {
	try {
		return JSON.parse(str)
	} catch (error) {
		return null
	}
}
