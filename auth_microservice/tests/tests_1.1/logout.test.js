// import { jest } from "@jest/globals";
// import { logout } from "../controllers/authcontroller.js";
// import User from "../models/User.js";
// import jwt from "jsonwebtoken";

// jest.mock("../models/User.js");
// jest.mock("jsonwebtoken");

// describe("logout", () => {
//   let req, res, user;

//   beforeEach(() => {
//     user = { _id: "123", refreshToken: "refresh123", save: jest.fn() };
//     req = { body: { refreshToken: "refresh123" } };
//     res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
//     User.findById.mockResolvedValue(user);
//     jwt.verify.mockReturnValue({ userId: "123" });
//   });

//   it("should logout successfully", async () => {
//     await logout(req, res);
//     expect(user.refreshToken).toBeNull();
//     expect(res.json).toHaveBeenCalledWith({ message: "Logged out successfully" });
//   });

//   it("should return 400 if no refresh token provided", async () => {
//     req.body.refreshToken = null;
//     await logout(req, res);
//     expect(res.status).toHaveBeenCalledWith(400);
//     expect(res.json).toHaveBeenCalledWith({ message: "No refresh token provided" });
//   });

//   it("should handle errors", async () => {
//     User.findById.mockRejectedValue(new Error("fail"));
//     await logout(req, res);
//     expect(res.status).toHaveBeenCalledWith(400);
//     expect(res.json).toHaveBeenCalledWith({ message: "Logout failed" });
//   });
// });



import { jest } from '@jest/globals';

// Mock User model before imports
jest.unstable_mockModule('../../models/User.js', () => ({
  default: {
    findById: jest.fn(),
  },
}));

jest.unstable_mockModule('jsonwebtoken', () => ({
  default: {
    verify: jest.fn(),
  },
  verify: jest.fn(),
}));

// Import mocked User model and logout controller after mocking
const User = await import('../../models/User.js');
const jwt = await import('jsonwebtoken');
const { logout } = await import('../../controllers/authcontroller.js');

describe('Logout API', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: { refreshToken: 'refreshToken123' },
    };
    res = {
      status: jest.fn(() => res),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it('successfully logs out user by clearing refresh token', async () => {
    const userMock = {
      refreshToken: 'someToken',
      save: jest.fn(),
    };
    User.default.findById.mockResolvedValue(userMock);
    jwt.default.verify.mockReturnValue({ userId: 'userId' });

    await logout(req, res);

    expect(userMock.refreshToken).toBe(null);
    expect(userMock.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: 'Logged out successfully' });
  });

  it('returns 400 if no refresh token provided', async () => {
    req.body.refreshToken = null;

    await logout(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'No refresh token provided' });
  });

  it('returns 400 on internal error', async () => {
    User.default.findById.mockRejectedValue(new Error('fail'));

    await logout(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Logout failed' });
  });
});
