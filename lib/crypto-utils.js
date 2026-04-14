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
  if (crypto.timingSafeEqual(Buffer.from(hash, 'base64'), Buffer.from(expectedHash, 'base64'))) {
    return { valid: true, legacy: false }
  }
  // Fall back to legacy iteration count for accounts hashed before the migration
  const legacyKey = await pbkdf2(password, salt, 1000, cryptoSettings.hashBytes, cryptoSettings.digest)
  const legacyHash = legacyKey.toString('base64')
  if (crypto.timingSafeEqual(Buffer.from(legacyHash, 'base64'), Buffer.from(expectedHash, 'base64'))) {
    return { valid: true, legacy: true }
  }
  return { valid: false, legacy: false }
}

module.exports = { hashPassword, verifyPassword }
