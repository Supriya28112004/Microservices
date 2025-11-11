

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
import mongoose from "mongoose";


// Helper to generate numeric OTP
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// Generate/Send OTP explicitly (separate API)
export const generateOtpCode = async (req, res) => {
  const { email } = req.body;
  try {
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "User not found" });
    if (!user.mfaEnabled || user.mfaType !== "OTP") {
      return res.status(400).json({ message: "OTP MFA is not enabled for this user" });
    }

    const otp = generateOtp();
    user.otpHash = await hashPassword(otp);
    user.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    // Store plaintext OTP for non-production debugging only
    if (process.env.NODE_ENV !== "production" || process.env.ALLOW_PLAINTEXT_OTP === "true") {
      user.otpPlaintext = otp;
    }
    await user.save();

    // Try to notify via Notification service, but don't fail the request if it errors
    try {
      if (process.env.NOTIFY_URL) {
        await axios.post(`${process.env.NOTIFY_URL}/notify/email`, { 
          to: user.email, 
          subject: "Your Login OTP", 
          text: `Your OTP is ${otp}. It expires in 5 minutes.` 
        });
      } else {
        console.warn("NOTIFY_URL not configured - OTP notification skipped");
      }
    } catch (notificationError) {
      console.error("Failed to send OTP notification:", notificationError.message);
    }

    return res.json({ message: "OTP generated and sent" });
  } catch (err) {
    console.error("Generate OTP error:", err);
    return res.status(500).json({ message: "Failed to generate OTP" });
  }
};

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
        if (process.env.NODE_ENV !== "production" || process.env.ALLOW_PLAINTEXT_OTP === "true") {
          user.otpPlaintext = otp;
        }
        await user.save();

        // Send OTP via Notification service (non-blocking - don't fail login if notification fails)
        try {
          if (process.env.NOTIFY_URL) {
            await axios.post(`${process.env.NOTIFY_URL}/notify/email`, { 
              to: user.email, 
              subject: "Your Login OTP", 
              text: `Your OTP is ${otp}. It expires in 5 minutes.` 
            });
          } else {
            console.warn("NOTIFY_URL not configured - OTP notification skipped");
          }
        } catch (notificationError) {
          // Log error but don't fail the login - OTP is already saved in database
          console.error("Failed to send OTP notification:", notificationError.message);
        }

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

//method setup//


// Switch MFA Method (OTP <-> TOTP)
// export const setMfaMethod = async (req, res) => {
//   const { email, method } = req.body; // "OTP" or "TOTP"

//   if (!["OTP", "TOTP"].includes(method)) {
//     return res.status(400).json({ message: "Invalid MFA method" });
//   }

//   try {
//     const user = await User.findOne({ email });
//     if (!user) return res.status(404).json({ message: "User not found" });

//     user.mfaEnabled = true;
//     user.mfaType = method;

//     // If switching to OTP, remove TOTP secret
//     if (method === "OTP") {
//       user.totpSecretEncrypted = null;
//     }

//     await user.save();
//     return res.json({ message: `MFA method updated to ${method}` });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Failed to update MFA method" });
//   }
// };
export const setMfaMethod = async (req, res) => {
  const { email, method } = req.body; // "OTP" or "TOTP"

  if (!["OTP", "TOTP"].includes(method)) {
    return res.status(400).json({ message: "Invalid MFA method" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.mfaEnabled = true;
    user.mfaType = method;

    if (method === "OTP") {
      user.totpSecretEncrypted = null;
    }

    await user.save();
    return res.json({ message: `MFA method updated to ${method}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update MFA method" });
  }
};








// Verify OTP
export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  try {
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "User not found" });
    
    if (!user.otpHash || !user.otpExpiresAt) {
      return res.status(400).json({ message: "No OTP generated" });
    }
    
    // Convert to Date object if it's not already
    const expiryDate = user.otpExpiresAt instanceof Date 
      ? user.otpExpiresAt 
      : new Date(user.otpExpiresAt);
    
    if (expiryDate < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }
    
    // Convert OTP to string to ensure proper comparison
    const otpString = String(otp);
    
    // Verify OTP with error handling
    let validOtp = false;
    try {
      validOtp = await verifyPassword(user.otpHash, otpString);
    } catch (verifyError) {
      console.error("Error verifying OTP hash:", verifyError);
      return res.status(400).json({ message: "Invalid OTP format" });
    }
    
    if (!validOtp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // OTP verified, issue tokens
    const accessToken = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign({ userId: user._id }, process.env.REFRESH_SECRET, { expiresIn: "7d" });

    user.refreshToken = refreshToken;
    user.otpHash = null; // clear OTP
    user.otpExpiresAt = null;
    if (user.otpPlaintext) {
      user.otpPlaintext = null;
    }
    await user.save();

    res.json({ accessToken, refreshToken });
  } catch (err) {
    console.error("OTP verification error:", err);
    // Don't expose internal error details to client
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
      type: "INVITE_CREATED",
      inviteId: invite._id.toString(),
      email,
      role,
      message: message || "Please accept your invite.",
      subject: "You're Invited",
      invitedByRole: currentUserRole,
      createdAt: new Date().toISOString(),
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

export const acceptInvite = async (req, res) => {
  const { token } = req.body;

  try {
    if (!token) {
      return res.status(400).json({ message: "Invite token is required" });
    }

    const invite = await Invite.findOne({ invitetoken: token });
    if (!invite) {
      return res.status(404).json({ message: "Invite not found" });
    }

    if (invite.status === "accepted") {
      return res.json({ message: "Invite already accepted" });
    }

    if (invite.tokenexpiresat < new Date()) {
      invite.status = "expired";
      await invite.save();
      return res.status(400).json({ message: "Invite has expired" });
    }

    invite.status = "accepted";
    invite.acceptedAt = new Date();
    await invite.save();

    const plainEmail = decrypt(invite.email);

    try {
      const connection = await amqp.connect(process.env.RABBITMQ_URL || "amqp://localhost");
      const channel = await connection.createChannel();
      const queue = process.env.QUEUE_NAME || "email_invites";
      await channel.assertQueue(queue, { durable: true });

      const payload = {
        type: "INVITE_ACCEPTED",
        inviteId: invite._id.toString(),
        email: plainEmail,
        role: invite.role,
        subject: "Invite Accepted",
        message: "The invite has been accepted.",
        acceptedAt: invite.acceptedAt.toISOString(),
      };

      channel.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), {
        persistent: true,
      });

      await channel.close();
      await connection.close();
    } catch (notificationError) {
      console.error("[Invite Acceptance Notification Error]", notificationError);
    }

    return res.json({ message: "Invite accepted successfully" });
  } catch (err) {
    console.error("[Invite Acceptance Error]", err);
    return res.status(500).json({ message: "Failed to accept invite" });
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







