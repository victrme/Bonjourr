const callbackList: Function[] = []
let areSettingsLoaded = false

export default function onSettingsLoad(callback: Function) {
	areSettingsLoaded ? callback() : callbackList.push(callback)
}

function loadCallbacks() {
	for (let i = 0; i < callbackList.length; i++) {
		callbackList[i]()
	}

	areSettingsLoaded = true
	document.removeEventListener('settings', loadCallbacks)
}

document.addEventListener('settings', loadCallbacks)
