export interface SemVer {
	major: number
	minor: number
	patch: number
}

export function toSemVer(version = '0.0.0'): SemVer {
	const result = {
		major: 0,
		minor: 0,
		patch: 0,
	}

	if (typeof version === 'string') {
		const arr = version.split('.')
		const major = parseInt(arr[0] ?? '0')
		const minor = parseInt(arr[1] ?? '0')
		const patch = parseInt(arr[2] ?? '0')

		if (!isNaN(major) && !isNaN(minor) && !isNaN(patch)) {
			result.major = major
			result.minor = minor
			result.patch = patch
		}
	}

	return result
}
