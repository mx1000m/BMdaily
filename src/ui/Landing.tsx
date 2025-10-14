import { useMemo } from 'react';
import { useAccount, useConnect } from 'wagmi';
import { SafeIdentityCard } from './SafeOnchainKit';
import { SafeWalletModal, SafeWalletShell } from './SafeWalletModal';

type Props = { onStartNewGame: () => void };

export function Landing({ onStartNewGame }: Props) {
	const { isConnected, address } = useAccount();
	const { connect, connectors, isPending } = useConnect();
	const injected = useMemo(() => connectors.find(c => c.id === 'injected'), [connectors]);

	return (
		<div className="landing-root">
			<h2 className="landing-title">Base Blocks</h2>
			<p className="landing-sub">Play directly in the Base app as a Mini App.</p>
			<div className="landing-card">
				<div className="wallet-row">
					{isConnected ? (
						<div className="wallet-address">
                            <SafeIdentityCard apiKey={import.meta.env.VITE_ONCHAINKIT_API_KEY} address={(address || '0x') as `0x${string}`} />
						</div>
					) : (
                        <SafeWalletShell apiKey={import.meta.env.VITE_ONCHAINKIT_API_KEY} />
					)}
				</div>
				<div className="actions">
					<button className="btn primary" onClick={onStartNewGame} disabled={!isConnected}>New Game</button>
					<button className="btn ghost" onClick={() => alert('Tutorial coming soon')}>Tutorial</button>
				</div>
			</div>
		</div>
	);
}


