// Broadcast real push notifications via Neynar
// Requires env var NEYNAR_API_KEY and ADMIN_SECRET

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const adminSecret = process.env.ADMIN_SECRET;
  const provided = event.headers['x-admin-secret'] || event.headers['X-Admin-Secret'];
  if (!adminSecret || provided !== adminSecret) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  const apiKey = process.env.NEYNAR_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: 'Missing NEYNAR_API_KEY' };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { body = {}; }

  const title = String(body.title || "Your next BM's ready.☕").slice(0, 48);
  const message = String(body.body || 'Tap to BM!').slice(0, 140);
  const targetUrl = String(body.targetUrl || process.env.VITE_BASE_URL || 'https://bmdaily.netlify.app');
  const targetFids = Array.isArray(body.targetFids) ? body.targetFids : []; // empty = all registered
  const filters = body.filters && typeof body.filters === 'object' ? body.filters : undefined;

  try {
    const resp = await fetch('https://api.neynar.com/v2/farcaster/frame/notifications/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        target_fids: targetFids,
        ...(filters ? { filters } : {}),
        notification: {
          title,
          body: message,
          target_url: targetUrl,
        },
      }),
    });

    const json = await resp.json().catch(() => ({}));
    return { statusCode: resp.status, body: JSON.stringify(json), headers: { 'Content-Type': 'application/json' } };
  } catch (err) {
    return { statusCode: 500, body: `Internal Server Error: ${err && err.message ? err.message : 'unknown'}` };
  }
};



