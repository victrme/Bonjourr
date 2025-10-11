export class VideoLooper {
	private video1: HTMLVideoElement
	private video2: HTMLVideoElement
	private container: HTMLElement
	private fadetime: number
	private listener: () => void

	constructor(src: string, fadetime = 4) {
		this.container = document.createElement('div')
		this.container.classList.add('video-looper')

		this.video1 = this.createVideo(src)
		this.video2 = this.createVideo(src)

		this.video1.id = 'first-looped-video'
		this.video2.id = 'second-looped-video'

		this.container.appendChild(this.video1)
		this.container.appendChild(this.video2)

		this.fadetime = fadetime ?? 4
		this.setTransitionDuration(this.fadetime)

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
		}, this.fadetime * 1000)
	}

	public getContainer(): HTMLElement {
		return this.container
	}

	public setFadeTime(fadetime: number) {
		this.fadetime = fadetime
		this.setTransitionDuration(fadetime)
	}

	//
	// Private
	//

	private createVideo(src: string, autoplay = false): HTMLVideoElement {
		const elem = document.createElement('video')

		elem.muted = true
		elem.src = src
		elem.autoplay = autoplay

		elem.addEventListener('ended', () => {
			elem.currentTime = 0
			elem.classList.remove('hiding')
			this.container.prepend(elem)
		})

		return elem
	}

	private setTransitionDuration(fadetime: number) {
		this.container.style.setProperty('--video-fadetime', fadetime + 's')
	}

	private isEnding(vid: HTMLVideoElement) {
		return Math.round(vid.currentTime) > vid.duration - this.fadetime
	}
}
