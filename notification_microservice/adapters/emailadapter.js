import nodemailer from "nodemailer";

class EmailProviderAdapter {
  constructor(config) {
    this.transporter = nodemailer.createTransport(config);
  }

  async sendEmail(to, subject, text) {
    try {
      return await this.transporter.sendMail({ from: process.env.SMTP_USER, to, subject, text });
    } catch (err) {
      console.error("Email sending failed:", err.message);
      throw new Error("Email sending failed");
    }
  }
}

// Example config for SMTP
const smtpConfig = {
  service: "Gmail",
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
};

export default new EmailProviderAdapter(smtpConfig);
