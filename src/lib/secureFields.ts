import "server-only";

import crypto from "crypto";

const PREFIX = "enc:v1:";

function getKey() {
  const secret =
    process.env.FIELD_ENCRYPTION_KEY ||
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.JWT_SECRET ||
    process.env.MONGODB_URI ||
    "sit-local-field-encryption-key";
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptField(value?: string) {
  const clean = String(value || "").trim();
  if (!clean || clean.startsWith(PREFIX)) return clean;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(clean, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptField(value?: string) {
  const clean = String(value || "").trim();
  if (!clean.startsWith(PREFIX)) return clean;

  try {
    const [ivValue, tagValue, encryptedValue] = clean.slice(PREFIX.length).split(".");
    if (!ivValue || !tagValue || !encryptedValue) return "";
    const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivValue, "base64url"));
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}
