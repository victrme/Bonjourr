import { assertEquals } from '@std/assert'

const statusPermission = 'http://status.homelab.home.arpa/*'

for (const browser of ['chrome', 'edge', 'firefox']) {
    Deno.test(`${browser} manifest grants only the homelab status endpoint`, async () => {
        const manifestUrl = new URL(`../../../src/manifests/${browser}.json`, import.meta.url)
        const manifest = JSON.parse(await Deno.readTextFile(manifestUrl))

        assertEquals(manifest.host_permissions, [statusPermission])
    })
}
