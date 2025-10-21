import amqp from 'amqplib';

async function publishInviteEmail(inviteDetails) {
  const connection = await amqp.connect('amqp://localhost'); // RabbitMQ server URL
  const channel = await connection.createChannel();
  const queue = 'email_invites';

  await channel.assertQueue(queue, { durable: true });
  channel.sendToQueue(queue, Buffer.from(JSON.stringify(inviteDetails)), {
    persistent: true,
  });

  setTimeout(() => {
    channel.close();
    connection.close();
  }, 500);
}
