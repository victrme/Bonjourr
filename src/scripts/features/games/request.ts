import type { GamesCache, GamesCacheStore } from '../../../types/local.ts'
import type { GameReleaseItem, GamesQuery } from '../../../types/shared.ts'

export const GAMES_CACHE_SCHEMA_VERSION = 2
const GAMES_CACHE_REFRESH_AGE = 1000 * 60 * 60 * 24
const GAMES_CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 30
const GAMES_CACHE_MAX_ENTRIES = 48
const GAMES_CACHE_MAX_BASE_ENTRIES = 16
const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token'
const IGDB_GAMES_URL = 'https://api.igdb.com/v4/games'
const IGDB_RELEASE_DATES_URL = 'https://api.igdb.com/v4/release_dates'
const IGDB_COVER_BASE_URL = 'https://images.igdb.com/igdb/image/upload/t_cover_big'

type GamesLocalState = {
    gamesCache?: GamesCacheStore
    gamesCacheVersion?: number
    igdbClientId?: string
    igdbClientSecret?: string
    igdbAccessToken?: string
    igdbAccessTokenExpiresAt?: number
}

export async function requestGameReleaseItems(
    query: GamesQuery,
    local: GamesLocalState,
    forceRefresh = false,
    signal?: AbortSignal,
): Promise<{ items: GameReleaseItem[]; hasMore: boolean; local: Partial<GamesLocalState> }> {
    if (!hasIgdbCredentials(local)) {
        return { items: [], hasMore: false, local: {} }
    }

    const cacheKey = getGamesCacheKey(query)
    const cacheStore = local.gamesCacheVersion === GAMES_CACHE_SCHEMA_VERSION ? local.gamesCache : undefined
    const cache = getGamesCacheEntry(cacheStore, query)

    if (!forceRefresh && cache && isFreshCache(cache)) {
        return { items: cache.items, hasMore: !!cache.hasMore, local: {} }
    }

    try {
        const auth = await getValidIgdbAccessToken(local, signal)
        const response = await fetchIgdbReleaseDates(query, local.igdbClientId, auth.accessToken, signal)

        if (!response || response.status !== 200) {
            throw new Error('Cannot get games')
        }

        const json = await response.json() as unknown
        const { items, hasMore } = sanitizeGameReleaseItems(json, query)
        const nextCache: GamesCache = {
            fetchedAt: Date.now(),
            query,
            items,
            hasMore,
        }

        return {
            items,
            hasMore,
            local: {
                gamesCache: pruneGamesCache({
                    ...getGamesCacheStore(cacheStore),
                    [cacheKey]: nextCache,
                }),
                gamesCacheVersion: GAMES_CACHE_SCHEMA_VERSION,
                igdbAccessToken: auth.accessToken,
                igdbAccessTokenExpiresAt: auth.expiresAt,
            },
        }
    } catch (_error) {
        if (signal?.aborted) {
            throw new DOMException('Aborted', 'AbortError')
        }

        if (cache && isUsableStaleCache(cache)) {
            return { items: cache.items, hasMore: !!cache.hasMore, local: {} }
        }

        throw new Error('Cannot get games')
    }
}

export async function verifyIgdbCredentials(
    clientId: string,
    clientSecret: string,
): Promise<
    Pick<GamesLocalState, 'igdbClientId' | 'igdbClientSecret' | 'igdbAccessToken' | 'igdbAccessTokenExpiresAt'>
> {
    const auth = await getValidIgdbAccessToken({
        igdbClientId: clientId,
        igdbClientSecret: clientSecret,
    })

    const response = await fetchIgdbConnectionCheck(clientId, auth.accessToken)

    if (!response || response.status !== 200) {
        throw new Error('Could not verify IGDB credentials')
    }

    return {
        igdbClientId: clientId,
        igdbClientSecret: clientSecret,
        igdbAccessToken: auth.accessToken,
        igdbAccessTokenExpiresAt: auth.expiresAt,
    }
}

function isFreshCache(cache: GamesCache): boolean {
    return Date.now() - cache.fetchedAt < GAMES_CACHE_REFRESH_AGE
}

function isUsableStaleCache(cache: GamesCache): boolean {
    return Date.now() - cache.fetchedAt < GAMES_CACHE_MAX_AGE
}

function hasIgdbCredentials(local: GamesLocalState): local is GamesLocalState & {
    igdbClientId: string
    igdbClientSecret: string
} {
    return !!local.igdbClientId && !!local.igdbClientSecret
}

async function getValidIgdbAccessToken(
    local: GamesLocalState & { igdbClientId: string; igdbClientSecret: string },
    signal?: AbortSignal,
): Promise<{ accessToken: string; expiresAt: number }> {
    if (local.igdbAccessToken && (local.igdbAccessTokenExpiresAt ?? 0) > Date.now() + 60000) {
        return {
            accessToken: local.igdbAccessToken,
            expiresAt: local.igdbAccessTokenExpiresAt ?? 0,
        }
    }

    const url = new URL(TWITCH_TOKEN_URL)

    url.searchParams.set('client_id', local.igdbClientId)
    url.searchParams.set('client_secret', local.igdbClientSecret)
    url.searchParams.set('grant_type', 'client_credentials')

    try {
        const response = await fetch(url, { method: 'POST', signal })

        if (!response || response.status !== 200) {
            throw new Error('Cannot get IGDB token')
        }

        const json = await response.json() as {
            access_token?: string
            expires_in?: number
        }

        const accessToken = typeof json.access_token === 'string' ? json.access_token : ''
        const expiresIn = typeof json.expires_in === 'number' ? json.expires_in : 0

        if (!accessToken || !expiresIn) {
            throw new Error('Cannot get IGDB token')
        }

        return {
            accessToken,
            expiresAt: Date.now() + (expiresIn * 1000),
        }
    } catch (_error) {
        throw new Error('Cannot get IGDB token')
    }
}

async function fetchIgdbReleaseDates(
    query: GamesQuery,
    clientId: string,
    accessToken: string,
    signal?: AbortSignal,
): Promise<Response | undefined> {
    const body = createReleaseDatesQuery(query)

    try {
        return await fetch(IGDB_RELEASE_DATES_URL, {
            method: 'POST',
            signal,
            headers: {
                Accept: 'application/json',
                'Client-ID': clientId,
                Authorization: `Bearer ${accessToken}`,
            },
            body,
        })
    } catch (_error) {
        // ...
    }
}

export function getGamesCacheKey(query: GamesQuery): string {
    return [
        query.range,
        query.platform,
        query.limit.toString(),
        query.minHypes.toString(),
        (query.startAt ?? 0).toString(),
        (query.endAt ?? 0).toString(),
    ].join('|')
}

export function getGamesCacheEntry(
    store: GamesCacheStore | undefined,
    query: GamesQuery,
): GamesCache | undefined {
    const cache = store?.[getGamesCacheKey(query)]
    return isValidGamesCache(cache) ? cache : undefined
}

function getGamesCacheStore(store: GamesCacheStore | undefined): GamesCacheStore {
    return store ?? {}
}

function pruneGamesCache(store: GamesCacheStore): GamesCacheStore {
    const cutoff = Date.now() - GAMES_CACHE_MAX_AGE
    const entries = Object.entries(store)
        .filter(([, cache]) => isValidGamesCache(cache) && cache.fetchedAt >= cutoff)
        .sort(([, a], [, b]) => b.fetchedAt - a.fetchedAt)
    const baseEntries = entries
        .filter(([, cache]) => isBaseGamesQuery(cache.query))
        .slice(0, GAMES_CACHE_MAX_BASE_ENTRIES)
    const baseKeys = new Set(baseEntries.map(([key]) => key))
    const windowEntries = entries
        .filter(([key]) => !baseKeys.has(key))
        .slice(0, Math.max(0, GAMES_CACHE_MAX_ENTRIES - baseEntries.length))
    const limitedEntries = [...baseEntries, ...windowEntries]

    return Object.fromEntries(limitedEntries)
}

function isBaseGamesQuery(query: GamesQuery): boolean {
    return query.startAt === undefined && query.endAt === undefined
}

function isValidGamesCache(cache: GamesCache | undefined): cache is GamesCache {
    if (!cache || typeof cache.fetchedAt !== 'number' || !Array.isArray(cache.items) || !cache.query) {
        return false
    }

    const query = cache.query

    return typeof query.range === 'string' &&
        typeof query.platform === 'string' &&
        typeof query.limit === 'number' &&
        typeof query.minHypes === 'number'
}

async function fetchIgdbConnectionCheck(clientId: string, accessToken: string): Promise<Response | undefined> {
    try {
        return await fetch(IGDB_GAMES_URL, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Client-ID': clientId,
                Authorization: `Bearer ${accessToken}`,
            },
            body: 'fields id; limit 1;',
        })
    } catch (_error) {
        // ...
    }
}

function createReleaseDatesQuery(query: GamesQuery): string {
    const now = Date.now()
    const start = Math.floor((query.startAt ?? now) / 1000)
    const end = Math.floor((query.endAt ?? (now + getRangeDuration(query.range))) / 1000)
    const platformFilter = getPlatformFilter(query.platform)
    const hypeFilter = query.minHypes > 0 ? ` & game.hypes >= ${query.minHypes}` : ''
    const fetchLimit = Math.max(query.limit * 6, 24)

    return [
        'fields date,game.id,game.name,game.slug,game.cover.image_id,platform.name,game.hypes;',
        `where date >= ${start} & date <= ${end} & game != null & game.version_parent = null${platformFilter}${hypeFilter};`,
        'sort date asc;',
        `limit ${fetchLimit};`,
    ].join(' ')
}

function sanitizeGameReleaseItems(value: unknown, query: GamesQuery): { items: GameReleaseItem[]; hasMore: boolean } {
    if (!Array.isArray(value)) {
        return { items: [], hasMore: false }
    }

    const grouped = new Map<string, GameReleaseItem & { platforms: Set<string> }>()

    for (const item of value) {
        if (!item || typeof item !== 'object') {
            continue
        }

        const id = getNumber(item, 'id')
        const releaseDate = getNumber(item, 'date')
        const game = getObject(item, 'game')
        const gameId = game ? getNumber(game, 'id') : undefined
        const title = game ? getString(game, 'name') : undefined
        const cover = game ? getObject(game, 'cover') : undefined
        const imageId = cover ? getString(cover, 'image_id') : undefined
        const platformInfo = getObject(item, 'platform')
        const platformName = platformInfo ? getString(platformInfo, 'name') : undefined

        if (!id || !title || !releaseDate || !platformName) {
            continue
        }

        const isoDate = new Date(releaseDate * 1000).toISOString().slice(0, 10)
        const platformLabel = simplifyPlatformLabel(platformName, query.platform)
        const groupKey = gameId ? gameId.toString() : title
        const existing = grouped.get(groupKey)

        if (existing) {
            existing.platforms.add(platformLabel)
            if (!existing.cover && imageId) {
                existing.cover = `${IGDB_COVER_BASE_URL}/${imageId}.jpg`
            }
            if (isoDate < existing.releaseDate) {
                existing.releaseDate = isoDate
            }
            continue
        }

        grouped.set(groupKey, {
            id: (gameId ?? id).toString(),
            title,
            releaseDate: isoDate,
            platform: platformLabel,
            cover: imageId ? `${IGDB_COVER_BASE_URL}/${imageId}.jpg` : undefined,
            url: undefined,
            platforms: new Set([platformLabel]),
        })
    }

    const items = [...grouped.values()].map(({ platforms, ...item }) => ({
        ...item,
        platform: [...platforms].sort(comparePlatforms).join(', '),
    }))

    return {
        items: items.slice(0, query.limit),
        hasMore: value.length >= Math.max(query.limit * 6, 24),
    }
}

function getString(value: object, key: string): string | undefined {
    const entry = Reflect.get(value, key)
    return typeof entry === 'string' && entry.length > 0 ? entry : undefined
}

function getNumber(value: object, key: string): number | undefined {
    const entry = Reflect.get(value, key)
    return typeof entry === 'number' ? entry : undefined
}

function getObject(value: object, key: string): object | undefined {
    const entry = Reflect.get(value, key)
    return entry && typeof entry === 'object' ? entry as object : undefined
}

function getRangeDuration(range: GamesQuery['range']): number {
    if (range === '7d') {
        return 7 * 24 * 60 * 60 * 1000
    }

    if (range === '14d') {
        return 14 * 24 * 60 * 60 * 1000
    }

    return 30 * 24 * 60 * 60 * 1000
}

function getPlatformFilter(platform: GamesQuery['platform']): string {
    const ids = PLATFORM_FILTERS[platform]

    if (!ids || ids.length === 0) {
        return ''
    }

    return ` & platform = (${ids.join(',')})`
}

function simplifyPlatformLabel(name: string, fallback: GamesQuery['platform']): string {
    const lower = name.toLowerCase()

    if (lower.includes('playstation')) {
        return 'PlayStation'
    }
    if (lower.includes('xbox')) {
        return 'Xbox'
    }
    if (lower.includes('nintendo') || lower.includes('switch') || lower.includes('wii')) {
        return 'Nintendo'
    }
    if (
        lower.includes('pc') || lower.includes('windows') || lower.includes('mac') || lower.includes('linux') ||
        lower.includes('steam')
    ) {
        return 'PC'
    }

    if (fallback === 'playstation') {
        return 'PlayStation'
    }
    if (fallback === 'xbox') {
        return 'Xbox'
    }
    if (fallback === 'nintendo') {
        return 'Nintendo'
    }
    if (fallback === 'pc') {
        return 'PC'
    }

    return name
}

function comparePlatforms(a: string, b: string): number {
    const order = ['PC', 'PlayStation', 'Xbox', 'Nintendo']
    return order.indexOf(a) - order.indexOf(b)
}

const PLATFORM_FILTERS: Record<GamesQuery['platform'], number[]> = {
    all: [],
    pc: [6, 14],
    playstation: [48, 167],
    xbox: [49, 169, 12],
    nintendo: [130, 41, 137],
}
