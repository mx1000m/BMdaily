export const bmContractAddress = ('0x47EAd660725c7821c7349DF42579dBE857c02715') as `0x${string}`;

export const bmAbi = [
  { type: 'function', name: 'bm', inputs: [], outputs: [], stateMutability: 'payable' },
  {
    type: 'function',
    name: 'bmTo',
    inputs: [
      { name: 'recipient', type: 'address', internalType: 'address' },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'lastBM',
    inputs: [{ name: 'user', type: 'address', internalType: 'address' }],
    outputs: [{ name: 'lastBM', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'bmCount',
    inputs: [{ name: 'user', type: 'address', internalType: 'address' }],
    outputs: [{ name: 'count', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'totalBmCount',
    inputs: [],
    outputs: [{ name: 'total', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
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
    name: 'treasury',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'FEE_WEI',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

export const calls = [
  {
    address: bmContractAddress,
    abi: bmAbi,
    functionName: 'bm' as const,
    args: [] as const,
    value: 2_000_000_000_000n, // 0.000002 ETH
  },
];