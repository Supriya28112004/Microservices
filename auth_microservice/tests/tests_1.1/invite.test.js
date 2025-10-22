// import { jest } from "@jest/globals";
// import { sendInvite } from "../controllers/authcontroller.js";
// import User from "../models/User.js";
// import Invite from "../models/Invite.js";
// import { encrypt } from "../utils/encrypt.js";
// import amqp from "amqplib";
// import crypto from "crypto";
// import { PERMISSIONS } from "../../shared/constants/roles.js";

// jest.mock("../models/User.js");
// jest.mock("../models/Invite.js");
// jest.mock("../utils/encrypt.js");
// jest.mock("amqplib");
// jest.mock("crypto");

// describe("sendInvite", () => {
//   let req, res, user;

//   beforeEach(() => {
//     user = { _id: "123", role: "admin" };
//     req = { user: { role: "admin" }, body: { email: "test@test.com", role: "user", message: "Hello" } };
//     res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
//     User.findOne.mockResolvedValue(null);
//     Invite.create.mockResolvedValue({ _id: "invite123" });
//     encrypt.mockReturnValue("encryptedEmail");
//     crypto.randomBytes.mockReturnValue({ toString: () => "token123" });

//     const mockChannel = {
//       assertQueue: jest.fn(),
//       sendToQueue: jest.fn(),
//       close: jest.fn(),
//     };
//     const mockConnection = { createChannel: jest.fn().mockResolvedValue(mockChannel), close: jest.fn() };
//     amqp.connect.mockResolvedValue(mockConnection);
//   });

//   it("should send invite successfully", async () => {
//     await sendInvite(req, res);
//     expect(res.json).toHaveBeenCalledWith({ message: "Invite sent successfully", inviteId: "invite123" });
//   });

//   it("should return 403 if no permission to invite role", async () => {
//     req.body.role = "admin"; // same role, assume admin can't invite another admin
//     await sendInvite(req, res);
//     expect(res.status).toHaveBeenCalledWith(403);
//     expect(res.json).toHaveBeenCalledWith({ message: "You do not have permission to invite this role." });
//   });

//   it("should handle errors", async () => {
//     Invite.create.mockRejectedValue(new Error("fail"));
//     await sendInvite(req, res);
//     expect(res.status).toHaveBeenCalledWith(500);
//     expect(res.json).toHaveBeenCalledWith({ message: "Invite failed", error: "fail" });
//   });
// });


import { jest } from '@jest/globals';

// Mock modules before imports
jest.unstable_mockModule('../../models/User.js', () => ({
  default: {
    findOne: jest.fn(),
  },
}));

jest.unstable_mockModule('../../models/Invite.js', () => ({
  default: {
    create: jest.fn(),
  },
}));

jest.unstable_mockModule('../../utils/encrypt.js', () => ({
  encrypt: jest.fn(),
  decrypt: jest.fn(),
}));

jest.unstable_mockModule('amqplib', () => ({
  default: {
    connect: jest.fn(),
  },
}));

jest.unstable_mockModule('crypto', () => ({
  default: {
    randomBytes: jest.fn(),
  },
  randomBytes: jest.fn(),
}));

// Import modules after mocks and set mock implementations as needed
const User = await import('../../models/User.js');
const Invite = await import('../../models/Invite.js');
const encryptUtils = await import('../../utils/encrypt.js');
const amqp = await import('amqplib');
const crypto = await import('crypto');
const { sendInvite } = await import('../../controllers/authcontroller.js');

describe('Send Invite API', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { role: 'SITE_ADMIN' },
      body: { email: 'invitee@example.com', role: 'CLIENT_ADMIN', message: 'Welcome!' },
    };
    res = {
      status: jest.fn(() => res),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it('returns 403 if user lacks invite permission', async () => {
    req.user.role = 'CLIENT_USER';   // role that lacks permission
    req.body.role = 'SITE_ADMIN';  // target invite role

    await sendInvite(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'You do not have permission to invite this role.' });
  });

  it('creates invite, publishes message, and returns success', async () => {
    User.default.findOne.mockResolvedValue(null);  // simulating no existing user
    Invite.default.create.mockResolvedValue({ _id: 'inviteId' });
    encryptUtils.encrypt.mockReturnValue('encryptedEmail');
    crypto.default.randomBytes.mockReturnValue({ toString: () => 'token123' });

    const mockChannel = {
      assertQueue: jest.fn(),
      sendToQueue: jest.fn(),
      close: jest.fn(),
    };

    const mockConnection = {
      createChannel: jest.fn().mockResolvedValue(mockChannel),
      close: jest.fn(),
    };

    amqp.default.connect.mockResolvedValue(mockConnection);

    await sendInvite(req, res);

    expect(Invite.default.create).toHaveBeenCalled();
    expect(amqp.default.connect).toHaveBeenCalled();
    expect(mockChannel.assertQueue).toHaveBeenCalled();
    expect(mockChannel.sendToQueue).toHaveBeenCalled();
    expect(mockChannel.close).toHaveBeenCalled();
    expect(mockConnection.close).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: 'Invite sent successfully', inviteId: 'inviteId' });
  });

  it('handles errors with 500 response', async () => {
    // Set up a valid role combination to avoid permission error
    req.user.role = 'SITE_ADMIN';
    req.body.role = 'CLIENT_ADMIN';
    
    Invite.default.create.mockRejectedValue(new Error('fail'));

    await sendInvite(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invite failed' }));
  });
});

