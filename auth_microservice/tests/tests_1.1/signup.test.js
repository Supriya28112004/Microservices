// import { jest } from "@jest/globals";
// import { signup } from '../controllers/authcontroller.js';
// import User from "../models/User.js";
// import { hashPassword } from "../utils/hash.js";

// jest.mock("../models/User.js");
// jest.mock("../utils/hash.js");

// describe("signup", () => {
//   let req, res;

//   beforeEach(() => {
//     req = { body: { email: "test@test.com", password: "pass123", role: "user", firstname: "John", lastname: "Doe" } };
//     res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
//   });

//   it("should register a user successfully", async () => {
//     hashPassword.mockResolvedValue("hashedpass");
//     User.create.mockResolvedValue({ _id: "12345" });

//     await signup(req, res);

//     expect(hashPassword).toHaveBeenCalledWith("pass123");
//     expect(User.create).toHaveBeenCalledWith({
//       email: "test@test.com",
//       passwordhash: "hashedpass",
//       role: "user",
//       firstname: "John",
//       lastname: "Doe"
//     });
//     expect(res.status).toHaveBeenCalledWith(201);
//     expect(res.json).toHaveBeenCalledWith({ message: "User registered", userId: "12345" });
//   });

//   it("should handle errors during signup", async () => {
//     hashPassword.mockRejectedValue(new Error("fail"));
//     await signup(req, res);
//     expect(res.status).toHaveBeenCalledWith(500);
//     expect(res.json).toHaveBeenCalledWith({ message: "Signup failed" });
//   });
// });



import { hashPassword } from "../../utils/hash.js";
import User from "../../models/User.js";
import { signup } from "../../controllers/authcontroller.js";
import { jest } from '@jest/globals';

jest.mock("../../utils/hash.js");
jest.mock("../../models/User.js");

describe("Signup API", () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: { email: "test@example.com", password: "pass123", role: "user", firstname: "John", lastname: "Doe" },
    };
    res = {
      status: jest.fn(() => res),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("should successfully signup a user", async () => {
    hashPassword.mockResolvedValue("hashedPass");  // direct mocked function override
    User.create.mockResolvedValue({ _id: "userId" });

    await signup(req, res);

    expect(hashPassword).toHaveBeenCalledWith(req.body.password);
    expect(User.create).toHaveBeenCalledWith({
      email: req.body.email,
      passwordhash: "hashedPass",
      role: req.body.role,
      firstname: req.body.firstname,
      lastname: req.body.lastname,
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ message: "User registered", userId: "userId" });
  });

  it("should handle errors gracefully", async () => {
    hashPassword.mockRejectedValue(new Error("fail"));

    await signup(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Signup failed" });
  });
});
