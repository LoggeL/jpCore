const crypto = require('crypto')
const { promisify } = require('util')

const pbkdf2 = promisify(crypto.pbkdf2)

const cryptoSettings = require('../crypto.json')

// Use env override for iterations (allow migrating to higher count)
const iterations = parseInt(process.env.CRYPTO_ITERATIONS, 10) || cryptoSettings.iterations

async function hashPassword(password, salt) {
  if (!salt) {
    salt = crypto.randomBytes(128).toString('base64')
  }
  const key = await pbkdf2(
    password,
    salt,
    iterations,
    cryptoSettings.hashBytes,
    cryptoSettings.digest
  )
  return { salt, hash: key.toString('base64') }
}

async function verifyPassword(password, salt, expectedHash) {
  const { hash } = await hashPassword(password, salt)
  return crypto.timingSafeEqual(
    Buffer.from(hash, 'base64'),
    Buffer.from(expectedHash, 'base64')
  )
}

module.exports = { hashPassword, verifyPassword }
