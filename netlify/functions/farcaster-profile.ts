import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  try {
    const fid = event.queryStringParameters?.fid;
    if (!fid) return { statusCode: 400, body: JSON.stringify({ error: 'fid required' }) };
    const apiKey = process.env.NEYNAR_API_KEY;
    if (!apiKey) return { statusCode: 500, body: JSON.stringify({ error: 'NEYNAR_API_KEY missing' }) };
    const resp = await fetch(`https://api.neynar.com/v2/farcaster/user?fid=${encodeURIComponent(fid)}`, {
      headers: { 'accept': 'application/json', 'api_key': apiKey }
    });
    const json = await resp.json();
    // Normalize minimal fields
    const user = json?.result?.user || json?.user || json;
    const data = {
      fid: Number(fid),
      name: user?.display_name || user?.profile?.display_name || user?.username || null,
      username: user?.username || null,
      pfp: user?.pfp_url || user?.profile?.pfp_url || null
    };
    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: 'profile_fetch_failed' }) };
  }
};


