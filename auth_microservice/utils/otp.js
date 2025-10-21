// src/utils/otp.js
import crypto from "crypto";
import argon2 from "argon2";

export function generateOTP(length = 6) {
  // generate a secure numeric OTP of `length` digits
  const max = 10 ** length;
  const num = crypto.randomInt(0, max).toString().padStart(length, "0");
  return num;
}

export async function hashOTP(otp) {
  // hash OTP with argon2 for temporary storage
  return await argon2.hash(otp, { type: argon2.argon2id });
}

export async function verifyOTPHash(hash, otp) {
  try {
    return await argon2.verify(hash, otp);
  } catch (err) {
    return false;
  }
}
