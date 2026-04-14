import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, legacyPbkdf2Hash } from '../src/lib/password.js';

describe('password', () => {
  it('argon2id round-trip', async () => {
    const stored = await hashPassword('correct horse battery staple');
    expect(stored.algo).toBe('argon2id');
    expect(stored.salt).toBeNull();
    expect(stored.hash).toMatch(/^\$argon2id\$/);

    const ok = await verifyPassword('correct horse battery staple', stored);
    expect(ok.valid).toBe(true);
    expect(ok.algoUsed).toBe('argon2id');
    expect(ok.needsRehash).toBe(false);

    const bad = await verifyPassword('wrong', stored);
    expect(bad.valid).toBe(false);
    expect(bad.needsRehash).toBe(false);
  });

  it('PBKDF2-100k legacy verify succeeds and flags needsRehash', async () => {
    const legacy = await legacyPbkdf2Hash('poolparty2026', undefined, 100000);
    const ok = await verifyPassword('poolparty2026', {
      hash: legacy.hash,
      algo: 'pbkdf2-100k',
      salt: legacy.salt,
    });
    expect(ok.valid).toBe(true);
    expect(ok.algoUsed).toBe('pbkdf2-100k');
    expect(ok.needsRehash).toBe(true);
  });

  it('PBKDF2-1k legacy fallback kicks in for accounts stored as 100k', async () => {
    // Old backend stored algo-less records, migration imports them all as 'pbkdf2-100k'.
    // Some of those records are actually 1k-iteration hashes from a much older migration.
    const legacy = await legacyPbkdf2Hash('ancient', undefined, 1000);
    const ok = await verifyPassword('ancient', {
      hash: legacy.hash,
      algo: 'pbkdf2-100k',
      salt: legacy.salt,
    });
    expect(ok.valid).toBe(true);
    expect(ok.algoUsed).toBe('pbkdf2-1k');
    expect(ok.needsRehash).toBe(true);
  });

  it('wrong password against PBKDF2 record returns valid:false', async () => {
    const legacy = await legacyPbkdf2Hash('secret', undefined, 100000);
    const ok = await verifyPassword('not-the-password', {
      hash: legacy.hash,
      algo: 'pbkdf2-100k',
      salt: legacy.salt,
    });
    expect(ok.valid).toBe(false);
    expect(ok.algoUsed).toBeNull();
  });

  it('missing salt on PBKDF2 record returns valid:false (never throws)', async () => {
    const ok = await verifyPassword('anything', {
      hash: 'irrelevant',
      algo: 'pbkdf2-100k',
      salt: null,
    });
    expect(ok.valid).toBe(false);
  });
});
