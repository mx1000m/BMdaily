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
    // Fetch data from update function's output
    // For now, return a message to manually trigger update
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        entries: [],
        message: 'Please click the update button to fetch leaderboard data'
      }),
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
