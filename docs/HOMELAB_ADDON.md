# Homelab add-on

This fork keeps Bonjourr as the local, offline-capable new tab page and adds an optional homelab glance layer. The add-on is disabled by default. It never replaces Bonjourr's clock, weather, search, backgrounds, or quick links.

The add-on is intended for a desktop browser extension. A separate Homepage PWA can remain the detailed mobile dashboard, while Homepage or Dashy on the LAN can remain the detailed system dashboard.

## Design goals

- The new tab page and configured shortcuts render from extension files even when the homelab is down.
- A failed status request cannot delay or break Bonjourr startup.
- A single read-only JSON endpoint summarizes the homelab. The extension does not contact Sonarr, Radarr, Docker, WUD, GitHub, or other services individually.
- No API keys, cookies, Basic Auth credentials, or service control actions are supported.
- The last valid response is cached locally and always marked as stale when the endpoint cannot be reached.
- Polling is optional, pauses in hidden tabs, and defaults to one short request per new tab.
- Add-on settings use a separate storage key and separate JSON import/export. Bonjourr's normal settings schema stays untouched.
- Available updates are informational and never change the health indicator by themselves.

## Upstream-friendly layout

All implementation files live under:

```text
src/scripts/addons/homelab/
src/styles/addons/homelab.css
src/styles/addons/homelab-updates.css
tests/addons/homelab/
```

The only Bonjourr core touchpoints are:

1. One import and startup call in `src/scripts/index.ts`.
2. The add-on stylesheet imports in `src/styles/style.css`.
3. A narrow status-endpoint permission in the Chrome, Edge, and Firefox manifests.

The settings section is inserted through Bonjourr's existing settings-load callback. No core settings types, defaults, compatibility filters, translations, or HTML templates are changed.

To bring in future Bonjourr updates:

```sh
git remote add upstream https://github.com/victrme/Bonjourr.git
git fetch upstream
git merge upstream/master
```

Most updates should merge without touching the add-on. If a core touchpoint conflicts, keep the homelab import, the `homelabAddon()` call, both add-on CSS imports, and the narrow status-endpoint manifest permission after resolving the upstream file.

## Build and load in Edge

Install Deno, then run:

```sh
deno task edge
```

The development task builds into `release/edge` and watches for changes. In Edge, open `edge://extensions`, enable Developer mode, choose **Load unpacked**, and select `release/edge`.

The Edge extension itself is offline-enabled. Bonjourr assets load locally. Weather still requires general internet access, and homelab status requires the configured endpoint to be reachable.

## Configure the add-on

Open Bonjourr settings and find **Homelab add-on** near the bottom.

- **Dashboard URL** is where clicking the status summary goes. It can point to Homepage, Dashy, or another read-only dashboard.
- **Status JSON URL** is optional. Leave it blank for shortcut-only mode.
- **Request timeout** defaults to 2500 ms and is limited to 500 through 10000 ms.
- **Refresh interval** defaults to 0, meaning one request when a new tab opens. A nonzero value must be at least 30 seconds.
- **Stale after** marks an old but successfully fetched report as stale.
- **Position** places the independent glance panel in a viewport corner or at bottom center.
- **Quick links** use one entry per line:

```text
Homepage | https://homepage.home.arpa | 🏠
Sonarr | https://sonarr.home.arpa | 📺
Radarr | https://radarr.home.arpa | 🎬
```

The icon is optional. Without one, the add-on uses the first letter of the label. Lines beginning with `#` are comments. Only complete `http://` and `https://` URLs without embedded credentials are accepted.

Use **Export config** and **Import config** to back up this add-on separately from Bonjourr. This separation is intentional and prevents upstream Bonjourr migrations from rewriting add-on data.

## Status endpoint contract

Return JSON no larger than 64 KiB:

```json
{
    "generatedAt": "2026-07-19T12:00:00Z",
    "overall": "degraded",
    "failures": 1,
    "checks": [
        {
            "id": "docker",
            "label": "Docker",
            "state": "healthy"
        },
        {
            "id": "backups",
            "label": "Backups",
            "state": "failed",
            "message": "Backup is overdue",
            "href": "https://homepage.home.arpa/backups"
        }
    ],
    "updates": {
        "available": 6,
        "checkedAt": "2026-07-19T11:55:00Z",
        "href": "http://wud.homelab.home.arpa",
        "reviewHref": "https://github.com/emonhoque/Homelab/issues/123"
    }
}
```

Allowed values are:

- `overall`: `healthy`, `degraded`, or `unhealthy`
- `checks[].state`: `healthy`, `warning`, `failed`, or `unknown`
- `updates.available`: an integer from 0 through 1000

`generatedAt` is optional but recommended. `failures` is optional and is derived from failed checks when omitted. Check `message` and `href` are optional.

The entire `updates` object is optional. When present, it requires a safe HTTP or HTTPS `href`. `checkedAt` and `reviewHref` are optional. Credentialed, non-HTTP, malformed, or oversized values cause the response to be rejected rather than partially trusted.

When `updates.available` is greater than zero, Bonjourr renders a separate informational line. The main link opens WUD. A **Review** link appears only when `reviewHref` is present, normally after Renovate has created its Dependency Dashboard. Zero updates hide the line. Update availability does not increase `failures`, alter `overall`, or appear in the failure list.

## CORS and permissions

The fork requests only the status endpoint it is built to use:

```text
http://status.homelab.home.arpa/*
```

This narrow manifest permission allows the extension page to make the cross-origin request. The status server must also permit it with a CORS response header such as:

```http
Access-Control-Allow-Origin: *
Content-Type: application/json
```

Only use `*` for a sanitized, read-only health summary that contains no secrets. The client always sends requests with credentials omitted, disables HTTP caching, sends no referrer, and applies a short timeout.

After changing the manifest permission, rebuild the extension and reload it from the browser's extensions page. Do not broaden the permission to all HTTP or HTTPS sites.

Keep detailed logs, service credentials, container controls, raw update data, and restart actions in Homepage, WUD, or the watchdog. The glance endpoint should expose only the minimum state needed for the new tab summary.

## Failure behavior

- Endpoint reachable and healthy: a quiet green status appears.
- Endpoint reachable with failures: the issue count and up to five affected checks appear.
- Updates available: an independent update line appears without degrading health.
- Endpoint returns old data: the panel and any cached update line are marked as stale.
- Endpoint times out, fails CORS, or is offline: the panel says **Homelab unavailable** and shows when it last succeeded. A cached update count may remain visible as stale.
- Entire homelab is offline: Bonjourr, local configuration, shortcuts, clock, backgrounds, and other extension features still load. Online services such as weather continue working if the wider internet is available.

## Custom CSS

Bonjourr's existing Custom Style editor can target the stable `#homelab-addon` selectors. The main color variables are:

```css
#homelab-addon {
    --homelab-surface: rgb(10 10 10 / 0.6);
    --homelab-border: rgb(255 255 255 / 0.25);
    --homelab-healthy: #6ee7a0;
    --homelab-warning: #ffd166;
    --homelab-danger: #ff7070;
}
```
