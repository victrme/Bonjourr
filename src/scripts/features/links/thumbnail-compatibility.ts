import { readThumbnail, removeThumbnail } from '../../shared/thumbnails.ts'
import { storage } from '../../storage.ts'
import { isElem, isLink } from './helpers.ts'
import { storeIconFile } from './fileicons.ts'
import type { Sync } from '../../../types/sync.ts'

/** Convert sources from earlier experimental builds without downloading images. */
export async function migrateLegacyThumbnailIcons(data: Sync): Promise<void> {
    for (const value of Object.values(data)) {
        if (!isLink(value) || !isElem(value) || !value.thumbnail || value.thumbnail.type === 'capture') continue
        const source = value.thumbnail
        const link = { ...value }
        try {
            if (source.type === 'url' && source.value) {
                link.icon = { type: 'url', value: source.value }
            }
            if (source.type === 'file') {
                const image = await readThumbnail(link._id, link.url, source)
                if (image) {
                    const name = source.value ?? 'image.jpg'
                    await storeIconFile(link._id, new File([image], name, { type: image.type }))
                    link.icon = { type: 'file', value: name }
                }
            }
            delete link.thumbnail
            await storage.sync.set({ [link._id]: link })
            data[link._id] = link
            await removeThumbnail(link._id)
        } catch (error) {
            console.warn('Could not migrate an experimental thumbnail source', error)
        }
    }
}
