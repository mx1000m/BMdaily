import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  try {
    const fid = event.queryStringParameters?.fid;
    const address = event.queryStringParameters?.address;
    const apiKey = process.env.NEYNAR_API_KEY;
    if (!apiKey) return { statusCode: 500, body: JSON.stringify({ error: 'NEYNAR_API_KEY missing' }) };
    let user: any = null;

    if (fid) {
      const url = `https://api.neynar.com/v2/farcaster/user/bulk?fids=${encodeURIComponent(fid)}`;
      const resp = await fetch(url, { headers: { 'accept': 'application/json', 'x-api-key': apiKey } });
      const json = await resp.json();
      user = json?.users?.[0] || null;
    } else if (address) {
      const url = `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${encodeURIComponent(address)}&address_types=verified,connected`;
      const resp = await fetch(url, { headers: { 'accept': 'application/json', 'x-api-key': apiKey } });
      const json = await resp.json();
      user = json?.users?.[0] || null;
    } else {
      return { statusCode: 400, body: JSON.stringify({ error: 'fid_or_address_required' }) };
    }

    // Normalize minimal fields
    const data = {
      fid: user?.fid ?? (fid ? Number(fid) : null),
      name: user?.display_name || user?.profile?.display_name || user?.username || null,
      username: user?.username || null,
      pfp: user?.pfp_url || user?.profile?.pfp_url || null
    };
    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: 'profile_fetch_failed' }) };
  }
};


