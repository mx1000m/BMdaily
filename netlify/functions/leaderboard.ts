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
  {
    type: 'function',
    name: 'bmCount',
    inputs: [{ name: 'user', type: 'address', internalType: 'address' }],
    outputs: [{ name: 'count', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

interface LeaderboardEntry {
  address: string;
  count: number;
  name?: string;
}

// Cache for leaderboard data (in-memory)
let cachedLeaderboard: LeaderboardEntry[] = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const handler = async (event: any) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Return cached data if available and not expired
  if (Date.now() - cacheTimestamp < CACHE_DURATION && cachedLeaderboard.length > 0) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries: cachedLeaderboard }),
    };
  }

  try {
    // Use Alchemy RPC endpoint for better reliability
    const alchemyUrl = process.env.ALCHEMY_BASE_RPC || 'https://base-mainnet.g.alchemy.com/v2/pBWWRwxvrlovShZdNr9M_';
    
    const publicClient = createPublicClient({
      chain: base,
      transport: http(alchemyUrl),
    });

    // Get recent BM events - but limit to 100 blocks to work with free tier
    const currentBlock = await publicClient.getBlockNumber();
    const fromBlock = currentBlock - BigInt(100); // Only last 100 blocks for free tier

    console.log(`Fetching events from block ${fromBlock} to ${currentBlock}`);

    // Fetch events in batches of 10 (Alchemy free tier limit)
    const events: any[] = [];
    const batchSize = 10;
    
    for (let startBlock = fromBlock; startBlock <= currentBlock; startBlock += BigInt(batchSize)) {
      const endBlock = startBlock + BigInt(batchSize - 1) > currentBlock 
        ? currentBlock 
        : startBlock + BigInt(batchSize - 1);
      
      try {
        const batchEvents = await publicClient.getLogs({
          address: bmContractAddress,
          event: bmAbi[0],
          fromBlock: startBlock,
          toBlock: endBlock,
        });
        events.push(...batchEvents);
      } catch (error) {
        console.error(`Error fetching blocks ${startBlock} to ${endBlock}:`, error);
        // Continue with other batches
      }
    }

    console.log(`Fetched ${events.length} BM events`);

    // Aggregate BM counts per user
    const counts = new Map<string, number>();
    for (const evt of events) {
      const addr = evt.args.user;
      if (addr) {
        counts.set(addr.toLowerCase(), (counts.get(addr.toLowerCase()) || 0) + 1);
      }
    }

    console.log(`Found ${counts.size} unique addresses`);

    // Convert to array and sort
    const entries: LeaderboardEntry[] = Array.from(counts.entries())
      .map(([address, count]) => ({ address, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10

    console.log(`Returning ${entries.length} leaderboard entries`);

    // Update cache
    cachedLeaderboard = entries;
    cacheTimestamp = Date.now();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries }),
    };
  } catch (error) {
    console.error('Leaderboard error:', error);
    
    // Return cached data even if stale if we have it
    if (cachedLeaderboard.length > 0) {
      console.log('Returning stale cached data due to error');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: cachedLeaderboard }),
      };
    }
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to fetch leaderboard', details: String(error) }),
    };
  }
};

