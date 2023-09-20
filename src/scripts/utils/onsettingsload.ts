const settingsObserverCallbacks: Function[] = []
let areSettingsLoaded = false

const settingsObserver = new MutationObserver((records: MutationRecord[]) => {
	const isNodeSettings = (records[0].addedNodes[0] as Element).id === 'settings'

	if (isNodeSettings && settingsObserverCallbacks.length > 0) {
		for (const callback of settingsObserverCallbacks) {
			callback()
		}
	}

	areSettingsLoaded = true
	settingsObserver.disconnect()
})

settingsObserver.observe(document.body, { childList: true })

export default function onSettingsLoad(callback: Function) {
	areSettingsLoaded ? callback() : settingsObserverCallbacks.push(callback)
}
