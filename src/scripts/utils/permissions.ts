import { PLATFORM } from '../defaults'

export default async function getPermissions(...args: string[]): Promise<boolean> {
	if (PLATFORM === 'online') {
		return true
	}

	return await (PLATFORM === 'firefox' ? browser : chrome).permissions.request({
		permissions: [...args] as browser.permissions.Permission[],
	})
}
