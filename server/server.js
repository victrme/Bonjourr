const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const fs = require('fs/promises')
const db = require('better-sqlite3')('app.db')
const argon2 = require('argon2')
const path = require('path')
const crypto = require('crypto')

let sessions = []

const ARGON2ID_SECRET = Buffer.from(process.env.HASH_SECRET ?? 'Y2hhbmdlbWU=' /*-> changme*/, 'base64')
const ARGON2ID_CONFIG = {
	type: argon2.argon2d,
	memoryCost: 2 ** 16,
	hashLength: 64,
	secret: ARGON2ID_SECRET,
}

const CONFIG_PATH = path.resolve(__dirname, './config.json')

const CURRENT_VERSION = '19.1.1'

const DEFAULT_CONFIG = {
	about: {
		browser: 'generic',
		version: CURRENT_VERSION,
	},
	showall: false,
	lang: 'en',
	dark: 'system',
	favicon: '',
	tabtitle: '',
	greeting: '',
	pagegap: 1,
	pagewidth: 1600,
	time: true,
	main: true,
	dateformat: 'eu',
	background_blur: 15,
	background_bright: 0.8,
	background_type: 'unsplash',
	quicklinks: true,
	syncbookmarks: undefined,
	textShadow: 0.2,
	announcements: 'major',
	review: 0,
	cssHeight: 80,
	css: '',
	hide: {},
	linkstyle: 'large',
	linknewtab: false,
	linksrow: 6,
	linktabs: {
		active: false,
		selected: 0,
		titles: [''],
	},
	clock: {
		size: 1,
		ampm: false,
		analog: false,
		seconds: false,
		face: 'none',
		style: 'round',
		timezone: 'auto',
	},
	unsplash: {
		every: 'hour',
		collection: '',
		lastCollec: 'day',
		pausedImage: undefined,
		time: undefined,
	},
	weather: {
		ccode: undefined,
		city: undefined,
		unit: 'metric',
		provider: '',
		moreinfo: 'none',
		forecast: 'auto',
		temperature: 'actual',
		geolocation: 'approximate',
	},
	notes: {
		on: false,
		width: 40,
		opacity: 0.1,
		align: 'left',
	},
	searchbar: {
		on: false,
		opacity: 0.1,
		newtab: false,
		suggestions: true,
		engine: 'google',
		request: '',
		placeholder: '',
	},
	quotes: {
		on: false,
		author: false,
		type: 'classic',
		frequency: 'day',
		last: 1650516688,
	},
	font: {
		family: '',
		size: '14',
		system: true,
		weightlist: [],
		weight: '300',
	},
	move: {
		selection: 'single',
		layouts: {
			single: {
				grid: [['time'], ['main'], ['quicklinks']],
				items: {},
			},
			double: {
				grid: [
					['time', '.'],
					['main', '.'],
					['quicklinks', '.'],
				],
				items: {},
			},
			triple: {
				grid: [
					['.', 'time', '.'],
					['.', 'main', '.'],
					['.', 'quicklinks', '.'],
				],
				items: {},
			},
		},
	},
}

function verifyConfig(config) {
	config = config ?? {}

	const defaultConfigKeys = Object.keys(DEFAULT_CONFIG)

	// Delete keys that are not in the config, prevent storing junk in json
	for (const key in Object.keys(config).filter((key) => defaultConfigKeys.indexOf(key) === -1)) {
		delete config[key]
	}

	for (const key in defaultConfigKeys) {
		if (!(key in config)) {
			config[key] = DEFAULT_CONFIG[key]
		}
	}
	return config
}

async function init() {
	db.exec(
		`CREATE TABLE IF NOT EXISTS users(
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username VARCHAR(128) UNIQUE,
			password VARCHAR(256)
		);
		`
	)

	try {
		await fs.stat(CONFIG_PATH)
	} catch (_) {
		await fs.writeFile(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG))
	}

	app.listen(8080, '0.0.0.0')
}

function isFirstUser() {
	const count = db.prepare('SELECT COUNT(id) as user_count FROM users;').get()
	return count.user_count === 0
}

async function createUser(username, password) {
	const passwordHash = await argon2.hash(password, ARGON2ID_CONFIG)

	db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, passwordHash)
}

async function loginUser(username, password) {
	const row = db.prepare('SELECT password FROM users WHERE username=?').get(username)
	if (!row) return false

	return await argon2.verify(row.password, password, ARGON2ID_CONFIG)
}

function createToken(ttl = 3600_000 * 24) {
	const token = crypto.randomBytes(46).toString('base64url')
	sessions.push(token)

	setTimeout(() => (sessions = sessions.filter((v) => v !== token)), ttl)

	return token
}

function isTokenValid(token) {
	return sessions.indexOf(token) >= 0
}

function parseAuthorization(authorization) {
	const parts = authorization.split(' ', 2)
	if (parts[0] !== 'Bearer') return
	return parts[1]
}

function createTokenResponse() {
	const ttl = 3600_000 * 24
	return { token: createToken(ttl), expires: Date.now() + ttl }
}

app.use(express.static('./client'))
app.use(bodyParser.json({ type: 'application/json' }))

app.get('/api/config', (_, res) => {
	res.sendFile(path.resolve(__dirname, './config.json'))
})

app.post('/api/login', async (req, res) => {
	if (isFirstUser()) {
		await createUser(req.body.username, req.body.password)
		res.send(createTokenResponse())
		return
	}
	if (!(await loginUser(req.body.username, req.body.password))) {
		res.statusCode = '401'
		res.send({ error: 'Invalid username or password.' })
		return
	}
	res.send(createTokenResponse())
})

app.put('/api/config', async (req, res) => {
	const auth = parseAuthorization(req.headers.authorization ?? '')
	res.contentType('plain/text')
	if (!auth || !isTokenValid(auth)) {
		res.statusCode = 401
		res.send('Invalid session.')
		return
	}
	try {
		await fs.writeFile(path.resolve(__dirname, './config.json'), JSON.stringify(verifyConfig(req.body)))
		res.send('Configuration updated.')
	} catch (err) {
		console.error(err)
		res.statusCode = 500
		res.send('Unable to update configuration.')
	}
})

init()
