const nodemailer = require("nodemailer");

console.log("📩 Email service initializing...");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

console.log("🔧 Transporter created for:", process.env.EMAIL_USER);

// ─────────────────────────────────────────────────────────────
// sendEmail({ to, subject, html })  ← object style
// ─────────────────────────────────────────────────────────────
const sendEmail = async ({ to, subject, html }) => {
  try {
    console.log("📤 Sending email...");
    console.log("➡️  To:", to);
    console.log("➡️  Subject:", subject);

    const info = await transporter.sendMail({
      from: `"Calendar App" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log(" Email sent successfully!");
    console.log(" Message ID:", info.messageId);
    return info;
  } catch (err) {
    console.error(" EMAIL SEND ERROR:", err.message);
    throw err;
  }
};

module.exports = sendEmail;