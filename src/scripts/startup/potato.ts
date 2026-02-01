import { BROWSER } from '../defaults.ts'

export function setPotatoComputerMode() {
	if (BROWSER === 'firefox' || BROWSER === 'safari') {
		// firefox fingerprinting protection disables webgl info, smh
		// safari always have hardware acceleration, no need for potato
		return
	}

	const fourHours = 1000 * 60 * 60 * 4
	const isPotato = localStorage.potato === 'yes'
	const expirationTime = Date.now() - Number.parseInt(localStorage.lastPotatoCheck ?? '0')

	if (expirationTime < fourHours) {
		document.body.classList.toggle('potato', isPotato)
		return
	}

	const canvas = document.createElement('canvas')
	const gl = canvas?.getContext('webgl')
	const debugInfo = gl?.getExtension('WEBGL_debug_renderer_info')

	if (BROWSER === 'chrome' && !gl) {
		document.body.classList.add('potato')
		return
	}

	const vendor = gl?.getParameter(debugInfo?.UNMASKED_VENDOR_WEBGL ?? 0).toString()
	const renderer = gl?.getParameter(debugInfo?.UNMASKED_RENDERER_WEBGL ?? 0).toString()
	const detectedPotato = vendor.includes('Google') && renderer.includes('SwiftShader')

	localStorage.potato = detectedPotato ? 'yes' : 'no'
	localStorage.lastPotatoCheck = Date.now()
	document.body.classList.toggle('potato', detectedPotato)
}
