import { useEffect, useMemo, useState } from 'react';
import { Tetris } from '../vt100/Tetris';
import { Landing } from './Landing';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors'
import { base, baseSepolia } from 'viem/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FallingBackground } from './FallingBackground';

export function App() {
	const [view, setView] = useState<'landing' | 'game'>('landing');
	const queryClient = useMemo(() => new QueryClient(), []);
	const config = useMemo(() => createConfig({
		chains: [base, baseSepolia],
		transports: { [base.id]: http(), [baseSepolia.id]: http() },
		connectors: [injected()],
	}), []);
	useEffect(() => {
		function preventScroll(e: TouchEvent) {
			e.preventDefault();
		}
		document.addEventListener('touchmove', preventScroll, { passive: false });
		return () => document.removeEventListener('touchmove', preventScroll);
	}, []);
	return (
		<WagmiProvider config={config}>
			<QueryClientProvider client={queryClient}>
				<div className="app-root">
					<header className="app-header">
						<h1>Base Blocks</h1>
					</header>
					<main className="app-main">
						{view === 'landing' ? (
							<>
								<FallingBackground />
								<Landing onStartNewGame={() => setView('game')} />
							</>
						) : (
							<Tetris />
						)}
					</main>
				</div>
			</QueryClientProvider>
		</WagmiProvider>
	);
}




