// Load in our dependencies
const express = require('express')
const cors = require('cors')
const db = require('knex')({
  client: 'sqlite3',
  connection: {
    filename: './data.sqlite',
  },
})
require('dotenv').config()

const cryptoSettings = require('./crypto.json')

const path = require('path')

// The good shit
const crypto = require('crypto')

// Hand out tokens for the webapps
const jwt = require('jsonwebtoken')

const app = express()
const jwtSecret = cryptoSettings.secret

const nodemailer = require('nodemailer')
const mailConfig = require('./routes/email/mailConfig.json')

const transporter = nodemailer.createTransport(mailConfig)

// Configure Express
app.use(express.static(path.join(__dirname, 'html')))
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Home Route
app.get('/', function (req, res) {
  res.status(200).send('API operational')
})

// Register Route
app.post('/api/admin/register', async (req, res) => {
  const email = req.body.email
  if (!email) res.status(400).send({ error: 'Mail fehlt' })

  const password = req.body.password
  if (!password) res.status(400).send({ error: 'Passwort fehlt' })

  const name = req.body.name
  if (!name) res.status(400).send({ error: 'Name fehlt' })

  email = email.toLowerCase();
  const exists = await db('account').where('email', email)
  if (exists[0])
    return res.status(400).send({ error: 'Nutzer existiert bereits' })

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
      db('account')
        .insert({
          email: email,
          name: name,
          salt: salt,
          hash: hash,
          roles: role ? [role] : [],
          createdAt: Date.now(),
          lastActivity: Date.now(),
          verifiedMail: true,
        })
        .then(() => {
          return res.status(200).json({ success: 'Nutzer erstellt' })
        })
        .catch((error) => {
          console.error(error)
          return res.status(500).json({ error })
        })
    }
  )
})

// Delete Account Route
app.delete('/api/admin/register/:id', async (req, res) => {
  const id = req.params.id
  if (!id) res.status(400).json({ error: 'Account ID fehlt' })

  db('account')
    .where('id', id)
    .del()
    .then((response) => {
      if (!response) {
        return res.status(404).json({ error: 'Unbekannte Account ID' })
      }
      return res.status(200).json({ success: 'Account gelöscht' })
    })
    .catch((error) => {
      console.error(error)
      return res
        .status(500)
        .json({ error, text: 'Fehler beim löschen des Accounts' })
    })
})

// Login HTML Route
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'html', 'index.html'))
})

// Login API Route
app.post('/api/public/login', async (req, res) => {
  let email = req.body.email
  const password = req.body.password

  if (!email) res.status(403).json({ error: 'Keine Email angegeben' })
  if (!password) res.status(403).json({ error: 'Kein Passwort angegeben' })

  email = email.toLowerCase();
  db('account')
    .where('email', email)
    .select('salt', 'verifiedMail', 'hash', 'name', 'roles', 'id')
    .first()
    .then((result) => {
      if (!result) return res.status(403).json({ error: 'Unbekannte E-Mail' })

      if (!result.verifiedMail)
        return res.status(403).json({ error: 'Email nicht verifiziert' })

      crypto.pbkdf2(
        password,
        result.salt,
        cryptoSettings.iterations,
        cryptoSettings.hashBytes,
        cryptoSettings.digest,
        (err, key) => {
          if (err) return console.error(err)

          const hash = key.toString('base64')

          if (result.hash != hash)
            return res.status(403).json({ error: 'Falsches Passwort' })
          const token = jwt.sign(
            {
              id: result.id,
              email: email,
              roles: result.roles,
              name: result.name,
            },
            jwtSecret
          )
          res.status(200).json({ success: token })
        }
      )
    })
    .catch(function (error) {
      console.log(error)
      return res.status(500).json({ error })
    })
})

app.get('/api/public/verifyMail', (req, res) => {
  let token = req.query.token
  // decode token
  if (!token) return res.status(403).json({ error: 'Token fehlt' })
  token = Buffer.from(token, 'base64').toString('utf8')

  jwt.verify(token, jwtSecret, function (err, decoded) {
    if (!err) {
      const userID = decoded.userID
      if ((decoded.type = 'verifyMail' && userID)) {
      }
    } else {
      return res.status(403).json({ error: 'Unzulässiger Token' })
    }
  })
})

app.post('/api/public/sendPasswordReset', (req, res) => {
  const email = req.body.email
  if (!email) return res.status(403).json({ error: 'Keine Email angegeben' })

  db('account')
    .where('email', email)
    .select('*')
    .first()
    .then((result) => {
      if (!result) return res.status(403).json({ error: 'Unbekannte E-Mail' })

      if (!result.verifiedMail)
        return res.status(403).json({ error: 'Email nicht verifiziert' })

      // Create a token to prevent multiple requests
      const passwordResetToken = crypto.randomBytes(128).toString('base64')

      // Add passwordResetToken to the user
      db('account')
        .where('id', result.id)
        .update({ passwordResetToken })
        .then(() => {
          // Send email with token

          let token = jwt.sign(
            {
              userID: result.id,
              type: 'resetPassword',
              email,
              passwordResetToken,
            },
            jwtSecret
          )

          // Base64 token
          token = Buffer.from(token).toString('base64')

          const url = `${process.env.HOST}/forgotPassword.html?token=${token}`
          const mailOptions = {
            from: '"JP Poolparty" <poolparty@jupeters.de>',
            to: email,
            subject: 'Passwort zurücksetzen',
            text: `Klicken Sie auf den folgenden Link um Ihr Passwort zurückzusetzen: ${url}`,
          }

          transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
              console.log(error)
              return res.status(500).json({ error })
            } else {
              return res.status(200).json({ success: 'E-Mail wurde versendet' })
            }
          })
        })
        .catch((error) => {
          console.error(error)
          return res.status(500).json({ error })
        })
    })
    .catch(function (error) {
      console.log(error)
      return res.status(500).json({ error })
    })
})

app.post('/api/public/resetPassword', (req, res) => {
  let { token, password } = req.body
  if (!token) return res.status(403).json({ error: 'Token fehlt' })
  if (!password) return res.status(403).json({ error: 'Passwort fehlt' })

  jwt.verify(token, jwtSecret, function (err, decoded) {
    if (!err) {
      const { userID, email, type, passwordResetToken } = decoded

      // Get user from db
      db('account')
        .where('id', userID)
        .select('*')
        .first()
        .then((result) => {
          if (!result)
            return res.status(403).json({ error: 'Unbekannte E-Mail' })

          if (email != result.email)
            return res.status(403).json({ error: 'Falsche E-Mail' })

          if (!result.verifiedMail)
            return res.status(403).json({ error: 'Email nicht verifiziert' })

          if (type !== 'resetPassword')
            return res.status(403).json({ error: 'Falscher Token Typ' })

          if (passwordResetToken !== result.passwordResetToken)
            return res
              .status(403)
              .json({ error: 'Reset Token abgelaufen / schon verwendet' })

          // Create a new salt and hash
          const salt = crypto.randomBytes(128).toString('base64')

          crypto.pbkdf2(
            password,
            salt,
            cryptoSettings.iterations,
            cryptoSettings.hashBytes,
            cryptoSettings.digest,
            (err, key) => {
              const hash = key.toString('base64')
              db('account')
                .where('id', userID)
                .update({
                  salt: salt,
                  hash: hash,
                  passwordResetToken: null,
                })
                .then(() => {
                  return res
                    .status(200)
                    .json({ success: 'Passwort wurde geändert' })
                })
                .catch((error) => {
                  console.error(error)
                  return res.status(500).json({ error })
                })
            }
          )
        })
        .catch(function (error) {
          console.log(error)
          return res.status(500).json({ error })
        })
    } else {
      return res.status(403).json({ error: 'Unzulässiger Token', err })
    }
  })
})

// User Handler
app.use('/api/private', (req, res, next) => {
  const token = req.headers.authorization
  jwt.verify(token, jwtSecret, async (err, decoded) => {
    if (!err) {
      req.jwt = decoded
      if (!decoded.id) console.log('decodedJWT', decoded)
      if (decoded.id)
        await db('account')
          .where('id', decoded.id)
          .update({ lastActivity: Date.now() })
      next()
    } else {
      return res.status(403).json({ error: 'Unzulässiger Token' })
    }
  })
})

// Admin Handler
app.use('/api/admin', (req, res, next) => {
  const token = req.headers.authorization
  jwt.verify(token, jwtSecret, function (err, decoded) {
    if (!err) {
      try {
        if (!decoded.roles.includes('admin'))
          return res.status(403).json({ error: 'Fehlende Rechte' })
        req.jwt = decoded
        next()
      } catch (error) {
        return res.status(400).json({ text: 'Malformed JWT payload', error })
      }
    } else {
      return res.status(403).json({ error: 'Unzulässiger Token' })
    }
  })
})

// API Test Routes
app.get('/api/private/test', (req, res) => {
  res.status(200).json({ success: 'Gültigker Token' })
})

app.get('/api/public/test', (req, res) => {
  res.status(200).json({ success: 'API operational' })
})

app.get('/api/admin/test', (req, res) => {
  res.status(200).json({ success: 'Gültige Adminrechte' })
})

// Services
require('./services/backup')(app, db)

// Other routes
require('./routes/poolparty')(app, db)

// Launch our app on port 3000
app.listen('3000', () => console.log('Server listening on port 3000'))
