import { getStore } from '@netlify/blobs';

interface LeaderboardEntry {
  address: string;
  count: number;
  name?: string;
}

export const handler = async (event: any) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Get leaderboard from Netlify Blobs (persistent storage)
    const store = getStore({ 
      name: 'leaderboard',
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_BLOBS_TOKEN
    });
    const data = await store.get('entries', { type: 'json' });
    
    if (data && Array.isArray(data)) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: data }),
      };
    }
    
    // Return empty if no data yet
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries: [] }),
    };
  } catch (error) {
    console.error('Leaderboard error:', error);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries: [] }),
    };
  }
};
