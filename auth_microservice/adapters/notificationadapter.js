import axios from "axios";

class NotificationAdapter {
  constructor(baseURL) {
    this.client = axios.create({ baseURL: baseURL || "http://localhost:3000"  });
  }

  async sendEmail(to, subject, text) {
    try {
      return await this.client.post("/notify/email", { to, subject, text ,html});
    } catch (err) {
      console.error("Notification failed:", err.message);
      throw new Error("Notification failed");
    }
  }

  
}

export default new NotificationAdapter(process.env.NOTIFY_URL );
