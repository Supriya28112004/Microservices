import { jest } from "@jest/globals";
import { sendInvite } from "../controllers/authcontroller.js";
import User from "../models/User.js";
import Invite from "../models/Invite.js";
import { encrypt } from "../utils/encrypt.js";
import amqp from "amqplib";
import crypto from "crypto";
import { PERMISSIONS } from "../../shared/constants/roles.js";

jest.mock("../models/User.js");
jest.mock("../models/Invite.js");
jest.mock("../utils/encrypt.js");
jest.mock("amqplib");
jest.mock("crypto");

describe("sendInvite", () => {
  let req, res, user;

  beforeEach(() => {
    user = { _id: "123", role: "admin" };
    req = { user: { role: "admin" }, body: { email: "test@test.com", role: "user", message: "Hello" } };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    User.findOne.mockResolvedValue(null);
    Invite.create.mockResolvedValue({ _id: "invite123" });
    encrypt.mockReturnValue("encryptedEmail");
    crypto.randomBytes.mockReturnValue({ toString: () => "token123" });

    const mockChannel = {
      assertQueue: jest.fn(),
      sendToQueue: jest.fn(),
      close: jest.fn(),
    };
    const mockConnection = { createChannel: jest.fn().mockResolvedValue(mockChannel), close: jest.fn() };
    amqp.connect.mockResolvedValue(mockConnection);
  });

  it("should send invite successfully", async () => {
    await sendInvite(req, res);
    expect(res.json).toHaveBeenCalledWith({ message: "Invite sent successfully", inviteId: "invite123" });
  });

  it("should return 403 if no permission to invite role", async () => {
    req.body.role = "admin"; // same role, assume admin can't invite another admin
    await sendInvite(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "You do not have permission to invite this role." });
  });

  it("should handle errors", async () => {
    Invite.create.mockRejectedValue(new Error("fail"));
    await sendInvite(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Invite failed", error: "fail" });
  });
});
