import mongoose from "mongoose";
const userschema=new mongoose.Schema({

 firstname:{type:String,required:true},
 lastname:{type:String,required:true},
 email:{type:String,required:true,unique:true},
passwordhash:{type:String,required:true},
mfaEnabled: { type: Boolean, default: false },     // MFA enabled
  mfaType: { type: String, enum: ["TOTP", "OTP"], default: "OTP" },
role: {
    type: String,
    enum: ["SUPER_ADMIN", "SITE_ADMIN", "OPERATOR", "CLIENT_ADMIN", "CLIENT_USER"],
    required: true
  },
  otpHash: { type: String },           // hashed OTP
  otpExpiresAt: { type: Date },
  // For non-production/dev testing only. Do NOT enable in production.
  otpPlaintext: { type: String },
  totpSecretEncrypted: { type: String },
  refreshToken: { type: String },                    // JWT refresh token
  lastLogin: { type: Date },                         // Track last login
  isActive: { type: Boolean, default: true },        // Deactivate users if needed
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Who created the user
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }  // Who updated
}, { timestamps: true });
const User= mongoose.model("User",userschema);
export default User;





