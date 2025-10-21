// import { startConsumer } from './consumer.js';

// const PORT = 4002;
// startConsumer();
// console.log(`Notification Microservice Running on port ${PORT}`);

import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { startConsumer } from './consumer.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  methods: ["GET", "POST"] // Allow from anywhere for development
});

app.get('/', (req, res) => {
  res.send('Notification Socket Server Running');
});

// List of connected sockets (optional, for users mapping)
let onlineUsers = [];

io.on('connection', (socket) => {
  console.log('User connected with socketid:', socket.id);
  // You can identify users here if you have auth.

  socket.on('disconnect', () => {
    console.log('User disconnected with socketid:', socket.id);
    // Remove from online users, if tracking
  });
});


startConsumer((inviteData) => {
  
  io.emit('invite-notification', inviteData);
});

server.listen(4002, '0.0.0.0', () => console.log('Socket.IO server listening on port 4002'));
