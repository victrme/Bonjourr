import { EditorOptions, createEditor } from 'prism-code-editor'
import { defaultCommands } from 'prism-code-editor/commands'
import 'prism-code-editor/prism/languages/css-extras'
import 'prism-code-editor/prism/languages/uri'
import 'prism-code-editor/languages/css'

export function createCssEditor(options: EditorOptions) {
	return createEditor('#css-editor', options, defaultCommands())
}

export function createBackgroundUrlsEditor(options: EditorOptions) {
	return createEditor('#background-urls-editor', options, defaultCommands())
}
