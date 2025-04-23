export function hashcode(str: string) {
	// Generate a Hash from string in Javascript
	// https://stackoverflow.com/a/52171480

	let h1 = 0xdeadbeef
	let h2 = 0x41c6ce57
	let i
	let ch

	for (i = 0, ch = 0; i < str.length; i++) {
		ch = str.charCodeAt(i)
		h1 = Math.imul(h1 ^ ch, 2654435761)
		h2 = Math.imul(h2 ^ ch, 1597334677)
	}

	h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
	h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
	h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
	h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)

	const number = 4294967296 * (2097151 & h2) + (h1 >>> 0)

	// To string hash
	const array = number.toString().split('')
	const charlist = 'arosmwxcvn'.split('')
	const string = array.map((num) => charlist[Number.parseInt(num)]).join('')

	return string
}
