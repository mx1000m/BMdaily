import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  try {
    const address = event.queryStringParameters?.address;
    if (!address) {
      return { statusCode: 400, body: JSON.stringify({ error: 'address is required' }) };
    }
    const apiKey = process.env.TALENT_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'server config missing TALENT_API_KEY' }) };
    }
    const headers = { 'X-API-KEY': apiKey, 'Accept': 'application/json' } as Record<string, string>;
    const url = `https://api.talentprotocol.com/score?id=${address}&account_source=wallet&scorer_slug=builder_score`;
    const res = await fetch(url, { headers });
    const text = await res.text();
    return { statusCode: res.status, headers: { 'content-type': res.headers.get('content-type') || 'application/json' }, body: text };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: 'proxy_failed' }) };
  }
};


