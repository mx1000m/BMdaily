interface LeaderboardEntry {
  address: string;
  count: number;
}

// This will be called by update-leaderboard-data to set the cached entries
// Since Netlify functions share global scope, we can use this pattern

declare global {
  var leaderboardEntries: LeaderboardEntry[] | undefined;
}

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { entries } = body;
    
    // Store in global variable (survives between invocations in same lambda)
    if (typeof global !== 'undefined') {
      global.leaderboardEntries = entries;
    }
    
    console.log(`Set ${entries.length} leaderboard entries`);
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, count: entries.length }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: String(error) }),
    };
  }
};


