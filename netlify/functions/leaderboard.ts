import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const bmContractAddress = '0x47EAd660725c7821c7349DF42579dBE857c02715' as `0x${string}`;

const bmAbi = [
  {
    type: 'event',
    name: 'BM',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'recipient', type: 'address', indexed: true },
      { name: 'userCount', type: 'uint256', indexed: false },
      { name: 'totalCount', type: 'uint256', indexed: false },
    ],
    anonymous: false,
  },
] as const;

interface LeaderboardEntry {
  address: string;
  count: number;
  name?: string;
}

// Cache to avoid repeated API calls
let cachedData: LeaderboardEntry[] = [];
let cacheTime = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export const handler = async (event: any) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Check cache
    if (Date.now() - cacheTime < CACHE_TTL && cachedData.length > 0) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: cachedData }),
      };
    }

    const alchemyUrl = process.env.ALCHEMY_BASE_RPC || 'https://base-mainnet.g.alchemy.com/v2/pBWWRwxvrlovShZdNr9M_';
    
    const publicClient = createPublicClient({
      chain: base,
      transport: http(alchemyUrl),
    });

    // Fetch from contract deployment block
    const currentBlock = await publicClient.getBlockNumber();
    const fromBlock = BigInt(37000000); // Contract deployment block
    
    console.log(`Fetching from block ${fromBlock} to ${currentBlock}`);

    // Fetch all BM events from contract
    const events = await publicClient.getLogs({
      address: bmContractAddress,
      event: bmAbi[0],
      fromBlock,
      toBlock: currentBlock,
    });

    console.log(`Found ${events.length} total BM events`);

    // Aggregate counts
    const counts = new Map<string, number>();
    for (const evt of events) {
      const addr = evt.args.user;
      if (addr) {
        counts.set(addr.toLowerCase(), (counts.get(addr.toLowerCase()) || 0) + 1);
      }
    }

    const entries: LeaderboardEntry[] = Array.from(counts.entries())
      .map(([address, count]) => ({ address, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Update cache
    cachedData = entries;
    cacheTime = Date.now();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries }),
    };
  } catch (error) {
    console.error('Leaderboard error:', error);
    
    // Return cached data if available
    if (cachedData.length > 0) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: cachedData }),
      };
    }
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to fetch leaderboard', details: String(error) }),
    };
  }
};
