interface VideosUpdate {
	hello?: true
}

export default function videosBackgrounds(init: unknown, update?: VideosUpdate) {
	const video = document.querySelector<HTMLVideoElement>('#video-background')
	const overlay = document.querySelector<HTMLDivElement>('#image-background-overlay')

	if (init) {
		if (video && overlay) {
			video.src = 'https://cdn.pixabay.com/video/2022/06/13/120254-720504899_tiny.mp4'
			overlay.style.opacity = '1'
			console.log('hello world')
		}
	}
}
