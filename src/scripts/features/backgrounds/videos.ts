interface VideosUpdate {
	hello?: true
}

export default function videosBackgrounds(init: unknown, update?: VideosUpdate) {
	const video = document.querySelector<HTMLMediaElement>('#video-background')

	video?.addEventListener('timeupdate', function (event) {
		console.log(event)
	})

	if (init) {
		if (video) {
			video.src = 'https://cdn.pixabay.com/video/2022/06/13/120254-720504899_tiny.mp4'
		}
	}
}
