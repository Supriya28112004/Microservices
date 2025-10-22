import { jest } from "@jest/globals";
import { logout } from "../controllers/authcontroller.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

jest.mock("../models/User.js");
jest.mock("jsonwebtoken");

describe("logout", () => {
  let req, res, user;

  beforeEach(() => {
    user = { _id: "123", refreshToken: "refresh123", save: jest.fn() };
    req = { body: { refreshToken: "refresh123" } };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    User.findById.mockResolvedValue(user);
    jwt.verify.mockReturnValue({ userId: "123" });
  });

  it("should logout successfully", async () => {
    await logout(req, res);
    expect(user.refreshToken).toBeNull();
    expect(res.json).toHaveBeenCalledWith({ message: "Logged out successfully" });
  });

  it("should return 400 if no refresh token provided", async () => {
    req.body.refreshToken = null;
    await logout(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "No refresh token provided" });
  });

  it("should handle errors", async () => {
    User.findById.mockRejectedValue(new Error("fail"));
    await logout(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Logout failed" });
  });
});
