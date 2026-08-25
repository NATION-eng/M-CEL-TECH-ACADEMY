import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limit for public contact form — prevent spam
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { success: false, message: 'Too many contact form submissions. Please try again in an hour.' },
});

router.post('/', contactLimiter, async (req: Request, res: Response) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email and message are required.' });
    }

    // Log submission (would send email in production via nodemailer/sendgrid)
    console.log(`[Contact Form] From: ${name} <${email}> | Subject: ${subject ?? 'No subject'}\n${message}`);

    return res.status(200).json({ success: true, message: 'Message received. We will respond within 24 hours.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to send message. Please try again.' });
  }
});

export default router;
