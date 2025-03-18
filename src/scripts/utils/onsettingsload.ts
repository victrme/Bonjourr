const callbackList: (() => void)[] = []
let areSettingsLoaded = false

export default function onSettingsLoad(callback: () => void) {
	areSettingsLoaded ? callback() : callbackList.push(callback)
}

export function loadCallbacks() {
	for (const callback of callbackList) {
		callback()
	}

	areSettingsLoaded = true
}
