// import { jest } from "@jest/globals";
// import { verifyTotpCode } from "../../controllers/authcontroller.js";
// import User from "../models/User.js";
// import { decrypt } from "../utils/encrypt.js";
// import { authenticator } from "otplib";
// import jwt from "jsonwebtoken";

// jest.mock("../models/User.js");
// jest.mock("../utils/encrypt.js");
// jest.mock("otplib");
// jest.mock("jsonwebtoken");

// describe("verifyTotpCode", () => {
//   let req, res, user;

//   beforeEach(() => {
//     user = { _id: "123", email: "test@test.com", role: "user", totpSecretEncrypted: "encrypted", save: jest.fn() };
//     req = { body: { email: "test@test.com", token: "123456" } };
//     res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
//     User.findOne.mockResolvedValue(user);
//     decrypt.mockReturnValue("secret123");
//     authenticator.check = jest.fn().mockReturnValue(true);
//     jwt.sign.mockReturnValue("token123");
//   });

//   it("should verify TOTP successfully", async () => {
//     await verifyTotpCode(req, res);
//     expect(res.json).toHaveBeenCalledWith({ accessToken: "token123", refreshToken: "token123" });
//   });

//   it("should return 400 if TOTP not set up", async () => {
//     user.totpSecretEncrypted = null;
//     await verifyTotpCode(req, res);
//     expect(res.status).toHaveBeenCalledWith(400);
//     expect(res.json).toHaveBeenCalledWith({ message: "TOTP not set up" });
//   });

//   it("should return 400 if TOTP invalid", async () => {
//     authenticator.check.mockReturnValue(false);
//     await verifyTotpCode(req, res);
//     expect(res.status).toHaveBeenCalledWith(400);
//     expect(res.json).toHaveBeenCalledWith({ message: "Invalid TOTP code" });
//   });

//   it("should handle errors", async () => {
//     User.findOne.mockRejectedValue(new Error("fail"));
//     await verifyTotpCode(req, res);
//     expect(res.status).toHaveBeenCalledWith(500);
//     expect(res.json).toHaveBeenCalledWith({ message: "TOTP verification failed" });
//   });
// });



import { jest } from '@jest/globals';

// Mock modules before imports
jest.unstable_mockModule('../../models/User.js', () => ({
  default: {
    findOne: jest.fn(),
    findById: jest.fn(),
  },
}));

jest.unstable_mockModule('../../utils/encrypt.js', () => ({
  decrypt: jest.fn(),
  encrypt: jest.fn(),
}));

jest.unstable_mockModule('otplib', () => ({
  authenticator: {
    check: jest.fn(),
  },
}));

jest.unstable_mockModule('jsonwebtoken', () => ({
  default: {
    sign: jest.fn(),
  },
  sign: jest.fn(),
}));

// Import modules after mocks
const User = await import('../../models/User.js');
const encryptUtils = await import('../../utils/encrypt.js');
const { authenticator } = await import('otplib');
const jwt = await import('jsonwebtoken');
const { verifyTotpCode } = await import('../../controllers/authcontroller.js');

describe('Verify TOTP API', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: { email: 'test@example.com', token: '123456' },
    };
    res = {
      status: jest.fn(() => res),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it('verifies successfully with valid token', async () => {
    const userMock = {
      _id: 'userId',
      totpSecretEncrypted: 'encryptedSecret',
      save: jest.fn(),
    };
    User.default.findOne.mockResolvedValue(userMock);

    encryptUtils.decrypt.mockReturnValue('decryptedSecret');
    authenticator.check.mockReturnValue(true);
    jwt.default.sign.mockReturnValue('token123');

    await verifyTotpCode(req, res);

    expect(User.default.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    expect(encryptUtils.decrypt).toHaveBeenCalledWith('encryptedSecret');
    expect(authenticator.check).toHaveBeenCalledWith('123456', 'decryptedSecret');
    expect(res.json).toHaveBeenCalledWith({ accessToken: 'token123', refreshToken: 'token123' });
  });

  it('fails verification with invalid token', async () => {
    const userMock = {
      totpSecretEncrypted: 'encryptedSecret',
    };
    User.default.findOne.mockResolvedValue(userMock);

    encryptUtils.decrypt.mockReturnValue('decryptedSecret');
    authenticator.check.mockReturnValue(false);

    await verifyTotpCode(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid TOTP code' });
  });

  it('returns 400 if TOTP not set up', async () => {
    User.default.findOne.mockResolvedValue({ totpSecretEncrypted: null });

    await verifyTotpCode(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'TOTP not set up' });
  });

  it('returns 500 on internal error', async () => {
    User.default.findOne.mockRejectedValue(new Error('fail'));

    await verifyTotpCode(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'TOTP verification failed' });
  });
});
