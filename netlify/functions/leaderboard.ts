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
    // Get leaderboard from Netlify Blobs
    const store = getStore({ 
      name: 'leaderboard',
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_BLOBS_TOKEN
    });
    
    const counts = await store.get('counts', { type: 'json' });
    
    if (!counts || !Array.isArray(counts)) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: [] }),
      };
    }
    
    // Convert to sorted array
    const entries: LeaderboardEntry[] = counts
      .map((entry: any) => ({ address: entry.address, count: entry.count }))
      .sort((a: any, b: any) => b.count - a.count);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries }),
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
