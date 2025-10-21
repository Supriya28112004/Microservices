

import User from "../models/User.js";
import Invite from "../models/Invite.js";
import { hashPassword, verifyPassword } from "../utils/hash.js";
import { encrypt,decrypt } from "../utils/encrypt.js";
import jwt from "jsonwebtoken";
import axios from "axios";
import crypto from "crypto";
import { authenticator } from "otplib";
import { PERMISSIONS } from "../../shared/constants/roles.js";
import amqp from "amqplib";


// Helper to generate numeric OTP
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// Signup
export const signup = async (req, res) => {
  const { email, password, role ,firstname,lastname} = req.body;
  try {
    const hashed = await hashPassword(password);
    const newUser = await User.create({ email, passwordhash: hashed, role ,firstname,lastname});
    res.status(201).json({ message: "User registered", userId: newUser._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Signup failed" });
  }
};

// Login => supports OTP / TOTP
// Login => supports OTP / TOTP
export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const valid = await verifyPassword(user.passwordhash, password);
    if (!valid) return res.status(401).json({ message: "Invalid credentials" });

    // Check if Multi-Factor Authentication is enabled
    if (user.mfaEnabled) {
      // TOTP Flow
      if (user.mfaType === "TOTP" && user.totpSecretEncrypted) {
        // TOTP secret would be decrypted later for verification step
        return res.json({ mfaRequired: true, method: "TOTP" });
      }

      // OTP Flow
      if (user.mfaType === "OTP") {
        const otp = generateOtp();
        // Hash and store OTP + expiry in user document
        user.otpHash = await hashPassword(otp); // Store hashed OTP
        user.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        await user.save();

        // Send OTP via Notification service
        await axios.post(`${process.env.NOTIFY_URL}/notify/email`, { 
          to: user.email, 
          subject: "Your Login OTP", 
          text: `Your OTP is ${otp}. It expires in 5 minutes.` 
        });

        return res.json({ mfaRequired: true, method: "OTP" });
      }
    }

    // If no MFA required, issue tokens directly
    const accessToken = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign({ userId: user._id }, process.env.REFRESH_SECRET, { expiresIn: "7d" });

    user.refreshToken = refreshToken;
    await user.save();

    res.json({ accessToken, refreshToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed" });
  }
};


// Verify OTP
export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "User not found" });
    if (!user.otpHash || !user.otpExpiresAt) return res.status(400).json({ message: "No OTP generated" });
    if (user.otpExpiresAt < new Date()) return res.status(400).json({ message: "OTP expired" });
     const validOtp = await verifyPassword(user.otpHash, otp);
    if (!validOtp) return res.status(400).json({ message: "Invalid OTP" });


    // OTP verified, issue tokens
    const accessToken = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign({ userId: user._id }, process.env.REFRESH_SECRET, { expiresIn: "7d" });

    user.refreshToken = refreshToken;
    user.otpHash = null; // clear OTP
    user.otpExpiresAt = null;
    await user.save();

    res.json({ accessToken, refreshToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "OTP verification failed" });
  }
};

// Setup TOTP for authenticated user
export const setupTotp = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(401).json({ message: "User not found" });

    const secret = authenticator.generateSecret();
    user.totpSecretEncrypted = encrypt(secret);
    user.mfaEnabled=true;
    user.mfaType="TOTP";
    await user.save();

    const otpauth = authenticator.keyuri(user.email, "AuthService", secret);
    res.json({ secret, otpauth }); // frontend can show QR
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "TOTP setup failed" });
  }
};

// Verify TOTP code
export const verifyTotpCode = async (req, res) => {
  const { email, token } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !user.totpSecretEncrypted) 
      return res.status(400).json({ message: "TOTP not set up" });
    const secret = decrypt(user.totpSecretEncrypted);
    const isValid = authenticator.check(token, secret);
    if (!isValid) 
      return res.status(400).json({ message: "Invalid TOTP code" });

    // Issue tokens
    const accessToken = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign({ userId: user._id }, process.env.REFRESH_SECRET, { expiresIn: "7d" });

    user.refreshToken = refreshToken;
    await user.save();

    res.json({ accessToken, refreshToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "TOTP verification failed" });
  }
};

// Refresh Access Token
export const refreshAccessToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ message: "No refresh token provided" });

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== refreshToken)
      return res.status(403).json({ message: "Invalid refresh token" });

    // Generate new access token
    const accessToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.json({ accessToken });
  } catch (err) {
    console.error(err);
    res.status(403).json({ message: "Invalid refresh token" });
  }
};


// Send Invite
export const sendInvite = async (req, res) => {
  console.log("REQ.USER debug:", req.user);
  const { email, role, message } = req.body;
  const currentUserRole = req.user.role; 
  // Permission check
  if (
    !PERMISSIONS[currentUserRole] ||
    !PERMISSIONS[currentUserRole].includes(role)
  ) {
    console.log("CurrentUserRole:", currentUserRole, "TargetRole:", role);

    return res.status(403).json({ message: "You do not have permission to invite this role." });
  }
  const invitetoken = crypto.randomBytes(32).toString("hex");
  const existingUser = await User.findOne({ email }); // or some identifier
const inviteid = existingUser ? existingUser._id : new mongoose.Types.ObjectId();

 
const tokenexpiresat = new Date(Date.now() + 3600 * 1000);
  try {
    const encryptedEmail = encrypt(email);
    const invite = await Invite.create({ email: encryptedEmail, 
      role,
      inviteid: inviteid,
      invitetoken: invitetoken,
      tokenexpiresat: tokenexpiresat,
      
      message: message || "",
     });

    

// === RABBITMQ: Publish invite details to queue ===
    const connection = await amqp.connect(process.env.RABBITMQ_URL || "amqp://localhost");
    const channel = await connection.createChannel();
    const queue = process.env.QUEUE_NAME || "email_invites";

    await channel.assertQueue(queue, { durable: true });

    const emailPayload = {
      email,
      role,
      message: message || "Please accept your invite.",
      subject: "You're Invited",
    };

    channel.sendToQueue(queue, Buffer.from(JSON.stringify(emailPayload)), {
      persistent: true,
    });

    console.log("[Invite Published -> RabbitMQ] Email:", email);

    await channel.close();
    await connection.close();

    // Success response
    return res.json({ message: "Invite sent successfully", inviteId: invite._id });
  } catch (err) {
    console.error("[Invite Error]", err);
    return res.status(500).json({ message: "Invite failed", error: err.message });
  }
};

// Logout
export const logout = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: "No refresh token provided" });

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
    const user = await User.findById(decoded.userId);

    if (user) {
      user.refreshToken = null; // clear refresh token
      await user.save();
    }

    res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Logout failed" });
  }
};







