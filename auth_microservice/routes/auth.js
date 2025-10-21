import express from "express";
import { signup, login, sendInvite, refreshAccessToken,verifyOtp,setupTotp,verifyTotpCode, logout } from "../controllers/authcontroller.js";
import { verifyToken } from "../middlewares/auth.js";
import { validateRequest } from "../middlewares/validate.js";
import {checkRolePermission} from "../middlewares/permission.js"
import { signupSchema, loginSchema, inviteSchema } from "../utils/validator.js";

const router = express.Router();

router.post("/signup", validateRequest(signupSchema), signup);
router.post("/login", validateRequest(loginSchema), login);
router.post("/mfa/verify-otp", verifyOtp);          // body: { email, otp }
router.post("/mfa/verify-totp", verifyTotpCode); 
router.post("/mfa/setup-totp", verifyToken, setupTotp);
router.post(
  "/invite",
  verifyToken,
  checkRolePermission(["SUPER_ADMIN", "SITE_ADMIN", "OPERATOR", "CLIENT_ADMIN"]),
  validateRequest(inviteSchema),
  sendInvite
);

router.post("/refresh-token", refreshAccessToken);
router.post("/logout", logout);


export default router;
