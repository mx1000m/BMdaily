import { useEffect, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppKitProvider } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { base } from 'viem/chains';
import { BMInterface } from './BMInterface';

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '096eec72f9692af97de14136a4d24054';

// Create wagmi adapter
const wagmiAdapter = new WagmiAdapter({
    projectId,
    networks: [base],
});

export function BMApp() {
    const queryClient = useMemo(() => new QueryClient(), []);

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
        <AppKitProvider
            adapters={[wagmiAdapter]}
            projectId={projectId}
            networks={[base]}
            metadata={{
                name: 'BM on Base',
                description: 'Send your daily BM on Base',
                url: 'https://bmdaily.netlify.app',
                icons: ['https://bmdaily.netlify.app/favicon.png'],
            }}
            features={{
                analytics: true,
                email: false,
                socials: [],
            }}
        >
            <QueryClientProvider client={queryClient}>
                <BMInterface />
            </QueryClientProvider>
        </AppKitProvider>
    );
}


