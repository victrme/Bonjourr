declare global {
	var pageReady: boolean
	var startupBookmarks: undefined
	var startupTopsites: undefined
	var startupStorage: {
		sync?: Sync.Storage
		local?: Local.Storage
	}
}

export {}
