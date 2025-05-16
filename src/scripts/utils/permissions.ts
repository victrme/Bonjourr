import { PLATFORM } from '../defaults.ts'

export async function getPermissions(...args: string[]): Promise<boolean> {
	switch (PLATFORM) {
		case 'online': {
			return true
		}

		case 'firefox': {
			return await browser.permissions.request({
				permissions: [...args as browser._manifest.OptionalPermission[]],
			})
		}

		default: {
			return chrome.permissions.request({
				permissions: [...args as chrome.runtime.ManifestPermissions[]],
			}) ?? false
		}
	}
}
