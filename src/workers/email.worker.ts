import Queue from "bull";
import { sendMail } from "../services/mail.service.js";

const emailQueue = new Queue("email-queue", {
  redis: {
    host: "127.0.0.1",
    port: 6379
  }
});

console.log("📨 Email Worker Started");

emailQueue.process(async (job) => {
  const { name, email, type } = job.data;

  if (type === "WELCOME_EMAIL") {
    await sendMail({
      to: email,
      subject: "Welcome to Bharat Worker 🎉",
      html: `<h3>Hello ${name}, welcome aboard!</h3>`
    });
  }

  return true;
});
