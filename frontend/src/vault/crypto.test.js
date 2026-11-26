import { describe, it, expect } from 'vitest';
import { VaultError, chunkAad, concatBytes, decryptChunk, deriveKey, encryptChunk, fromB64, gunzip, gzip, normalizePassphrase, randomBytes, randomHex, toB64 } from './crypto.js';

const SALT = new Uint8Array(16).fill(7);
const text = (s) => new TextEncoder().encode(s);

describe('passphrase handling', () => {
  it('ignores capital letters and stray spaces, so phone keyboards do not matter', () => {
    expect(normalizePassphrase('  Blue   Door  at DAWN ')).toBe('blue door at dawn');
    expect(normalizePassphrase(null)).toBe('');
  });
});

describe('encoding helpers', () => {
  it('round-trips base64 and makes random values', () => {
    const b = randomBytes(40);
    expect(Array.from(fromB64(toB64(b)))).toEqual(Array.from(b));
    expect(randomHex(8)).toMatch(/^[0-9a-f]{16}$/);
    expect(randomHex(8)).not.toBe(randomHex(8));
  });

  it('joins byte pieces', () => {
    expect(Array.from(concatBytes([new Uint8Array([1, 2]), new Uint8Array([3])]))).toEqual([1, 2, 3]);
  });

  it('compresses and restores', async () => {
    const big = text('hello hello hello '.repeat(50000));
    const z = await gzip(big);
    expect(z.length).toBeLessThan(big.length / 20);
    expect(await gunzip(z)).toEqual(big);
  });
});

describe('encryption', () => {
  it('encrypts and decrypts', async () => {
    const key = await deriveKey('the right phrase', SALT, 1000);
    const sealed = await encryptChunk(key, text('secret words'), 'a:0/1');
    expect(new TextDecoder().decode(sealed)).not.toContain('secret');
    expect(new TextDecoder().decode(await decryptChunk(key, sealed, 'a:0/1'))).toBe('secret words');
  });

  it('gives the same key for the same phrase, in any capitalisation', async () => {
    const a = await deriveKey('Right Phrase', SALT, 1000);
    const b = await deriveKey('right   phrase', SALT, 1000);
    expect(new TextDecoder().decode(await decryptChunk(b, await encryptChunk(a, text('x'), 'q'), 'q'))).toBe('x');
  });

  it('refuses the wrong phrase and a different salt', async () => {
    const key = await deriveKey('one', SALT, 1000);
    const sealed = await encryptChunk(key, text('x'), 'q');
    await expect(decryptChunk(await deriveKey('two', SALT, 1000), sealed, 'q')).rejects.toBeInstanceOf(VaultError);
    await expect(decryptChunk(await deriveKey('one', new Uint8Array(16).fill(8), 1000), sealed, 'q')).rejects.toBeInstanceOf(VaultError);
  });

  it('notices a changed byte, a wrong position, and a truncated file', async () => {
    const key = await deriveKey('one', SALT, 1000);
    const sealed = await encryptChunk(key, text('hello world'), chunkAad('f1', 0, 2));
    const flipped = sealed.slice();
    flipped[20] ^= 1;
    await expect(decryptChunk(key, flipped, chunkAad('f1', 0, 2))).rejects.toThrow();
    await expect(decryptChunk(key, sealed, chunkAad('f1', 1, 2))).rejects.toThrow(); // swapped into another slot
    await expect(decryptChunk(key, sealed, chunkAad('f2', 0, 2))).rejects.toThrow(); // moved to another file
    await expect(decryptChunk(key, sealed, chunkAad('f1', 0, 3))).rejects.toThrow(); // file claimed to have more parts
    await expect(decryptChunk(key, sealed.slice(0, 10), chunkAad('f1', 0, 2))).rejects.toThrow();
  });

  it('never repeats the same ciphertext for the same message', async () => {
    const key = await deriveKey('one', SALT, 1000);
    const a = await encryptChunk(key, text('same'), 'q');
    const b = await encryptChunk(key, text('same'), 'q');
    expect(toB64(a)).not.toBe(toB64(b));
  });

  it('rejects unreasonable key settings', async () => {
    await expect(deriveKey('x', SALT, 5)).rejects.toThrow();
    await expect(deriveKey('x', SALT, 99_999_999)).rejects.toThrow();
  });
});
