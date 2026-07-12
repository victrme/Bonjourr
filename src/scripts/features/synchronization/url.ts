import { tradThis } from '../../utils/translations.ts'
import type { Sync } from '../../../types/sync.ts'

export async function receiveFromURL(url = ''): Promise<Sync> {
    let resp: Response
    let parsedUrl: URL

    try {
        parsedUrl = new URL(url)
    } catch (_) {
        throw new Error(DISTANT_ERROR.URL)
    }

    if (!isUrlSafe(parsedUrl)) {
        throw new Error(DISTANT_ERROR.URL)
    }

    try {
        resp = await fetch(url)
    } catch (_) {
        try {
            resp = await fetch('https://services.bonjourr.fr/proxy', {
                method: 'POST',
                body: url,
            })
        } catch (_) {
            throw new Error(DISTANT_ERROR.PROXY)
        }
    }

    try {
        return JSON.parse(await resp.text())
    } catch (_) {
        throw new Error(DISTANT_ERROR.JSON)
    }
}

export async function isDistantUrlValid(url = ''): Promise<boolean> {
    try {
        await receiveFromURL(url)
        return true
    } catch (_) {
        return false
    }
}

function isUrlSafe(url: URL): boolean {
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        return false
    }

    const hostname = url.hostname.toLowerCase()

    if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
        return false
    }

    if (hostname.endsWith('.local') || hostname.endsWith('.internal')) {
        return false
    }

    const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
    if (ipv4Match) {
        const [a, b] = ipv4Match.slice(1).map(Number)
        if (a === 10) return false
        if (a === 127) return false
        if (a === 0) return false
        if (a === 169 && b === 254) return false
        if (a === 172 && b >= 16 && b <= 31) return false
        if (a === 192 && b === 168) return false
        if (a === 100 && b >= 64 && b <= 127) return false
        if (a >= 224) return false
    }

    if (hostname.startsWith('[') && hostname.endsWith(']')) {
        const addr = hostname.slice(1, -1).toLowerCase()
        if (addr === '::1' || addr === '::') return false
        if (addr.startsWith('fe80:') || addr.startsWith('fc') || addr.startsWith('fd')) return false
    }

    return true
}

const DISTANT_ERROR = {
    URL: tradThis('Not a valid URL'),
    FAIL: tradThis('Cannot access resource right now'),
    PROXY: tradThis('Cannot access resource, even with proxy'),
    JSON: tradThis('Response is not valid JSON'),
}
