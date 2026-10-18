import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  const required = ['EMAIL_IMAP_HOST','EMAIL_IMAP_PORT','EMAIL_IMAP_USER','EMAIL_SMTP_HOST','EMAIL_SMTP_PORT','EMAIL_SMTP_USER','EMAIL_PASSWORD'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) return res.status(500).json({ ok:false, stage:'config', missing });

  const imap = new ImapFlow({
    host: process.env.EMAIL_IMAP_HOST,
    port: Number(process.env.EMAIL_IMAP_PORT),
    secure: true,
    auth: { user: process.env.EMAIL_IMAP_USER, pass: process.env.EMAIL_PASSWORD },
    logger: false
  });

  try {
    await imap.connect();
    const mailbox = await imap.getMailboxLock('INBOX');
    let inbox = { exists: imap.mailbox?.exists ?? null };
    mailbox.release();
    await imap.logout();

    const smtp = nodemailer.createTransport({
      host: process.env.EMAIL_SMTP_HOST,
      port: Number(process.env.EMAIL_SMTP_PORT),
      secure: true,
      auth: { user: process.env.EMAIL_SMTP_USER, pass: process.env.EMAIL_PASSWORD }
    });
    await smtp.verify();

    return res.status(200).json({ ok:true, imap:'connected', smtp:'connected', inbox });
  } catch (error) {
    try { await imap.logout(); } catch {}
    return res.status(500).json({ ok:false, stage:'email_connection', error: error?.message || 'Connection failed' });
  }
}
