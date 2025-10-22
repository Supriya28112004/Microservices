// import { jest } from "@jest/globals";
// import { login } from "../controllers/authController.js";
// import User from "../models/User.js";
// import { verifyPassword } from "../utils/hash.js";
// import { generateOtp } from "../controllers/authController.js"; // optional helper if needed
// import jwt from "jsonwebtoken";
// import axios from "axios";

// jest.mock("../models/User.js");
// jest.mock("../utils/hash.js");
// jest.mock("jsonwebtoken");
// jest.mock("axios");

// describe("login", () => {
//   let req, res, user;

//   beforeEach(() => {
//     user = { 
//       _id: "123", email: "test@test.com", passwordhash: "hash", role: "user", 
//       mfaEnabled: false, save: jest.fn()
//     };
//     req = { body: { email: "test@test.com", password: "pass123" } };
//     res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
//     User.findOne.mockResolvedValue(user);
//     verifyPassword.mockResolvedValue(true);
//     jwt.sign.mockReturnValue("token123");
//   });

//   it("should login successfully without MFA", async () => {
//     await login(req, res);
//     expect(res.json).toHaveBeenCalledWith({ accessToken: "token123", refreshToken: "token123" });
//   });

//   it("should return 401 if user not found", async () => {
//     User.findOne.mockResolvedValue(null);
//     await login(req, res);
//     expect(res.status).toHaveBeenCalledWith(401);
//     expect(res.json).toHaveBeenCalledWith({ message: "Invalid credentials" });
//   });

//   it("should return 401 if password invalid", async () => {
//     verifyPassword.mockResolvedValue(false);
//     await login(req, res);
//     expect(res.status).toHaveBeenCalledWith(401);
//     expect(res.json).toHaveBeenCalledWith({ message: "Invalid credentials" });
//   });

//   it("should trigger OTP if MFA type OTP", async () => {
//     user.mfaEnabled = true;
//     user.mfaType = "OTP";
//     axios.post.mockResolvedValue({});
//     await login(req, res);
//     expect(res.json).toHaveBeenCalledWith({ mfaRequired: true, method: "OTP" });
//   });

//   it("should trigger TOTP if MFA type TOTP", async () => {
//     user.mfaEnabled = true;
//     user.mfaType = "TOTP";
//     user.totpSecretEncrypted = "secret";
//     await login(req, res);
//     expect(res.json).toHaveBeenCalledWith({ mfaRequired: true, method: "TOTP" });
//   });

//   it("should handle errors", async () => {
//     User.findOne.mockRejectedValue(new Error("fail"));
//     await login(req, res);
//     expect(res.status).toHaveBeenCalledWith(500);
//     expect(res.json).toHaveBeenCalledWith({ message: "Login failed" });
//   });
// });



import { login } from "../controllers/authcontroller.js";
import User from "../models/User.js";
import * as hashUtils from "../utils/hash.js";
import axios from "axios";
import jwt from "jsonwebtoken";

jest.mock("../models/User.js");
jest.mock("../utils/hash.js");
jest.mock("axios");
jest.mock("jsonwebtoken");

describe("Login API", () => {
  let req, res;

  beforeEach(() => {
    req = { body: { email: "user@example.com", password: "pass" } };
    res = { status: jest.fn(() => res), json: jest.fn() };
    jest.clearAllMocks();
  });

  it("returns 401 if user does not exist", async () => {
    User.findOne.mockResolvedValue(null);

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid credentials" });
  });

  it("returns 401 if password is invalid", async () => {
    User.findOne.mockResolvedValue({ passwordhash: "hash" });
    hashUtils.verifyPassword.mockResolvedValue(false);

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid credentials" });
  });

  it("returns MFA TOTP required if user has TOTP MFA", async () => {
    User.findOne.mockResolvedValue({
      passwordhash: "hash",
      mfaEnabled: true,
      mfaType: "TOTP",
      totpSecretEncrypted: "encryptedSecret",
    });
    hashUtils.verifyPassword.mockResolvedValue(true);

    await login(req, res);

    expect(res.json).toHaveBeenCalledWith({ mfaRequired: true, method: "TOTP" });
  });

  // it("returns MFA OTP required, hashes OTP, saves user and sends notification", async () => {
  //   const userMock = {
  //     passwordhash: "hash",
  //     mfaEnabled: true,
  //     mfaType: "OTP",
  //     save: jest.fn(),
  //     email: "user@example.com",
  //   };
  //   User.findOne.mockResolvedValue(userMock);
  //   hashUtils.verifyPassword.mockResolvedValue(true);
  //   hashUtils.hashPassword.mockResolvedValue("otpHash");
  //   axios.post.mockResolvedValue({});

  //   await login(req, res);

  //   expect(userMock.otpHash).toBe("otpHash");
  //   expect(userMock.otpExpiresAt).toBeInstanceOf(Date);
  //   expect(userMock.save).toHaveBeenCalled();
  //   expect(axios.post).toHaveBeenCalledWith(
  //     expect.stringContaining("/notify/email"),
  //     expect.objectContaining({
  //       to: userMock.email,
  //       subject: "Your Login OTP",
  //     })
  //   );
  //   expect(res.json).toHaveBeenCalledWith({ mfaRequired: true, method: "OTP" });
  // });

  it("returns tokens and saves refresh token if no MFA", async () => {
    const userMock = {
      _id: "id",
      passwordhash: "hash",
      role: "user",
      mfaEnabled: false,
      save: jest.fn(),
    };
    User.findOne.mockResolvedValue(userMock);
    hashUtils.verifyPassword.mockResolvedValue(true);
    jwt.sign.mockImplementation((payload) => "token_" + payload.userId);

    await login(req, res);

    expect(jwt.sign).toHaveBeenCalledTimes(2);
    expect(userMock.refreshToken).toBe("token_id");
    expect(userMock.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ accessToken: "token_id", refreshToken: "token_id" });
  });

  it("returns 500 on internal error", async () => {
    User.findOne.mockRejectedValue(new Error("fail"));

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Login failed" });
  });
});
