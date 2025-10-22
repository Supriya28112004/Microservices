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



import { verifyTotpCode } from "../controllers/authcontroller.js";
import User from "../models/User.js";
import { authenticator } from "otplib";
import * as encryptUtils from "../utils/encrypt.js";
import jwt from "jsonwebtoken";

jest.mock("../models/User.js");
jest.mock("otplib");
jest.mock("../utils/encrypt.js");
jest.mock("jsonwebtoken");

describe("Verify TOTP Code API", () => {
  let req, res;

  beforeEach(() => {
    req = { body: { email: "user@example.com", token: "token" } };
    res = { status: jest.fn(() => res), json: jest.fn() };
    jest.clearAllMocks();
  });

  it("returns 400 if user not found or TOTP not set up", async () => {
    User.findOne.mockResolvedValue(null);

    await verifyTotpCode(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "TOTP not set up" });
  });

  it("returns 400 for invalid TOTP code", async () => {
    User.findOne.mockResolvedValue({ totpSecretEncrypted: "encrypted" });
    encryptUtils.decrypt.mockReturnValue("secret");
    authenticator.check.mockReturnValue(false);

    await verifyTotpCode(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid TOTP code" });
  });

  it("verifies TOTP and issues tokens", async () => {
    const userMock = { _id: "id", role: "user", save: jest.fn() };
    User.findOne.mockResolvedValue(userMock);
    encryptUtils.decrypt.mockReturnValue("secret");
    authenticator.check.mockReturnValue(true);
    jwt.sign.mockImplementation((payload) => "token_" + payload.userId);

    await verifyTotpCode(req, res);

    expect(userMock.refreshToken).toBe("token_id");
    expect(userMock.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ accessToken: "token_id", refreshToken: "token_id" });
  });

  it("returns 500 on error", async () => {
    User.findOne.mockRejectedValue(new Error("fail"));

    await verifyTotpCode(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "TOTP verification failed" });
  });
});
