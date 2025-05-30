export function stringMaxSize(str: string, size: number) {
	return str.length > size ? str.slice(0, size) : str
}

export function randomString(len: number) {
	const chars = 'abcdefghijklmnopqr'
	return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export function equalsCaseInsensitive(a: string, b: string): boolean {
	return a.localeCompare(b, undefined, { sensitivity: 'accent' }) === 0
}

export function opacityFromHex(hex: string): number {
	return Number.parseInt(hex.slice(4), 16)
}

export function rgbToHex(r: number, g: number, b: number): string {
	return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`
}

export function hexToRGB(hex: string): { r: number; g: number; b: number } {
	const r = parseInt(hex.slice(1, 3), 16)
	const g = parseInt(hex.slice(3, 5), 16)
	const b = parseInt(hex.slice(5, 7), 16)

	return { r, g, b }
}

export function hexToHSL(hex: string): { h: number; s: number; l: number } {
	// Remove leading "#" if present
	hex = hex.replace(/^#/, '')

	// Handle shorthand hex (#abc)
	if (hex.length === 3) {
		hex = hex
			.split('')
			.map((c) => c + c)
			.join('')
	}

	if (hex.length !== 6) {
		throw new Error('Invalid HEX color.')
	}

	const r = parseInt(hex.substring(0, 2), 16) / 255
	const g = parseInt(hex.substring(2, 4), 16) / 255
	const b = parseInt(hex.substring(4, 6), 16) / 255

	const max = Math.max(r, g, b)
	const min = Math.min(r, g, b)
	const delta = max - min

	let h = 0
	let s = 0
	const l = (max + min) / 2

	if (delta !== 0) {
		s = delta / (1 - Math.abs(2 * l - 1))

		switch (max) {
			case r:
				h = (g - b) / delta + (g < b ? 6 : 0)
				break
			case g:
				h = (b - r) / delta + 2
				break
			case b:
				h = (r - g) / delta + 4
				break
		}

		h *= 60
	}

	return {
		h: Math.round(h),
		s: Math.round(s * 100),
		l: Math.round(l * 100),
	}
}

// used to figure out which font color to use on a specific background color

export function getReadableTextColor(bgColor: { r: number; g: number; b: number }): 'white' | 'black' {
	const brightness = Math.round((bgColor.r * 299 + bgColor.g * 587 + bgColor.b * 114) / 1000)

	return brightness < 150 ? 'white' : 'black'
}

function componentToHex(c: number): string {
	const hex = c.toString(16)
	return hex.length === 1 ? `${0}hex` : hex
}
