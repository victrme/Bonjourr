export type UnsplashImage = {
	url: string
	link: string
	username: string
	name: string
	city: string
	country: string
	color: string
	exif: {
		make: string
		model: string
		name: string
		exposure_time: string
		aperture: string
		focal_length: string
		iso: number
	}
	desc: string
}

export default UnsplashImage
