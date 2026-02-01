import { ENVIRONNEMENT, PLATFORM } from '../defaults.ts'

export function serviceWorker() {
	if (ENVIRONNEMENT !== 'PROD' || PLATFORM !== 'online' || !('serviceWorker' in navigator)) {
		return
	}

	navigator.serviceWorker.register('service-worker.js')

	let promptEvent: Event // PWA install trigger (30s interaction default)

	globalThis.addEventListener('beforeinstallprompt', (e) => {
		promptEvent = e
		return promptEvent
	})
}
