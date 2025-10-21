// src/controllers/emailController.js
import EmailProviderAdapter from "../adapters/emailProviderAdapter.js";

export const sendEmail = async (to, subject, text) => {
  return await EmailProviderAdapter.sendEmail(to, subject, text);
};
