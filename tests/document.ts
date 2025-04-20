import { GlobalRegistrator } from '@happy-dom/global-registrator'
import 'fake-indexeddb/auto'

GlobalRegistrator.register({
	url: 'http://localhost:3000',
	width: 600,
	height: 400,
})
