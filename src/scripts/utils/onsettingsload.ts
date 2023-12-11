const callbackList: Function[] = []
let areSettingsLoaded = false

export default function onSettingsLoad(callback: Function) {
	areSettingsLoaded ? callback() : callbackList.push(callback)
}

function loadCallbacks() {
	for (const callback of callbackList) {
		callback()
	}

	areSettingsLoaded = true
	document.removeEventListener('settings', loadCallbacks)
}

document.addEventListener('settings', loadCallbacks)
