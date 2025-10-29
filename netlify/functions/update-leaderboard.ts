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
}

interface LeaderboardData {
  lastUpdate: string;
  entries: LeaderboardEntry[];
}

// This function runs daily to update the leaderboard
export const handler = async (event: any) => {
  try {
    const alchemyUrl = process.env.ALCHEMY_BASE_RPC || 'https://base-mainnet.g.alchemy.com/v2/pBWWRwxvrlovShZdNr9M_';
    
    const publicClient = createPublicClient({
      chain: base,
      transport: http(alchemyUrl),
    });

    const currentBlock = await publicClient.getBlockNumber();
    const fromBlock = BigInt(36776590); // Contract deployment block
    
    console.log(`Fetching BM events from block ${fromBlock} to ${currentBlock}`);
    console.log(`This is a ${currentBlock - fromBlock} block range`);

    // Fetch events in batches of 1000 blocks (to work within API limits)
    const events: any[] = [];
    const batchSize = 1000;
    
    for (let block = fromBlock; block < currentBlock; block += BigInt(batchSize)) {
      const toBlock = block + BigInt(batchSize - 1) > currentBlock 
        ? currentBlock 
        : block + BigInt(batchSize - 1);
      
      try {
        const batchEvents = await publicClient.getLogs({
          address: bmContractAddress,
          event: bmAbi[0],
          fromBlock: block,
          toBlock,
        });
        events.push(...batchEvents);
        console.log(`Fetched blocks ${block}-${toBlock}: ${batchEvents.length} events`);
      } catch (error) {
        console.error(`Error fetching blocks ${block}-${toBlock}:`, error);
      }
    }

    console.log(`Total BM events found: ${events.length}`);

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
      .sort((a, b) => b.count - a.count);

    const leaderboardData: LeaderboardData = {
      lastUpdate: new Date().toISOString(),
      entries,
    };

    // Save to public JSON file
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.join(__dirname, '../../public/leaderboard.json');
    
    fs.writeFileSync(filePath, JSON.stringify(leaderboardData, null, 2));
    
    console.log(`Updated leaderboard with ${entries.length} entries`);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, entries: entries.length }),
    };
  } catch (error) {
    console.error('Error updating leaderboard:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: String(error) }),
    };
  }
};


