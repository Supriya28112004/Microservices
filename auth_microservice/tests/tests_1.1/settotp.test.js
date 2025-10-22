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



import { setupTotp } from "../controllers/authcontroller.js";
import User from "../models/User.js";
import { authenticator } from "otplib";
import * as encryptUtils from "../utils/encrypt.js";

jest.mock("../models/User.js");
jest.mock("otplib");
jest.mock("../utils/encrypt.js");

describe("Setup TOTP API", () => {
  let req, res;

  beforeEach(() => {
    req = { user: { userId: "id" } };
    res = { status: jest.fn(() => res), json: jest.fn() };
    jest.clearAllMocks();
  });

  it("successfully sets up TOTP", async () => {
    const userMock = { save: jest.fn() };
    User.findById.mockResolvedValue(userMock);
    authenticator.generateSecret.mockReturnValue("secret");
    encryptUtils.encrypt.mockReturnValue("encryptedSecret");
    authenticator.keyuri.mockReturnValue("otpauth_uri");

    await setupTotp(req, res);

    expect(userMock.totpSecretEncrypted).toBe("encryptedSecret");
    expect(userMock.mfaEnabled).toBe(true);
    expect(userMock.mfaType).toBe("TOTP");
    expect(userMock.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ secret: "secret", otpauth: "otpauth_uri" });
  });

  it("returns 401 when user not found", async () => {
    User.findById.mockResolvedValue(null);

    await setupTotp(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
  });

  it("returns 500 on failure", async () => {
    User.findById.mockRejectedValue(new Error("fail"));

    await setupTotp(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "TOTP setup failed" });
  });
});
