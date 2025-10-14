export class VideoLooper {
	private video1: HTMLVideoElement
	private video2: HTMLVideoElement
	private container: HTMLElement
	private fadetime: number
	private playbackRate: number
	private listener: () => void

	constructor(src: string, fadetime = 4000, playbackRate = 1) {
		this.fadetime = fadetime
		this.playbackRate = playbackRate

		this.container = document.createElement('div')
		this.container.classList.add('video-looper')

		this.video1 = this.createVideo(src)
		this.video2 = this.createVideo(src)

		this.video1.id = 'first-looped-video'
		this.video2.id = 'second-looped-video'

		this.container.appendChild(this.video1)
		this.container.appendChild(this.video2)

		// <!>
		// Listener needs to be stored to correctly remove
		// the document eventListener

		this.listener = () => {
			this.stop()

			if (!document.hidden) {
				this.video2.play()
			}
		}

		document.addEventListener(
			'visibilitychange',
			this.listener,
		)

		return
	}

	//
	// Public
	//

	public loop() {
		this.video2.play()

		this.video1.addEventListener('timeupdate', () => {
			if (this.isEnding(this.video1)) {
				this.video1.classList.add('hiding')
				this.video2.play()
			}
		})

		this.video2.addEventListener('timeupdate', () => {
			if (this.isEnding(this.video2)) {
				this.video2.classList.add('hiding')
				this.video1.play()
			}
		})
	}

	public stop() {
		this.video1.pause()
		this.video2.pause()
		this.video1.currentTime = 0
		this.video2.currentTime = 0
		this.video1.classList.remove('hiding')
		this.video2.classList.remove('hiding')
	}

	public remove() {
		this.container.style.opacity = '0'

		setTimeout(() => {
			this.video1.remove()
			this.video2.remove()
			this.container.remove()

			if (this.listener) {
				document.removeEventListener(
					'visibilitychange',
					this.listener,
				)
			}
		}, this.fadetime)
	}

	public getContainer(): HTMLElement {
		return this.container
	}

	public setFadeTime(fadetime: number) {
		const realDuration = this.getRealDuration()
		const halfDurationInMs = Math.round((realDuration / 2) * 1000)
		const isFadeTooLong = halfDurationInMs < fadetime

		if (isFadeTooLong) {
			this.fadetime = halfDurationInMs
		} else {
			this.fadetime = fadetime
		}

		this.addTransitionDuration(this.fadetime)
	}

	public setPlaybackRate(playbackRate: number) {
		this.playbackRate = playbackRate
		this.video1.playbackRate = playbackRate
		this.video2.playbackRate = playbackRate
	}

	//
	// Private
	//

	private createVideo(src: string, autoplay = false): HTMLVideoElement {
		const elem = document.createElement('video')

		elem.muted = true
		elem.src = src
		elem.autoplay = autoplay
		elem.playbackRate = this.playbackRate

		elem.addEventListener('loadedmetadata', () => {
			this.setFadeTime(this.fadetime)
		})

		elem.addEventListener('ended', () => {
			elem.currentTime = 0
			elem.classList.remove('hiding')
			this.container.prepend(elem)
		})

		return elem
	}

	/**
	 * Javascript counts seconds faster instead of using real time.
	 * This returns the video duration based on its speed.
	 *
	 * If triggered before video loaded, returns 8 seconds to cap fadetime
	 */
	private getRealDuration(): number {
		try {
			const durationInMs = this.video1.duration
			const playbackRate = this.video1.playbackRate
			return durationInMs / playbackRate
		} catch (_) {
			console.info('Video duration was guessed to eight seconds')
			return 8
		}
	}

	private addTransitionDuration(fadetime: number) {
		this.container.style.setProperty('--video-fadetime', fadetime + 'ms')
	}

	private isEnding(vid: HTMLVideoElement) {
		const currentTime = (vid.currentTime * 1000) / this.playbackRate
		const duration = (vid.duration * 1000) / this.playbackRate

		return currentTime > duration - this.fadetime
	}
}
