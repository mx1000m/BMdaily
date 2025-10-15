import { getStore } from '@netlify/blobs';

// Saves nextAt for a fid so the cron can pick it up later
export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const body = JSON.parse(event.body || '{}');
    const fid = body?.fid;
    const nextAt = body?.nextAt; // ms epoch
    if (typeof fid !== 'number' || typeof nextAt !== 'number') {
      return { statusCode: 400, body: 'Missing fid/nextAt' };
    }
    const store = getStore({ name: 'bm-notifications' });
    await store.setJSON(`due:${fid}`, { fid, nextAt });
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: String(e) }) };
  }
}


