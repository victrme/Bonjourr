import { compressAsDataUri, svgToText } from '../../shared/compress.ts'
import { storage } from '../../storage.ts'

async function convertIconFileToDataUri(file: File): Promise<string> {
	if (!file.type.startsWith('image/')) {
		throw new Error('Icon file must be an image')
	}

	const isSmall = file.size < 16000
	const type = file.type.replace('image/', '')

	if (isSmall) {
		if (type.includes('svg')) {
			const data = await svgToText(file)
			return `data:image/svg+xml;base64,${btoa(data)}`
		}
		if (type.includes('png')) {
			return await compressAsDataUri(file, {
				square: true,
				type: 'png',
				q: 1.0,
			})
		}
	}

	return await compressAsDataUri(file, {
		type: type.includes('png') ? 'png' : 'jpeg',
		square: true,
		size: 144,
		q: .8,
	})
}

export async function storeIconFile(id: string, file: File): Promise<string> {
	const uri = await convertIconFileToDataUri(file)

	storage.local.set({ [`x-icon-${id}`]: uri })

	return uri
}
