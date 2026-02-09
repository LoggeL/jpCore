const crypto = require('crypto')
const nodemailer = require('nodemailer')
const { hashPassword, verifyPassword } = require('../lib/crypto-utils')
const { signToken, signTokenNoExpiry, verifyToken } = require('../lib/jwt-utils')

module.exports = (app, db) => {
  // Register Route (admin only — middleware already applied)
  app.post('/api/admin/register', async (req, res) => {
    try {
      const { password, name, role } = req.body
      let { email } = req.body

      if (!email) return res.status(400).json({ error: 'Mail fehlt' })
      if (!password) return res.status(400).json({ error: 'Passwort fehlt' })
      if (!name) return res.status(400).json({ error: 'Name fehlt' })

      email = email.toLowerCase()
      const exists = await db('account').where('email', email).first()
      if (exists) return res.status(400).json({ error: 'Nutzer existiert bereits' })

      const { salt, hash } = await hashPassword(password)

      await db('account').insert({
        email,
        name,
        salt,
        hash,
        roles: role ? JSON.stringify([role]) : JSON.stringify([]),
        createdAt: Date.now(),
        lastActivity: Date.now(),
        verifiedMail: true,
      })

      return res.status(200).json({ success: 'Nutzer erstellt' })
    } catch (error) {
      console.error('Error in register:', error)
      return res.status(500).json({ error: error.message })
    }
  })

  // Delete Account Route
  app.delete('/api/admin/register/:id', async (req, res) => {
    try {
      const { id } = req.params
      if (!id) return res.status(400).json({ error: 'Account ID fehlt' })

      const deleted = await db('account').where('id', id).del()
      if (!deleted) return res.status(404).json({ error: 'Unbekannte Account ID' })

      return res.status(200).json({ success: 'Account gelöscht' })
    } catch (error) {
      console.error('Error deleting account:', error)
      return res.status(500).json({ error: error.message, text: 'Fehler beim löschen des Accounts' })
    }
  })

  // Login API Route
  app.post('/api/public/login', async (req, res) => {
    try {
      let { email, password } = req.body

      if (!email) return res.status(403).json({ error: 'Keine Email angegeben' })
      if (!password) return res.status(403).json({ error: 'Kein Passwort angegeben' })

      email = email.toLowerCase()
      const result = await db('account')
        .where('email', email)
        .select('salt', 'verifiedMail', 'hash', 'name', 'roles', 'id')
        .first()

      if (!result) return res.status(403).json({ error: 'Unbekannte E-Mail' })
      if (!result.verifiedMail) return res.status(403).json({ error: 'Email nicht verifiziert' })

      const valid = await verifyPassword(password, result.salt, result.hash)
      if (!valid) return res.status(403).json({ error: 'Falsches Passwort' })

      const token = signToken({
        id: result.id,
        email,
        roles: result.roles,
        name: result.name,
      })

      return res.status(200).json({ success: token })
    } catch (error) {
      console.error('Error in login:', error)
      return res.status(500).json({ error: error.message })
    }
  })

  // Verify mail (appears to be incomplete/WIP in original)
  app.get('/api/public/verifyMail', async (req, res) => {
    try {
      let token = req.query.token
      if (!token) return res.status(403).json({ error: 'Token fehlt' })
      token = Buffer.from(token, 'base64').toString('utf8')

      const decoded = await verifyToken(token)
      if (decoded.type === 'verifyMail' && decoded.userID) {
        // TODO: implement mail verification
        return res.status(200).json({ success: 'Mail verified' })
      }
      return res.status(403).json({ error: 'Unzulässiger Token' })
    } catch (err) {
      return res.status(403).json({ error: 'Unzulässiger Token' })
    }
  })

  // Send password reset
  app.post('/api/public/sendPasswordReset', async (req, res) => {
    try {
      const { email } = req.body
      if (!email) return res.status(403).json({ error: 'Keine Email angegeben' })

      const result = await db('account').where('email', email).first()
      if (!result) return res.status(403).json({ error: 'Unbekannte E-Mail' })
      if (!result.verifiedMail) return res.status(403).json({ error: 'Email nicht verifiziert' })

      const passwordResetToken = crypto.randomBytes(128).toString('base64')
      await db('account').where('id', result.id).update({ passwordResetToken })

      let token = signTokenNoExpiry({
        userID: result.id,
        type: 'resetPassword',
        email,
        passwordResetToken,
      })
      token = Buffer.from(token).toString('base64')

      const host = process.env.HOST || 'https://jpcore.logge.top'
      const url = `${host}/forgotPassword.html?token=${token}`

      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error('SMTP_* env vars not set, cannot send password reset email')
        return res.status(500).json({ error: 'Mail service not configured' })
      }
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      })

      await transporter.sendMail({
        from: '"JP Poolparty" <poolparty@jupeters.de>',
        to: email,
        subject: 'Passwort zurücksetzen',
        text: `Klicken Sie auf den folgenden Link um Ihr Passwort zurückzusetzen: ${url}`,
      })

      return res.status(200).json({ success: 'E-Mail wurde versendet' })
    } catch (error) {
      console.error('Error sending password reset:', error)
      return res.status(500).json({ error: error.message })
    }
  })

  // Reset password
  app.post('/api/public/resetPassword', async (req, res) => {
    try {
      const { token, password } = req.body
      if (!token) return res.status(403).json({ error: 'Token fehlt' })
      if (!password) return res.status(403).json({ error: 'Passwort fehlt' })

      const decoded = await verifyToken(token)
      const { userID, email, type, passwordResetToken } = decoded

      const result = await db('account').where('id', userID).first()
      if (!result) return res.status(403).json({ error: 'Unbekannte E-Mail' })
      if (email !== result.email) return res.status(403).json({ error: 'Falsche E-Mail' })
      if (!result.verifiedMail) return res.status(403).json({ error: 'Email nicht verifiziert' })
      if (type !== 'resetPassword') return res.status(403).json({ error: 'Falscher Token Typ' })
      if (passwordResetToken !== result.passwordResetToken) {
        return res.status(403).json({ error: 'Reset Token abgelaufen / schon verwendet' })
      }

      const { salt, hash } = await hashPassword(password)
      await db('account').where('id', userID).update({
        salt,
        hash,
        passwordResetToken: null,
      })

      return res.status(200).json({ success: 'Passwort wurde geändert' })
    } catch (err) {
      console.error('Error resetting password:', err)
      return res.status(403).json({ error: 'Unzulässiger Token', err: err.message })
    }
  })
}
