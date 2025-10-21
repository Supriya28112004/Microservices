// src/utils/totp.js
import { authenticator } from "otplib";
import qrcode from "qrcode";
import { encrypt as sharedEncrypt, decrypt as sharedDecrypt } from "../../shared/utils/encryption.js";

// configuration (optional)
authenticator.options = { step: 30, window: 1 }; // 30s step, 1 window to allow slight clock drift

export function generateTotpSecret() {
  // returns plain secret and otpauth url
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri("user@example.com", "YourAppName", secret); // change label later
  return { secret, otpauth };
}

export async function generateTotpQRCode(otpauth) {
  // returns dataURL for QR image you can show to user in front-end
  return await qrcode.toDataURL(otpauth);
}

export function verifyTotp(token, secret) {
  // secret is the plain secret (if stored encrypted -> decrypt first)
  return authenticator.check(token, secret);
}

// helpers to store encrypted secret
export function encryptTotpSecret(secret) {
  return sharedEncrypt(secret);
}

export function decryptTotpSecret(encrypted) {
  return sharedDecrypt(encrypted);
}
