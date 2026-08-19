interface CompressOptions {
    type?: 'jpeg' | 'png' | 'webp'
    size?: number
    q?: number
    raw?: boolean
    square?: boolean
}

type Crop = { sx: number; sy: number; sWidth: number; sHeight: number; dWidth: number; dHeight: number }

function computeCrop(width: number, height: number, options: CompressOptions): Crop {
    const { size, square } = options
    const isLandscape = width > height

    let sx = 0
    let sy = 0
    let sWidth = width
    let sHeight = height
    let dWidth = size ?? width
    let dHeight = size ?? height

    if (!size) {
        return { sx, sy, sWidth, sHeight, dWidth: width, dHeight: height }
    }

    if (!square) {
        if (isLandscape) {
            dHeight = size
            dWidth = (width / height) * size
        } else {
            dWidth = size
            dHeight = (height / width) * size
        }
    } else {
        if (isLandscape) {
            sx = (width - height) / 2
            sWidth = sHeight = height
        } else {
            sy = (height - width) / 2
            sWidth = sHeight = width
        }
    }

    return { sx, sy, sWidth, sHeight, dWidth: Math.round(dWidth), dHeight: Math.round(dHeight) }
}

/**
 * `createImageBitmap()` decodes (and, with a source-rectangle + `resize*`
 * options, crops and resizes in the same call) off the main thread in every
 * browser that supports it. That matters a lot here: the synchronous
 * `<img>` decode + full-resolution `ctx.drawImage()` this replaces can
 * block the main thread for hundreds of milliseconds on a large photo, and
 * with a big batch upload that adds up to a UI that looks fully hung.
 *
 * Returns `undefined` (never throws) if the API is unavailable or the
 * decode fails for any reason, so `loadOnCanvas` can fall back to the
 * always-works `<img>` path below.
 */
async function loadBitmapOffMainThread(url: string, options: CompressOptions): Promise<ImageBitmap | undefined> {
    if (typeof createImageBitmap !== 'function') {
        return undefined
    }

    let full: ImageBitmap | undefined

    try {
        const blob = await fetch(url).then((res) => res.blob())
        full = await createImageBitmap(blob)

        const { raw } = options
        if (raw || !options.size) {
            const result = full
            full = undefined
            return result
        }

        const { sx, sy, sWidth, sHeight, dWidth, dHeight } = computeCrop(full.width, full.height, options)
        const resized = await createImageBitmap(full, sx, sy, sWidth, sHeight, {
            resizeWidth: dWidth,
            resizeHeight: dHeight,
            resizeQuality: 'high',
        })

        return resized
    } catch (err) {
        console.warn('Bonjourr: off-main-thread image decode failed, falling back to <img>', err)
        return undefined
    } finally {
        full?.close()
    }
}

async function loadOnCanvas(url: string, options: CompressOptions): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
        throw new Error('Cannot get canvas context')
    }

    const bitmap = await loadBitmapOffMainThread(url, options)

    if (bitmap) {
        canvas.width = bitmap.width
        canvas.height = bitmap.height
        ctx.drawImage(bitmap, 0, 0)
        bitmap.close()
        return canvas
    }

    // Fallback: synchronous <img> decode on the main thread. Only reached
    // when createImageBitmap is unsupported or threw above.
    const img = new Image()

    await new Promise((resolve) => {
        img.onload = () => {
            const { sx, sy, sWidth, sHeight, dWidth, dHeight } = computeCrop(img.width, img.height, options)

            canvas.width = dWidth
            canvas.height = dHeight

            ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, dWidth, dHeight)

            img.remove()
            resolve(true)
        }

        img.src = url
    })

    return canvas
}

export async function imageDimensions(src: string): Promise<{ width: number; height: number }> {
    const img = new Image()
    let width = 4000
    let height = 3000

    await new Promise((resolve) => {
        img.addEventListener('load', () => {
            width = img.width
            height = img.height
            img.remove()
            resolve(true)
        })

        img.src = src
    })

    return { width, height }
}

export async function compressAsBlob(elem: Blob | string, options: CompressOptions): Promise<Blob> {
    const type = options.type ?? 'jpeg'
    const q = options.q ?? 0.9

    if (typeof elem === 'object') {
        elem = URL.createObjectURL(elem)
    }

    const canvas = await loadOnCanvas(elem, options)
    const ctx = canvas.getContext('2d')

    if (!ctx) {
        throw new Error('Cannot get canvas context')
    }

    const newBlob = await new Promise<Blob | null>((resolve) => {
        ctx.canvas.toBlob(resolve, `image/${type}`, q)
    })

    // <!> canvas.toBlob() can call back with `null` (e.g. the canvas is
    // <!> tainted, out of memory, or zero-sized). Previously this was cast
    // <!> straight to `Blob`, and callers exploded downstream with no
    // <!> useful error message.
    if (!newBlob) {
        throw new Error(
            'Image compression failed: canvas.toBlob() returned no data (image may be corrupt, empty, or the browser ran out of memory)',
        )
    }

    return newBlob
}

export async function compressAsDataUri(elem: Blob | string, options: CompressOptions): Promise<string> {
    const type = options.type ?? 'jpeg'
    const q = options.q ?? 1.0

    if (typeof elem === 'object') {
        elem = URL.createObjectURL(elem)
    }

    const canvas = await loadOnCanvas(elem, options)
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
