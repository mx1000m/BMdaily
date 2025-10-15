import { getStore } from '@netlify/blobs';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const notificationDetails = body?.notificationDetails;
    const fid = body?.fid ?? body?.viewer?.fid ?? body?.user?.fid ?? body?.context?.viewer?.fid;
    const store = getStore({ name: 'bm-notifications' });

    if (!fid || typeof fid !== 'number') {
      return { statusCode: 200, body: JSON.stringify({ ok: true, saved: false }) };
    }

    switch (body?.event) {
      case 'miniapp_added':
      case 'notifications_enabled': {
        if (notificationDetails?.url && notificationDetails?.token) {
          await store.setJSON(`fid:${fid}`, {
            url: String(notificationDetails.url),
            token: String(notificationDetails.token),
            updatedAt: new Date().toISOString(),
          });
          // ensure fid is present in the due index for future schedules
          const indexKey = 'due:index';
          const index = (await store.getJSON(indexKey)) || { fids: [] };
          if (!index.fids.includes(fid)) {
            index.fids.push(fid);
            await store.setJSON(indexKey, index);
          }
          return { statusCode: 200, body: JSON.stringify({ ok: true, saved: true }) };
        }
        return { statusCode: 200, body: JSON.stringify({ ok: true, saved: false }) };
      }
      case 'notifications_disabled':
      case 'miniapp_removed': {
        await store.delete(`fid:${fid}`);
        return { statusCode: 200, body: JSON.stringify({ ok: true, deleted: true }) };
      }
      default: {
        return { statusCode: 200, body: JSON.stringify({ ok: true, ignored: true }) };
      }
    }
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: String(e) }) };
  }
}


