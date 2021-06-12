// Load in our dependencies
const express = require('express')
const cors = require('cors')
const db = require('knex')({
  client: 'sqlite3',
  connection: {
    filename: './data.sqlite',
  },
})

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Home Route
app.get('/', function (req, res) {
  res.status(200).send('API operational')
})

// Register Route
app.post('/api/admin/register', async (req, res) => {

  const email = req.body.email
  if (!email) res.status(400).send({ error: 'Missing Mail' })

  const password = req.body.password
  if (!password) res.status(400).send({ error: 'Missing Password' })

  const name = req.body.name
  if (!name) res.status(400).send({ error: 'Missing Name' })

  const exists = await db('account').where('email', email)
  if (exists[0]) return res.status(400).send({ error: 'User already exists' })

  const role = req.body.role

  const salt = crypto.randomBytes(128).toString('base64')
  crypto.pbkdf2(
    password,
    salt,
    cryptoSettings.iterations,
    cryptoSettings.hashBytes,
    cryptoSettings.digest,
    (err, key) => {
      const hash = key.toString('base64')
      db('account').insert({
        email: email,
        name: name,
        salt: salt,
        hash: hash,
        roles: role ? [role] : [],
        lastActivity: Date.now(),
        verifiedMail: false
      }).then(() => {
        return res.status(200).json({ success: 'User created' })
      }).catch(error => {
        console.error(error)
        return res.status(500).json({ error })
      })
    }
  )
})


// Delete Account Route
app.delete('/api/admin/register/:id', async (req, res) => {

  const id = req.params.id
  if (!id) res.status(400).json({ error: 'Missing id' })

  db('item').where('id', id).del().then(response => {
    res.status(200).json({ success: "Removed Account" })
  }).catch(error => {
    console.error(error)
    res.status(500).json({ error, text: "Error deleting Account" })
  })
})

// Login HTML Route
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'html', 'index.html'))
})

// Login API Route
app.post('/api/public/login', async (req, res) => {
  const email = req.body.email
  const password = req.body.password

  if (!email) res.status(403).json({ error: 'No email present' })
  if (!password) res.status(403).json({ error: 'No Password present' })

  db('account').where('email', email).select('*').then(result => {

    const row = result[0]

    if (!row) return res.status(403).json({ error: 'Invalid email address' })

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

        if (row.hash != hash) return res.status(403).json({ error: 'Invalid password' })
        const token = jwt.sign({ id: row.id, email: email, roles: roles, name: row.name }, jwtSecret)
        res.status(200).json({ success: token })
      })

  }).catch(function (error) {
    console.log(error)
    return res.status(500).json({ error })
  });
})

app.get('api/public/verifyMail', (req, res) => {
  const token = req.query.token
  jwt.verify(token, jwtSecret, function (err, decoded) {
    if (!err) {
      const userID = decoded.userID
      if (decoded.type = "verifyMail" && userID) {
      }
    } else {
      return res.status(403).json({ error: 'Invalid token' })
    }
  })
})

// API Routes
app.get('/api/private/test', (req, res) => {
  res.status(200).json({ success: 'Valid token' })
})

app.get('/api/public/test', (req, res) => {
  res.status(200).json({ success: 'Systems operational' })
})

app.get('/api/admin/test', (req, res) => {
  res.status(200).json({ success: 'Token has admin powers' })
})

// User Handler
app.use('/api/private', (req, res, next) => {
  const token = req.headers.authorization
  jwt.verify(token, jwtSecret, function (err, decoded) {
    if (!err) {
      req.jwt = decoded
      next()
      db('account').where('id', decoded.id).update({ lastActivity: Date.now() })
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
        if (!decoded.roles.includes('admin')) return res.status(403).json({ error: 'Missing permissions' });
        req.jwt = decoded
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
require('./routes/poolparty')(app, db)

// Launch our app on port 3000
app.listen('3000', () => console.log('Server listening on port 3000'))
