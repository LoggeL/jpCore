// Load in our dependencies
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-find'));

const db = new PouchDB('db/Users');
const cryptoSettings = require('./crypto.json')

const path = require('path')

// The good shit
const crypto = require('crypto')

// Hand out tokens for the webapps
const jwt = require('jsonwebtoken')

const app = express()
const jwtSecret = cryptoSettings.secret

// Configure Express
app.use(express.static(path.join(__dirname, 'html')));
app.use(cors())
app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}))

// Home Route
app.get('/', function (req, res) {
  res.status(200).send('API operational')
})

// Register Route
app.post('/api/register', async (req, res) => {

  const email = req.body.email
  if (!email) res.status(400).send({ error: 'Keine Mail angegeben' })

  const password = req.body.password
  if (!password) res.status(400).send({ error: 'Kein Passwort angegeben' })

  const name = req.body.name
  if (!name) res.status(400).send({ error: 'Kein Name angegeben' })

  const exists = await db.find({ selector: { email } })
  if (exists.docs.length > 0) return res.status(400).send({ error: 'Nutzer existiert bereits' })

  const salt = crypto.randomBytes(128).toString('base64')
  crypto.pbkdf2(
    password,
    salt,
    cryptoSettings.iterations,
    cryptoSettings.hashBytes,
    cryptoSettings.digest,
    (err, key) => {
      const hash = key.toString('base64')
      const result = db.post({
        email: email,
        name: name,
        salt: salt,
        hash: hash,
        roles: ['admin'],
        date: Date.now(),
        verifiedMail: false
      }).then(() => {
        return res.status(200).json({ success: 'Nutzer erstellt' })
      }).catch(error => {
        return res.status(500).json({ error })
      })
    }
  )
})

// Login HTML Route
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'html', 'login.html'))
})

// Login API Route
app.post('/api/login', (req, res) => {
  const email = req.body.email
  const password = req.body.password

  if (!email) res.status(403).json({ error: 'No Username present' })
  if (!password) res.status(403).json({ error: 'No Password present' })

  db.find({ selector: { email: email }, fields: ['email', 'hash', 'salt', 'roles', 'name', '_id'] }).then(function (result) {

    const row = result.docs[0]

    if (!row) return res.status(403).json({ error: 'Falsche Zugangsdaten' })

    crypto.pbkdf2(
      password,
      row.salt,
      cryptoSettings.iterations,
      cryptoSettings.hashBytes,
      cryptoSettings.digest,
      (err, key) => {
        if (err) return console.error(err)

        const hash = key.toString('base64')

        let roles = row.roles

        if (row.hash != hash) return res.status(403).json({ error: 'Falsche Zugangsdaten' })
        const token = jwt.sign({ _id: row._id, email: email, roles: roles, name: row.name }, jwtSecret)
        res.status(200).json({ success: token })
      })

  }).catch(function (error) {
    console.log(error)
    return res.status(500).json({ error })
  });
})


// API Routes
app.get('/api/private/test', (req, res) => {
  res.status(200).json({ success: 'Valid token' })
})

app.get('/api/public/test', (req, res) => {
  res.status(200).json({ success: 'Systems operational' })
})

// Auth Handler
app.use('/api/private', (req, res, next) => {
  const token = req.headers.authorization
  jwt.verify(token, jwtSecret, function (err, decoded) {
    if (!err) {
      next()
    } else {
      return res.status(403).json({ error: 'Invalid token' })
    }
  })
})

// Admin Handler
app.use('/api/admin', (req, res, next) => {
  const token = req.headers.authorization
  jwt.verify(token, jwtSecret, function (err, decoded) {
    if (!err) {
      try {
        const payload = JSON.parse(new Buffer.from((token.split('.')[1]), 'base64').toString('ascii'))
        if (!payload.roles.includes('admin')) return res.status(403).json({ error: 'Missing permissions' });
        next()
      } catch (error) {
        return res.status(400).json({ text: 'Malformed JWT payload', error });
      }

    } else {
      return res.status(403).json({ error: 'Invalid token' })
    }
  })
})

// Other routes
require('./routes')(app, db);

// Launch our app on port 3000
app.listen('3000', () => console.log('Server listening on port 3000'))
