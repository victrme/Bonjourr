const animations = new WeakMap<HTMLElement, Animation>()

export function keepToolbarVisible(toolbar: HTMLElement): void {
    if (toolbar.hidden || !toolbar.style.top) return
    const bounds = toolbar.getBoundingClientRect()
    toolbar.style.left = `${Math.max(8, Math.min(bounds.left, globalThis.innerWidth - bounds.width - 8))}px`
    toolbar.style.top = `${Math.max(8, Math.min(bounds.top, globalThis.innerHeight - bounds.height - 8))}px`
}

export function moveToolbar(toolbar: HTMLElement): void {
    let drag: { pointer: number; x: number; y: number; left: number; top: number } | undefined
    toolbar.addEventListener('pointerdown', (event) => {
        if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return
        const bounds = toolbar.getBoundingClientRect()
        drag = { pointer: event.pointerId, x: event.clientX, y: event.clientY, left: bounds.left, top: bounds.top }
        toolbar.style.left = `${bounds.left}px`
        toolbar.style.top = `${bounds.top}px`
        toolbar.style.bottom = 'auto'
        toolbar.style.transform = 'none'
        toolbar.setPointerCapture(event.pointerId)
        event.preventDefault()
    })
    toolbar.addEventListener('pointermove', (event) => {
        if (!drag || event.pointerId !== drag.pointer) return
        toolbar.style.left = `${drag.left + event.clientX - drag.x}px`
        toolbar.style.top = `${drag.top + event.clientY - drag.y}px`
        keepToolbarVisible(toolbar)
    })
    const stop = (): void => {
        const pointer = drag?.pointer
        drag = undefined
        if (pointer !== undefined && toolbar.hasPointerCapture(pointer)) toolbar.releasePointerCapture(pointer)
    }
    toolbar.addEventListener('pointerup', stop)
    toolbar.addEventListener('pointercancel', stop)
    toolbar.addEventListener('lostpointercapture', stop)
    globalThis.addEventListener('blur', stop)
}

export function stopTileMotion(element: HTMLElement | null | undefined): void {
    if (!element) return
    animations.get(element)?.cancel()
    animations.delete(element)
}

export function measureTiles(elements: HTMLElement[]): Map<HTMLElement, DOMRect> {
    const bounds = new Map<HTMLElement, DOMRect>()
    for (const element of elements) {
        if (element.hidden) continue
        const rect = element.getBoundingClientRect()
        if (rect.width && rect.height) bounds.set(element, rect)
    }
    return bounds
}

/** Retarget from the current on-screen position, including interrupted animations. */
export function animateTiles(before: Map<HTMLElement, DOMRect>): void {
    const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const easing = getComputedStyle(document.documentElement).getPropertyValue('--out-cubic').trim() || 'ease-out'
    for (const [element, previous] of before) {
        stopTileMotion(element)
        if (reduced || element.hidden || !element.animate) continue
        const next = element.getBoundingClientRect()
        if (!next.width || !next.height) continue
        const dx = previous.x - next.x
        const dy = previous.y - next.y
        const sx = previous.width / next.width
        const sy = previous.height / next.height
        if (
            Math.abs(dx) + Math.abs(dy) + Math.abs(previous.width - next.width) +
                    Math.abs(previous.height - next.height) < 0.5
        ) continue
        const animation = element.animate([
            { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, transformOrigin: 'top left' },
            { transform: 'none', transformOrigin: 'top left' },
        ], { duration: 300, easing })
        animations.set(element, animation)
        animation.finished.then(() => {
            if (animations.get(element) === animation) animations.delete(element)
        }).catch(() => undefined)
    }
}
