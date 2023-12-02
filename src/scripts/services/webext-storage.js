var startupStorage = {}

chrome.storage.sync.get(null, (sync) => (startupStorage.sync = sync))
chrome.storage.local.get(null, (local) => (startupStorage.local = local))
