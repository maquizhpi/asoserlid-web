import "server-only";

import bcrypt from "bcryptjs";
import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "crypto";
const keyLength = 64;
const scryptParams = {
  N: 16384,
  r: 8,
  p: 1,
};

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = await scryptAsync(password, salt, keyLength, scryptParams);
  return [
    "scrypt",
    scryptParams.N,
    scryptParams.r,
    scryptParams.p,
    salt,
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password: string, storedHash: string) {
  if (!storedHash) return { valid: false, needsRehash: false };

  if (storedHash.startsWith("scrypt$")) {
    return { valid: await verifyScryptPassword(password, storedHash), needsRehash: false };
  }

  if (storedHash.startsWith("$2a$") || storedHash.startsWith("$2b$") || storedHash.startsWith("$2y$")) {
    return { valid: await bcrypt.compare(password, storedHash), needsRehash: true };
  }

  return { valid: false, needsRehash: false };
}

async function verifyScryptPassword(password: string, storedHash: string) {
  const [algorithm, n, r, p, salt, hash] = storedHash.split("$");
  if (algorithm !== "scrypt" || !n || !r || !p || !salt || !hash) return false;

  const expected = Buffer.from(hash, "base64url");
  const actual = await scryptAsync(password, salt, expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function scryptAsync(password: string, salt: string, length: number, options: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, length, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}
