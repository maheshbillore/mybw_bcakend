import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS // Gmail App Password
  }
});

export async function sendMail(payload:any) {
 const { to, subject, html } = payload;
  return transporter.sendMail({
    from: `"Bharat Worker" <${process.env.MAIL_USER}>`,
    to,
    subject,
    html
  });
}
