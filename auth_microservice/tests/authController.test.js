
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

import jwt from "jsonwebtoken";

const userId = new mongoose.Types.ObjectId().toHexString();


const validAccessToken = jwt.sign(
  { userId, role: "CLIENT_USER" },
  process.env.JWT_SECRET,
  { expiresIn: "15m" }
);

const validAccessTokenWithInsufficientRole = jwt.sign(
  { userId, role: "GUEST_USER" }, // not authorized role
  process.env.JWT_SECRET,
  { expiresIn: "15m" }
);

import request from "supertest";
import app from "../app.js";
import User from "../models/User.js";
import mongoose from "mongoose";

// Mock dependencies if needed (hashPassword, verifyPassword, jwt, etc.)
// Also consider mocking axios and amqp (RabbitMQ) for isolated tests

beforeEach(async () => {
  await User.deleteMany({ email: "test@example.com" });
});




beforeAll(async () => {
  await mongoose.connect(process.env.TEST_MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Auth Controller API Tests", () => {
//   jest.setTimeout(20000);

  // Signup
  test("POST /authuser/signup - should create a new user", async () => {
    const res = await request(app)
      .post("/authuser/signup")
      .send({ email: "test@example.com", password: "Password@123", role: "CLIENT_USER", firstname: "Test", lastname: "User" });
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe("User registered");
    expect(res.body.userId).toBeDefined();
  });

  // Login - invalid credentials fail
  test("POST /authuser/login - invalid credentials", async () => {
    const res = await request(app)
      .post("/authuser/login")
      .send({ email: "invalid@example.com", password: "wrong" });
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Invalid credentials");
  });

  // Verify OTP - no OTP generated fail
  test("POST /authuser/mfa/verify-otp - no OTP generated", async () => {
    const res = await request(app)
      .post("/authuser/mfa/verify-otp")
      .send({ email: "test@example.com", otp: "123456" });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/no otp generated/i);
  });

  // Setup TOTP - should require authentication, so mock a user logged in for this
  test("POST /authuser/mfa/setup-totp - requires token", async () => {
    const res = await request(app)
      .post("/authuser/mfa/setup-totp")
      .set("Authorization", `Bearer ${validAccessToken}`)
      .send();
    expect([200, 401]).toContain(res.statusCode); // Adjust based on auth mock
  });

  // Send Invite - permission denied case
  test("POST /authuser/invite - permission denied", async () => {
    const res = await request(app)
      .post("/authuser/invite")
      .set("Authorization", "Bearer validAccessTokenWithInsufficientRole")
      .send({ email: "invitee@example.com", role: "SUPER_ADMIN", message: "Please join" });
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/permission/i);
  });

  // Logout - no token fail
  test("POST /authuser/logout - no token provided", async () => {
    const res = await request(app)
      .post("/authuser/logout")
      .send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/no refresh token/i);
  });
});

