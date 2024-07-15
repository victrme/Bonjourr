import { PLATFORM, EXTENSION } from '../defaults'

export default async function getPermissions(...args: string[]): Promise<boolean> {
	if (PLATFORM === 'online') {
		return true
	}

	return await EXTENSION.permissions.request({
		permissions: [...args] as browser.permissions.Permission[],
	})
}
