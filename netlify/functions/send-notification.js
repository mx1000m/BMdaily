import { getStore } from '@netlify/blobs';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const req = JSON.parse(event.body || '{}');
    if (!req?.fid || !req?.title || !req?.body || !req?.targetUrl) {
      return { statusCode: 400, body: 'Missing required fields' };
    }
    const store = getStore({ name: 'bm-notifications', siteID: process.env.NETLIFY_SITE_ID, token: process.env.NETLIFY_BLOBS_TOKEN });
    const saved = await store.getJSON(`fid:${req.fid}`);
    if (!saved?.url || !saved?.token) {
      return { statusCode: 404, body: 'No token for fid' };
    }
    const payload = {
      notificationId: req.notificationId || (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`),
      title: String(req.title).slice(0, 32),
      body: String(req.body).slice(0, 128),
      targetUrl: String(req.targetUrl),
      tokens: [saved.token],
    };
    const resp = await fetch(saved.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await resp.json().catch(() => ({}));
    return { statusCode: resp.status, body: JSON.stringify(json) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: String(e) }) };
  }
}



