// import { jest } from "@jest/globals";
// import { setupTotp } from "../controllers/authcontroller.js";
// import User from "../models/User.js";
// import { encrypt } from "../utils/encrypt.js";
// import { authenticator } from "otplib";

// jest.mock("../models/User.js");
// jest.mock("../utils/encrypt.js");
// jest.mock("otplib");

// describe("setupTotp", () => {
//   let req, res, user;

//   beforeEach(() => {
//     user = { _id: "123", email: "test@test.com", save: jest.fn() };
//     req = { user: { userId: "123" } };
//     res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
//     User.findById = jest.fn().mockResolvedValue(user);
//     authenticator.generateSecret = jest.fn().mockReturnValue("secret123");
//     authenticator.keyuri = jest.fn().mockReturnValue("otpauth://uri");
//     encrypt.mockReturnValue("encryptedSecret");
//   });

//   it("should setup TOTP successfully", async () => {
//     await setupTotp(req, res);
//     expect(user.totpSecretEncrypted).toBe("encryptedSecret");
//     expect(user.mfaEnabled).toBe(true);
//     expect(user.mfaType).toBe("TOTP");
//     expect(res.json).toHaveBeenCalledWith({ secret: "secret123", otpauth: "otpauth://uri" });
//   });

//   it("should return 401 if user not found", async () => {
//     User.findById.mockResolvedValue(null);
//     await setupTotp(req, res);
//     expect(res.status).toHaveBeenCalledWith(401);
//     expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
//   });

//   it("should handle errors", async () => {
//     User.findById.mockRejectedValue(new Error("fail"));
//     await setupTotp(req, res);
//     expect(res.status).toHaveBeenCalledWith(500);
//     expect(res.json).toHaveBeenCalledWith({ message: "TOTP setup failed" });
//   });
// });



import { jest } from '@jest/globals';

// Mock modules before imports
jest.unstable_mockModule('../../models/User.js', () => ({
  default: {
    findById: jest.fn(),
  },
}));

jest.unstable_mockModule('../../utils/encrypt.js', () => ({
  encrypt: jest.fn(),
  decrypt: jest.fn(),
}));

// Mock otplib authenticator
jest.unstable_mockModule('otplib', () => ({
  authenticator: {
    generateSecret: jest.fn(),
    keyuri: jest.fn(),
  },
}));

// Import modules after mocks
const User = await import('../../models/User.js');
const encryptUtils = await import('../../utils/encrypt.js');
const { authenticator } = await import('otplib');
const { setupTotp } = await import('../../controllers/authcontroller.js');

describe('Setup TOTP API', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { userId: 'userId' },
    };
    res = {
      status: jest.fn(() => res),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it('successfully sets up TOTP', async () => {
    const fakeSecret = 'SECRET123';
    const fakeEncryptedSecret = 'ENCRYPTED_SECRET';
    const fakeOtpAuth = 'otpauth://totp/Service:user@example.com?secret=SECRET123';

    const userMock = {
      email: 'user@example.com',
      save: jest.fn(),
    };
    User.default.findById.mockResolvedValue(userMock);

    authenticator.generateSecret.mockReturnValue(fakeSecret);
    encryptUtils.encrypt.mockReturnValue(fakeEncryptedSecret);
    authenticator.keyuri.mockReturnValue(fakeOtpAuth);

    await setupTotp(req, res);

    expect(User.default.findById).toHaveBeenCalledWith('userId');
    expect(authenticator.generateSecret).toHaveBeenCalled();
    expect(encryptUtils.encrypt).toHaveBeenCalledWith(fakeSecret);
    expect(authenticator.keyuri).toHaveBeenCalledWith('user@example.com', 'AuthService', fakeSecret);
    expect(userMock.totpSecretEncrypted).toBe(fakeEncryptedSecret);
    expect(userMock.mfaEnabled).toBe(true);
    expect(userMock.mfaType).toBe('TOTP');
    expect(userMock.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ secret: fakeSecret, otpauth: fakeOtpAuth });
  });

  it('returns 401 if user not found', async () => {
    User.default.findById.mockResolvedValue(null);

    await setupTotp(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
  });

  it('returns 500 on internal error', async () => {
    User.default.findById.mockRejectedValue(new Error('fail'));

    await setupTotp(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'TOTP setup failed' });
  });
});
