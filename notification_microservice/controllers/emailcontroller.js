// src/controllers/emailController.js
import EmailProviderAdapter from "../adapters/emailadapter.js";

export const sendMail = async (to, subject, text) => {
  return await EmailProviderAdapter.sendEmail(to, subject, text);
};
