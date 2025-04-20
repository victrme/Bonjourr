import { GlobalWindow } from 'happy-dom'

const html = Deno.readTextFileSync('./release/chrome/index.html')
// const doc = new DOMParser().parseFromString(html, 'text/html')

globalThis.window = new GlobalWindow()
globalThis.document = window.document
