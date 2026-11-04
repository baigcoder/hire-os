import express from "express";
import rateLimit from "express-rate-limit";
import { sendEmail } from "../utils/emailService.js";

/**
 * The public contact form. A message is emailed to CONTACT_EMAIL (or the
 * SMTP account). When mail isn't configured the route says so with a 503
 * instead of pretending the message went anywhere.
 */
const router = express.Router();

const TOPICS = ["General", "Support", "Sales", "Press"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many messages. Try again in an hour." },
  skip: () => process.env.NODE_ENV === "test",
});

router.post("/", contactLimiter, async (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  const email = String(req.body?.email ?? "").trim();
  const topic = TOPICS.includes(req.body?.topic) ? req.body.topic : "General";
  const message = String(req.body?.message ?? "").trim();

  if (!name || name.length > 100) return res.status(400).json({ success: false, message: "Add your name." });
  if (!EMAIL.test(email) || email.length > 200) return res.status(400).json({ success: false, message: "Add an email we can reply to." });
  if (message.length < 10 || message.length > 4000) return res.status(400).json({ success: false, message: "Write a message of 10 to 4000 characters." });

  const to = process.env.CONTACT_EMAIL || process.env.SMTP_USER;
  const configured = to && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
  if (!configured) {
    return res.status(503).json({ success: false, message: "Messages can't be delivered right now. Please try again later." });
  }

  const result = await sendEmail({
    to,
    subject: `[Contact · ${topic}] ${name}`,
    text: `From: ${name} <${email}>\nTopic: ${topic}\n\n${message}`,
    html: `<p><strong>From:</strong> ${escape(name)} &lt;${escape(email)}&gt;<br><strong>Topic:</strong> ${escape(topic)}</p><p style="white-space:pre-wrap">${escape(message)}</p>`,
  });
  if (!result?.success || result.mode === "console") {
    return res.status(502).json({ success: false, message: "Your message couldn't be sent. Please try again." });
  }
  return res.status(200).json({ success: true, message: "Thanks. We'll reply by email." });
});

export default router;
