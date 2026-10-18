import { ImapFlow } from 'imapflow';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'POST only' });
  const client = new ImapFlow({
    host: process.env.EMAIL_IMAP_HOST,
    port: Number(process.env.EMAIL_IMAP_PORT),
    secure: true,
    auth: { user: process.env.EMAIL_IMAP_USER, pass: process.env.EMAIL_PASSWORD },
    logger: false
  });
  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX', { readOnly:true });
    let item;
    try {
      const total = client.mailbox?.exists || 0;
      if (!total) return res.status(200).json({ ok:true, imported:false, reason:'empty inbox' });
      const msg = await client.fetchOne(String(total), { envelope:true, uid:true }, { uid:false });
      const from = msg.envelope?.from?.[0] || {};
      item = {
        external_id:`imap-${msg.uid}`,
        sender_email:from.address || '',
        sender_name:from.name || null,
        recipient_email:process.env.EMAIL_IMAP_USER,
        subject:msg.envelope?.subject || '(fara subiect)',
        received_at:msg.envelope?.date || new Date().toISOString()
      };
    } finally { lock.release(); }

    const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_SECRET_KEY;
    const r=await fetch(`${url}/rest/v1/email_messages?on_conflict=external_id`,{
      method:'POST',
      headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'resolution=ignore-duplicates,return=minimal'},
      body:JSON.stringify({...item,direction:'inbound',status:'new',category:null})
    });
    if(!r.ok){const detail=await r.text();throw new Error(`Database sync failed: ${detail.slice(0,180)}`);}
    return res.status(200).json({ok:true,imported:true,mode:'one-message-read-only',message:{sender:item.sender_email,subject:item.subject}});
  } catch(e) {
    return res.status(500).json({ok:false,error:e?.message || 'Sync failed'});
  } finally { try { await client.logout(); } catch {} }
}
