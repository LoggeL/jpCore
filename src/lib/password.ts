import { pbkdf2 as pbkdf2Callback, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import * as argon2 from 'argon2';
import { config } from '../config.js';

const pbkdf2 = promisify(pbkdf2Callback);

export type PasswordAlgo = 'argon2id' | 'pbkdf2-100k' | 'pbkdf2-1k';

export interface StoredPassword {
  hash: string;
  algo: PasswordAlgo;
  salt: string | null;
}

export interface VerifyResult {
  valid: boolean;
  algoUsed: PasswordAlgo | null;
  needsRehash: boolean;
}

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 2 ** 16, // 64 MB
  timeCost: 3,
  parallelism: 4,
} as const;

/**
 * Hash a password with argon2id (the current default).
 * Returns a stored-password record with salt=null since argon2 embeds the salt in the hash string.
 */
export async function hashPassword(password: string): Promise<StoredPassword> {
  const hash = await argon2.hash(password, ARGON2_OPTIONS);
  return { hash, algo: 'argon2id', salt: null };
}

/**
 * Recompute a PBKDF2 hash with the given iterations and compare in constant time.
 * Preserves the exact encoding (base64) used by the legacy backend.
 */
async function verifyPbkdf2(
  password: string,
  salt: string,
  expectedHash: string,
  iterations: number
): Promise<boolean> {
  const key = await pbkdf2(password, salt, iterations, config.pbkdf2.hashBytes, config.pbkdf2.digest);
  const computed = Buffer.from(key.toString('base64'), 'base64');
  let expected: Buffer;
  try {
    expected = Buffer.from(expectedHash, 'base64');
  } catch {
    return false;
  }
  if (computed.length !== expected.length) return false;
  return timingSafeEqual(computed, expected);
}

/**
 * Verify a password against a stored record.
 *
 * - If algo === 'argon2id': delegates to argon2.verify.
 * - If algo === 'pbkdf2-100k': tries 100k iterations; on mismatch, falls back to 1k iterations
 *   (preserves the legacy fallback behavior from the old crypto-utils.js).
 * - If algo === 'pbkdf2-1k': tries only 1k iterations.
 *
 * `needsRehash` is true whenever a valid verification used anything other than argon2id, so the
 * caller can transparently upgrade the stored hash on successful login.
 */
export async function verifyPassword(password: string, stored: StoredPassword): Promise<VerifyResult> {
  if (stored.algo === 'argon2id') {
    try {
      const ok = await argon2.verify(stored.hash, password);
      return { valid: ok, algoUsed: ok ? 'argon2id' : null, needsRehash: false };
    } catch {
      return { valid: false, algoUsed: null, needsRehash: false };
    }
  }

  if (!stored.salt) {
    return { valid: false, algoUsed: null, needsRehash: false };
  }

  if (stored.algo === 'pbkdf2-100k') {
    if (await verifyPbkdf2(password, stored.salt, stored.hash, config.pbkdf2.iterations)) {
      return { valid: true, algoUsed: 'pbkdf2-100k', needsRehash: true };
    }
    if (await verifyPbkdf2(password, stored.salt, stored.hash, 1000)) {
      return { valid: true, algoUsed: 'pbkdf2-1k', needsRehash: true };
    }
    return { valid: false, algoUsed: null, needsRehash: false };
  }

  // algo === 'pbkdf2-1k'
  if (await verifyPbkdf2(password, stored.salt, stored.hash, 1000)) {
    return { valid: true, algoUsed: 'pbkdf2-1k', needsRehash: true };
  }
  return { valid: false, algoUsed: null, needsRehash: false };
}

/**
 * For tests only: deterministically reproduce a legacy hash given a password and salt.
 * This is how the old backend created hashes — used in unit tests to verify the fallback path.
 */
export async function legacyPbkdf2Hash(
  password: string,
  salt: string | undefined,
  iterations: number
): Promise<{ hash: string; salt: string }> {
  const resolvedSalt = salt ?? randomBytes(128).toString('base64');
  const key = await pbkdf2(password, resolvedSalt, iterations, config.pbkdf2.hashBytes, config.pbkdf2.digest);
  return { hash: key.toString('base64'), salt: resolvedSalt };
}
