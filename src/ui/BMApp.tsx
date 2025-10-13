import { useMemo } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { base } from 'viem/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { BMInterface } from './BMInterface';

export function BMApp() {
    const queryClient = useMemo(() => new QueryClient(), []);
    const config = useMemo(() => createConfig({
        chains: [base],
        transports: { [base.id]: http(import.meta.env.VITE_RPC_URL) },
        connectors: [injected()],
    }), []);

    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <OnchainKitProvider 
                    apiKey="YpFjb8rh9RuzhmGWxT9kPZ1vVfRaAXym"
                    chain={base}
                    config={{
                        appearance: {
                            name: 'BM on Base',
                            mode: 'dark',
                            theme: 'default',
                        },
                        wallet: {
                            display: 'modal',
                        },
                    }}
                >
                    <BMInterface />
                </OnchainKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}


