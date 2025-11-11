// src/routes/email.js
import express from "express";
import { sendMail } from "../controllers/emailcontroller.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { to, subject, text } = req.body;
  try {
    await sendMail(to, subject, text);
    res.json({ success: true });
  } catch (err) {
    console.error("Email send error:", err);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

export default router;
