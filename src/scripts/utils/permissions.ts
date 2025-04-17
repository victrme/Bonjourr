import { EXTENSION } from '../defaults.ts'

export async function getPermissions(...args: string[]): Promise<boolean> {
	if (!EXTENSION) {
		return true
	}

	return await EXTENSION?.permissions.request({
		permissions: [...args] as browser.permissions.Permission[],
	})
}
