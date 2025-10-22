// import { jest } from "@jest/globals";
// import { refreshAccessToken } from "../controllers/authcontroller.js";
// import User from "../models/User.js";
// import jwt from "jsonwebtoken";

// jest.mock("../models/User.js");
// jest.mock("jsonwebtoken");

// describe("refreshAccessToken", () => {
//   let req, res, user;

//   beforeEach(() => {
//     user = { _id: "123", role: "user", refreshToken: "refresh123" };
//     req = { body: { refreshToken: "refresh123" } };
//     res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
//     User.findById.mockResolvedValue(user);
//     jwt.verify.mockReturnValue({ userId: "123" });
//     jwt.sign.mockReturnValue("newAccessToken");
//   });

//   it("should refresh access token successfully", async () => {
//     await refreshAccessToken(req, res);
//     expect(res.json).toHaveBeenCalledWith({ accessToken: "newAccessToken" });
//   });

//   it("should return 401 if no refresh token provided", async () => {
//     req.body.refreshToken = null;
//     await refreshAccessToken(req, res);
//     expect(res.status).toHaveBeenCalledWith(401);
//     expect(res.json).toHaveBeenCalledWith({ message: "No refresh token provided" });
//   });

//   it("should return 403 if invalid refresh token", async () => {
//     user.refreshToken = "different";
//     await refreshAccessToken(req, res);
//     expect(res.status).toHaveBeenCalledWith(403);
//     expect(res.json).toHaveBeenCalledWith({ message: "Invalid refresh token" });
//   });

//   it("should handle errors", async () => {
//     User.findById.mockRejectedValue(new Error("fail"));
//     await refreshAccessToken(req, res);
//     expect(res.status).toHaveBeenCalledWith(403);
//     expect(res.json).toHaveBeenCalledWith({ message: "Invalid refresh token" });
//   });
// });


// import { refreshAccessToken } from "../controllers/authcontroller.js";
// import User from "../models/User.js";
// import jwt from "jsonwebtoken";

// jest.mock("../models/User.js");
// jest.mock("jsonwebtoken");

// describe("Refresh Access Token API", () => {
//   let req, res;

//   beforeEach(() => {
//     req = { body: {} };
//     res = { status: jest.fn(() => res), json: jest.fn() };
//     jest.clearAllMocks();
//   });

//   it("returns 401 when no refresh token provided", async () => {
//     await refreshAccessToken(req, res);

//     expect(res.status).toHaveBeenCalledWith(401);
//     expect(res.json).toHaveBeenCalledWith({ message: "No refresh token provided" });
//   });

//   it("returns 403 if refresh token is invalid", async () => {
//     req.body.refreshToken = "invalidToken";
//     jwt.verify.mockImplementation(() => { throw new Error("fail"); });

//     await refreshAccessToken(req, res);

//     expect(res.status).toHaveBeenCalledWith(403);
//     expect(res.json).toHaveBeenCalledWith({ message: "Invalid refresh token" });
//   });

//   it("returns 403 if user not found or token mismatch", async () => {
//     req.body.refreshToken = "token";
//     jwt.verify.mockReturnValue({ userId: "id" });
//     User.findById.mockResolvedValue(null);

//     await refreshAccessToken(req, res);

//     expect(res.status).toHaveBeenCalledWith(403);
//     expect(res.json).toHaveBeenCalledWith({ message: "Invalid refresh token" });
//   });

//   it("issues new access token if valid", async () => {
//     req.body.refreshToken = "token";
//     jwt.verify.mockReturnValue({ userId: "id" });
//     const userMock = { _id: "id", role: "user", refreshToken: "token" };
//     User.findById.mockResolvedValue(userMock);
//     jwt.sign.mockReturnValue("newAccessToken");

//     await refreshAccessToken(req, res);

//     expect(res.json).toHaveBeenCalledWith({ accessToken: "newAccessToken" });
//   });
// });



import { jest } from '@jest/globals';

// Mock dependencies before importing controller
jest.unstable_mockModule('../../models/User.js', () => ({
  default: {
    findById: jest.fn(),
  },
}));

jest.unstable_mockModule('jsonwebtoken', () => ({
  default: {
    verify: jest.fn(),
    sign: jest.fn(),
  },
  verify: jest.fn(),
  sign: jest.fn(),
}));

// Import mocked modules and controller after mocks
const User = await import('../../models/User.js');
const jwt = await import('jsonwebtoken');
const { refreshAccessToken } = await import('../../controllers/authcontroller.js');

describe('Refresh Access Token API', () => {
  let req, res;

  beforeEach(() => {
    req = { body: {} };
    res = {
      status: jest.fn(() => res),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it('returns 401 when no refresh token provided', async () => {
    await refreshAccessToken(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'No refresh token provided' });
  });

  it('returns 403 if refresh token is invalid', async () => {
    req.body.refreshToken = 'invalidToken';
    jwt.default.verify.mockImplementation(() => { throw new Error('fail'); });

    await refreshAccessToken(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid refresh token' });
  });

  it('returns 403 if user not found or token mismatch', async () => {
    req.body.refreshToken = 'token';
    jwt.default.verify.mockReturnValue({ userId: 'id' });
    User.default.findById.mockResolvedValue(null);

    await refreshAccessToken(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid refresh token' });
  });

  it('issues new access token if valid', async () => {
    req.body.refreshToken = 'token';
    jwt.default.verify.mockReturnValue({ userId: 'id' });
    const userMock = { _id: 'id', role: 'user', refreshToken: 'token' };
    User.default.findById.mockResolvedValue(userMock);
    jwt.default.sign.mockReturnValue('newAccessToken');

    await refreshAccessToken(req, res);

    expect(res.json).toHaveBeenCalledWith({ accessToken: 'newAccessToken' });
  });
});
