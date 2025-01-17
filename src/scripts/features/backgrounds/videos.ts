import { applyBackground } from '.'

interface VideosUpdate {
	hello?: true
}

export default function videosBackgrounds(init: unknown, update?: VideosUpdate) {
	if (init) {
		const url = 'https://cdn.pixabay.com/video/2022/06/13/120254-720504899_tiny.mp4'
		applyBackground({ video: { url } })
	}
}
