// microservices/shared/utils/encryption.js
import crypto from "crypto";

const ENC_KEY = process.env.DB_ENC_KEY || "12345678901234567890123456789012"; // must be 32 chars in prod
const ALGO = "aes-256-cbc";

export function encrypt(text) {
  if (!text) return text;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, Buffer.from(ENC_KEY), iv);
  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");
  return `${iv.toString("base64")}:${encrypted}`;
}

export function decrypt(data) {
  if (!data) return data;
  const [iv, encrypted] = data.split(":");
  const decipher = crypto.createDecipheriv(ALGO, Buffer.from(ENC_KEY), Buffer.from(iv, "base64"));
  let decrypted = decipher.update(encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
