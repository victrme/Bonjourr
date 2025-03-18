export async function apiWebSocket(path: string): Promise<WebSocket | undefined> {
	try {
		const socket = new WebSocket(`wss://services.bonjourr.fr/${path}`)
		const isOpened = await new Promise(resolve => {
			socket.onopen = () => resolve(true)
			socket.onerror = () => resolve(false)
			socket.onclose = () => resolve(false)
		})

		if (isOpened) {
			return socket
		}
	} catch (_error) {
		// ...
	}
}

export async function weatherFetch(query: string): Promise<Response | undefined> {
	try {
		return await fetch(`https://weather.bonjourr.fr${query}`)
	} catch (_error) {
		// ...
	}
}

export async function apiFetch(path: string): Promise<Response | undefined> {
	try {
		return await fetch(`https://services.bonjourr.fr${path}`)
	} catch (_error) {
		// ...
	}
}
