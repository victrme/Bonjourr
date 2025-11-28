interface CompressOptions {
	type?: 'jpeg' | 'png' | 'webp'
	size?: number
	q?: number
	raw?: boolean
	square?: boolean
}

async function loadOnCanvas(blob: Blob, options: CompressOptions): Promise<HTMLCanvasElement> {
	const blobUrl = globalThis.URL.createObjectURL(blob)
	const canvas = document.createElement('canvas')
	const ctx = canvas.getContext('2d')
	const img = new Image()
	img.src = blobUrl

	if (!ctx) {
		throw new Error('Cannot get canvas context')
	}

	await new Promise((resolve) => {
		img.onload = () => {
			const { size, square, raw } = options

			if (raw || !size) {
				canvas.width = img.width
				canvas.height = img.height
				ctx?.drawImage(img, 0, 0)
				resolve(true)
				return
			}

			const isLandscape = img.width > img.height
			let sx = 0
			let sy = 0
			let sWidth = img.width
			let sHeight = img.height
			let dWidth = size
			let dHeight = size

			if (!square) {
				if (isLandscape) {
					dHeight = size
					dWidth = (img.width / img.height) * size
				} else {
					dWidth = size
					dHeight = (img.height / img.width) * size
				}
			} else {
				if (isLandscape) {
					sx = (img.width - img.height) / 2
					sWidth = sHeight = img.height
				} else {
					sy = (img.height - img.width) / 2
					sWidth = sHeight = img.width
				}
			}

			canvas.width = dWidth
			canvas.height = dHeight

			ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, dWidth, dHeight)
			resolve(true)
		}
	})

	return canvas
}

export async function compressAsBlob(blob: Blob, options: CompressOptions): Promise<Blob> {
	const type = options.type ?? 'jpeg'
	const q = options.q ?? 0.9

	const canvas = await loadOnCanvas(blob, options)
	const ctx = canvas.getContext('2d')
	const newBlob = await new Promise((resolve) => {
		ctx?.canvas.toBlob(resolve, `image/${type}`, q)
	})

	return newBlob as Blob
}

export async function compressAsDataUri(blob: Blob, options: CompressOptions): Promise<string> {
	const type = options.type ?? 'jpeg'
	const q = options.q ?? 1.0

	const canvas = await loadOnCanvas(blob, options)
	const uri = canvas.toDataURL(`image/${type}`, q)

	return uri
}

export async function svgToText(file: File): Promise<string> {
	const reader = new FileReader()

	const data: string = await new Promise((resolve) => {
		reader.onload = () => {
			resolve(reader.result?.toString() ?? '')
		}

		reader.readAsText(file)
	})

	return data
}
