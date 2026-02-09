const jwt = require('jsonwebtoken')
const { promisify } = require('util')

const jwtSecret = process.env.JWT_SECRET
if (!jwtSecret) {
  console.error('FATAL: JWT_SECRET environment variable is required')
  process.exit(1)
}
const jwtExpiry = process.env.JWT_EXPIRY || '7d'

function signToken(payload) {
  return jwt.sign(payload, jwtSecret, {
    algorithm: 'HS256',
    expiresIn: jwtExpiry,
  })
}

function verifyToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, jwtSecret, { algorithms: ['HS256'] }, (err, decoded) => {
      if (err) return reject(err)
      resolve(decoded)
    })
  })
}

// Sign without expiry for specific use cases (e.g., password reset has its own flow)
function signTokenNoExpiry(payload) {
  return jwt.sign(payload, jwtSecret, { algorithm: 'HS256' })
}

module.exports = { signToken, signTokenNoExpiry, verifyToken, jwtSecret }
