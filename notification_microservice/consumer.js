
import amqp from 'amqplib';
import dotenv from 'dotenv';
import { sendMail } from './utils/mailer.js';
dotenv.config();

const RABBITMQ_URL = process.env.RABBITMQ_URL;
const QUEUE = process.env.QUEUE_NAME;

// Accepts an optional callback for real-time integration (e.g., with Socket.IO)
export const startConsumer = async (onInvite) => {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    await channel.assertQueue(QUEUE, { durable: true });

    console.log(`[RabbitMQ] Waiting for messages in ${QUEUE}`);

    channel.consume(QUEUE, async (msg) => {
      if (msg !== null) {
        try {
          const data = JSON.parse(msg.content.toString());
          console.log(`[Received Invite]`, data);

          // Send the email as before
          await sendMail({
            to: data.email,
            subject: data.subject || "You're Invited",
            text: data.message || `You've been invited with role: ${data.role}`,
          });

          // If a callback is provided (e.g., to emit with Socket.IO), call it
          if (typeof onInvite === 'function') {
            onInvite(data);
          }

          channel.ack(msg);
        } catch (err) {
          console.error('[Invite Handling Error]', err);
          // Optionally nack without requeue, or dead-letter
          channel.nack(msg, false, false);
        }
      }
    });
  } catch (error) {
    console.error('[RabbitMQ Error]', error);
    process.exit(1);
  }
};

