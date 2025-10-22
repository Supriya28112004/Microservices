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



import { jest } from '@jest/globals';

// Mock modules with factory functions
jest.unstable_mockModule('../../models/User.js', () => ({
  default: {
    findOne: jest.fn(),
    save: jest.fn(),
  },
}));

jest.unstable_mockModule('../../utils/hash.js', () => ({
  verifyPassword: jest.fn(),
  hashPassword: jest.fn(),
}));

jest.unstable_mockModule('jsonwebtoken', () => ({
  default: {
    sign: jest.fn(),
  },
  sign: jest.fn(),
}));

// Import modules after mocks
const jwt = await import('jsonwebtoken');
const { login } = await import('../../controllers/authcontroller.js');
const User = await import('../../models/User.js');
const hashUtils = await import('../../utils/hash.js');

describe('Login API without OTP', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: { email: 'user@example.com', password: 'password123' },
    };
    res = {
      status: jest.fn(() => res),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it('returns 401 if user not found', async () => {
    User.default.findOne.mockResolvedValue(null);

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
  });

  it('returns 401 if password invalid', async () => {
    User.default.findOne.mockResolvedValue({ passwordhash: 'hashedPwd' });
    hashUtils.verifyPassword.mockResolvedValue(false);

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
  });

  it('returns MFA required for TOTP', async () => {
    User.default.findOne.mockResolvedValue({
      passwordhash: 'hashedPwd',
      mfaEnabled: true,
      mfaType: 'TOTP',
      totpSecretEncrypted: 'secretEnc',
    });
    hashUtils.verifyPassword.mockResolvedValue(true);

    await login(req, res);

    expect(res.json).toHaveBeenCalledWith({ mfaRequired: true, method: 'TOTP' });
  });

  it('issues tokens and saves refresh token if no MFA', async () => {
    const userMock = {
      _id: 'userId',
      passwordhash: 'hashedPwd',
      role: 'user',
      mfaEnabled: false,
      save: jest.fn(),
    };
    User.default.findOne.mockResolvedValue(userMock);
    hashUtils.verifyPassword.mockResolvedValue(true);
    jwt.default.sign.mockImplementation((payload) => `token_${payload.userId}`);

    await login(req, res);

    expect(jwt.default.sign).toHaveBeenCalledTimes(2);
    expect(userMock.refreshToken).toMatch(/^token_/);
    expect(userMock.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      accessToken: expect.stringMatching(/^token_/),
      refreshToken: expect.stringMatching(/^token_/),
    });
  });

  it('handles unexpected errors with 500', async () => {
    User.default.findOne.mockRejectedValue(new Error('fail'));

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Login failed' });
  });
});
