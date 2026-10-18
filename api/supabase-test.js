export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    return res.status(500).json({
      ok: false,
      stage: 'config',
      missing: [!url ? 'SUPABASE_URL' : null, !key ? 'SUPABASE_SECRET_KEY' : null].filter(Boolean)
    });
  }

  try {
    const response = await fetch(`${url}/rest/v1/email_messages?select=id&limit=1`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`
      }
    });

    if (!response.ok) {
      const detail = await response.text();
      return res.status(500).json({
        ok: false,
        stage: 'supabase_connection',
        status: response.status,
        detail: detail.slice(0, 300)
      });
    }

    const rows = await response.json();
    return res.status(200).json({
      ok: true,
      supabase: 'connected',
      table: 'email_messages',
      readable: true,
      sample_rows: Array.isArray(rows) ? rows.length : 0,
      note: 'Connection test only. No data was inserted, updated or deleted.'
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      stage: 'supabase_connection',
      error: error?.message || 'Connection failed'
    });
  }
}
