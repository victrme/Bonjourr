# Games Release Widget

This document describes the current `games` widget implementation in Bonjourr.

## Goal

Show upcoming game releases as a movable widget on the new tab page, with live IGDB data and a horizontally scrollable card strip.

## Current Behavior

The widget is implemented and working in the repo.

What it does now:

- optional movable widget, disabled by default
- live release data from IGDB
- local-only credential flow through settings
- horizontally scrollable cover cards
- mouse wheel maps to horizontal scrolling inside the widget
- automatic loading of the next 30-day release window after actual user scroll intent
- month separators inserted into the strip
- local cache for both the base query and lazy-loaded windows
- loading, empty, setup, and error states
- right-click shortcut to open games settings
- optional click-to-search behavior using Bonjourr's search engine settings
- card size slider in settings

## Data Source

The widget currently uses IGDB directly from the extension.

Flow:

1. user enters `IGDB client ID` and `client secret` in settings
2. the extension exchanges those credentials with Twitch for an app token
3. the extension queries IGDB `release_dates`
4. results are normalized into widget cards

This is a local-only advanced mode. It is acceptable for personal usage, but not ideal for a public/shared extension setup because credentials live client-side.

Official reference:

- IGDB getting started: https://api-docs.igdb.com/#getting-started

## Widget UI

Widget markup:

```html
<div id="games_container" class="hidden">
    <div id="games_header">
        <p>Upcoming releases</p>
    </div>

    <ul id="games_list"></ul>
</div>
```

The card list is rendered from `display.ts` with direct DOM creation.

Each card shows:

- cover image
- game title
- merged platform label
- release date

If multiple release rows match the same game, the widget merges them into a single card and unions platform labels.

## Settings

The widget currently exposes:

- enable / disable
- release window:
  - next 7 days
  - next 14 days
  - next 30 days
- platform filter:
  - all
  - PC
  - PlayStation
  - Xbox
  - Nintendo
- minimum hypes slider
- card size slider
- IGDB client ID / client secret verification form

## Search Interaction

If Bonjourr search is enabled:

- clicking a card searches the game title
- keyboard activation with `Enter` / `Space` also searches the title
- the widget uses the same configured search engine behavior as the main search bar

If search is disabled:

- cards are not interactive
- no click action is attached
- no interactive hover treatment is shown

## Scroll / Pagination Model

The widget no longer uses a fixed visible-item count.

Current model:

- initial query uses the selected release window (`7d`, `14d`, `30d`)
- when the user scrolls toward the end of the strip, the widget loads the next 30-day window
- if a 30-day window is empty, it can look ahead across multiple windows before stopping
- a small loading indicator appears at the end of the strip while the next batch is loading
- `IntersectionObserver` is used for the end-of-strip trigger when available, with a scroll fallback otherwise

The list also inserts month separators like:

- `May 2026`
- `June 2026`

This keeps long scrolling runs easier to scan.

## Caching

Current local cache behavior:

- cache entries are keyed by query and by lazy-loaded window boundaries
- cache schema is versioned; incompatible old cache is invalidated explicitly
- cache refresh age is 1 day
- stale cache can still be used for up to 30 days if a live request fails
- total cache is capped and pruned
- base widget queries are retained ahead of lazy-load window entries

## File Map

Main implementation files:

- `src/scripts/features/games/index.ts`
- `src/scripts/features/games/request.ts`
- `src/scripts/features/games/display.ts`
- `src/styles/features/games.css`

Other integration points:

- `src/index.html`
- `src/settings.html`
- `src/scripts/settings.ts`
- `src/scripts/defaults.ts`
- `src/types/shared.ts`
- `src/types/sync.ts`
- `src/types/local.ts`
- `src/scripts/features/contextmenu.ts`
- `src/scripts/features/move/widgets.ts`

## Current Sync / Local Shape

Current sync structure:

```ts
games: {
    on: boolean
    range: '7d' | '14d' | '30d'
    platform: 'all' | 'pc' | 'playstation' | 'xbox' | 'nintendo'
    limit: 3 | 5 | 10
    minHypes: number
    size: number
}
```

Notes:

- `limit` is still present in sync for compatibility, but the widget no longer exposes an item-count setting in the UI.
- visual pagination is now driven by scrolling and rolling date windows instead.
- current default card size is smaller than the original implementation, and the slider range is biased toward smaller cards

Current local structure includes:

```ts
gamesCache?: Record<string, {
    fetchedAt: number
    query: {
        range: '7d' | '14d' | '30d'
        platform: 'all' | 'pc' | 'playstation' | 'xbox' | 'nintendo'
        limit: number
        minHypes: number
        startAt?: number
        endAt?: number
    }
    items: {
        id: string
        title: string
        releaseDate: string
        platform: string
        cover?: string
        url?: string
    }[]
    hasMore?: boolean
}>
gamesCacheVersion?: number

igdbClientId?: string
igdbClientSecret?: string
igdbAccessToken?: string
igdbAccessTokenExpiresAt?: number
```

## Current Risks / Limitations

- IGDB browser access can still be fragile because this is a direct client-side integration
- credentials are stored locally in the extension, so this approach is not ideal for public distribution
- release-date data quality depends on IGDB and can still contain oddities around editions, early access, or duplicated release metadata

## Possible Future Work

- improve release-date prioritization when IGDB returns multiple dates for the same game
- add a first-class detail link target if a better game URL source is chosen
