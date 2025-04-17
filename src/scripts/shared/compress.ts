interface CompressOptions {
	type?: 'jpeg' | 'png' | 'webp'
	size?: number
	q?: number
}

export async function compressMedia(blob: Blob, options: CompressOptions) {
	const blobUrl = globalThis.URL.createObjectURL(blob)
	const canvas = document.createElement('canvas')
	const ctx = canvas.getContext('2d')
	const img = new Image()
	img.src = blobUrl

	const type = options.type ?? 'jpeg'
	const size = options.size ?? 300
	const q = options.q ?? 0.9

	await new Promise(resolve => {
		img.onload = () => {
			const orientation = img.height > img.width ? 'portrait' : 'landscape'
			let ratio = 0
			let x = 0
			let y = 0

			if (orientation === 'landscape') {
				ratio = size / img.height
				canvas.height = y = size
				canvas.width = x = img.width * ratio
			}

			if (orientation === 'portrait') {
				ratio = size / img.width
				canvas.height = y = img.height * ratio
				canvas.width = x = size
			}

			ctx?.drawImage(img, 0, 0, x, y)
			resolve(true)
		}
	})

	const newBlob = await new Promise(resolve => {
		ctx?.canvas.toBlob(resolve, `image/${type}`, q)
	})

	return newBlob as Blob
}
