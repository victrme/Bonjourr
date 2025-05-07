import { onSettingsLoad } from './onsettingsload.ts'

export function settingsNotifications(notifs: Record<string, boolean>): void {
	//
	onSettingsLoad(() => {
		for (const [id, state] of Object.entries(notifs)) {
			document.getElementById(id)?.classList?.toggle('shown', state)
		}

		const wrapper = document.getElementById('settings-notifications')
		const hasNotifs = document.querySelectorAll('#settings-notifications .param.shown').length > 0

		wrapper?.classList?.toggle('shown', hasNotifs)
	})
}
