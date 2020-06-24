// Load in our dependencies
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const sqlite3 = require('sqlite3').verbose()

const db = new sqlite3.Database('dev.sqlite')
const cryptoSettings = require('./crypto.json')

const path = require('path')

// The good shit
const crypto = require('crypto')

// Hand out tokens for the webapps
const jwt = require('jsonwebtoken')

const app = express()
const jwtSecret = 'temp-secret'

// Configure Express
app.use(express.static(path.join(__dirname, 'html')));
app.use(cors())
app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}))

// Home Route
app.get('/', function (req, res) {
  res.send('API operational')
})

// Register Route
app.get('/api/register', (req, res) => {
  const salt = crypto.randomBytes(128).toString('base64')
  crypto.pbkdf2(
    req.query.password,
    salt,
    cryptoSettings.iterations,
    cryptoSettings.hashBytes,
    cryptoSettings.digest,
    (err, key) => {
      const hash = key.toString('base64')
      db.run(
        'INSERT INTO `Users` (email, salt, hash, role, regDate, name, verifiedMail)  VALUES (?, ?, ?, NULL, ?, ?, 0);',
        [req.query.email, salt, hash, Date.now(), req.query.name], (error) => {
          if (error) console.error(error)
        })
      console.log('Done')
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

  if (!email) res.status(403).send('No Username present')
  if (!password) res.status(403).send('No Password present')


  db.get('SELECT hash, salt, role, name FROM Users WHERE email = ?', [email], (error, row) => {
    if (error) return console.error(error)

    if (!row) return res.status(403).json({ error: "Falsche Zugangsdaten" })

    crypto.pbkdf2(
      password,
      row.salt,
      cryptoSettings.iterations,
      cryptoSettings.hashBytes,
      cryptoSettings.digest,
      (err, key) => {
        if (err) return console.error(err)

        const hash = key.toString('base64')

        let roles = []
        if (row.role) {
          roles = JSON.parse(row.role)
        }

        if (row.hash != hash) return res.status(403).json({ error: "Falsche Zugangsdaten" })
        const token = jwt.sign({ email: email, role: roles, name: row.name }, jwtSecret)
        res.send({ success: token })
      })
  })
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
      res.status(403).send({ error: 'Invalid token' })
    }
  })
})

// Other routes
require('./routes')(app, db);

// Launch our app on port 3000
app.listen('3000', () => console.log('Server listening on port 3000'))
