const { verifyToken } = require('../lib/jwt-utils')

function privateAuth(db) {
  return async (req, res, next) => {
    const token = req.headers.authorization
    if (!token) return res.status(403).json({ error: 'Unzulässiger Token' })

    try {
      const decoded = await verifyToken(token)
      req.jwt = decoded
      if (decoded.id) {
        await db('account')
          .where('id', decoded.id)
          .update({ lastActivity: Date.now() })
      }
      next()
    } catch (err) {
      return res.status(403).json({ error: 'Unzulässiger Token' })
    }
  }
}

function adminAuth() {
  return async (req, res, next) => {
    const token = req.headers.authorization
    if (!token) return res.status(403).json({ error: 'Unzulässiger Token' })

    try {
      const decoded = await verifyToken(token)
      if (!decoded.roles || !decoded.roles.includes('admin')) {
        return res.status(403).json({ error: 'Fehlende Rechte' })
      }
      req.jwt = decoded
      next()
    } catch (err) {
      return res.status(403).json({ error: 'Unzulässiger Token' })
    }
  }
}

module.exports = { privateAuth, adminAuth }
