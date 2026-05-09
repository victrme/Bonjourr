const callbackList: (() => void)[] = []
let areSettingsLoaded = false

export function onSettingsLoad(callback: () => void): void {
    areSettingsLoaded ? callback() : callbackList.push(callback)
}

export function loadCallbacks(): void {
    for (const callback of callbackList) {
        callback()
    }

    areSettingsLoaded = true
}
