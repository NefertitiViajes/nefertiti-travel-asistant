import { ImapFlow } from 'imapflow';

export default async function handler(req, res) {
  const client = new ImapFlow({
    host: process.env.EMAIL_IMAP_HOST,
    port: Number(process.env.EMAIL_IMAP_PORT),
    secure: true,
    auth: {
      user: process.env.EMAIL_IMAP_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    logger: false
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX', { readOnly: true });
    try {
      const total = client.mailbox?.exists || 0;
      const start = Math.max(1, total - 4);
      const messages = [];

      if (total > 0) {
        for await (const msg of client.fetch(`${start}:*`, { envelope: true, flags: true })) {
          messages.push({
            date: msg.envelope?.date || null,
            from: (msg.envelope?.from || []).map(x => x.address).filter(Boolean),
            subject: msg.envelope?.subject || '(fara subiect)',
            seen: msg.flags?.has('\\Seen') ?? null
          });
        }
      }

      return res.status(200).json({
        ok: true,
        mode: 'read-only',
        count: messages.length,
        messages
      });
    } finally {
      lock.release();
    }
  } catch (error) {
    return res.status(500).json({ ok: false, error: error?.message || 'Inbox check failed' });
  } finally {
    try { await client.logout(); } catch {}
  }
}
