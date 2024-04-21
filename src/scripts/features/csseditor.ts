import { EditorOptions, createEditor } from 'prism-code-editor'
import { defaultCommands } from 'prism-code-editor/commands'
import 'prism-code-editor/prism/languages/css-extras'
import 'prism-code-editor/languages/css'

export const create = (options: EditorOptions) => {
	return createEditor('#css-editor', options, defaultCommands())
}
