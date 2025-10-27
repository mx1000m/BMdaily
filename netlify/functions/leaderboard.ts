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

export const handler = async (event: any) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const publicClient = createPublicClient({
      chain: base,
      transport: http(),
    });

    // Get recent BM events from last 30 days (faster than scanning all history)
    const currentBlock = await publicClient.getBlockNumber();
    const blocksToScan = 30 * 24 * 60 * 4; // ~30 days worth of blocks (1 block per 15s on Base)
    const fromBlock = currentBlock - BigInt(blocksToScan);

    const events = await publicClient.getLogs({
      address: bmContractAddress,
      event: bmAbi[0],
      fromBlock,
      toBlock: currentBlock,
    });

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

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries }),
    };
  } catch (error) {
    console.error('Leaderboard error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to fetch leaderboard', details: String(error) }),
    };
  }
};

