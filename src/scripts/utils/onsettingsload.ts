type Func = () => void

const callbackList: Func[] = []
let areSettingsLoaded = false

export default function onSettingsLoad(callback: Func) {
	areSettingsLoaded ? callback() : callbackList.push(callback)
}

export function loadCallbacks() {
	for (let i = 0; i < callbackList.length; i++) {
		callbackList[i]()
	}

	areSettingsLoaded = true
}
