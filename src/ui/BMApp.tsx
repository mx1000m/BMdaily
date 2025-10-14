import { useEffect, useMemo } from 'react';
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

    // Notify Farcaster Mini App shell that the app is ready to display
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                // Dynamically import via CDN to avoid adding a new npm dep
                const mod = await import(/* @vite-ignore */ 'https://esm.sh/@farcaster/miniapp-sdk');
                if (!cancelled && mod?.sdk?.actions?.ready) {
                    await mod.sdk.actions.ready();
                }
            } catch (_) {
                // Ignore if not running inside a Farcaster Mini App context
            }
        })();
        return () => { cancelled = true; };
    }, []);

    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <OnchainKitProvider 
                    apiKey={(import.meta.env.VITE_ONCHAINKIT_API_KEY as string) || (import.meta.env.VITE_ONCHAINKIT_CLIENT_KEY as string) || 'YpFjb8rh9RuzhmGWxT9kPZ1vVfRaAXym'}
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


