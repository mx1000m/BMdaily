import { Component, ReactNode, Suspense, lazy } from 'react';
import { base } from 'viem/chains';

const OnchainKitProviderLazy = lazy(() => import('@coinbase/onchainkit').then(m => ({ default: m.OnchainKitProvider })));
const ConnectWalletLazy = lazy(() => import('@coinbase/onchainkit/wallet').then(m => ({ default: m.ConnectWallet })));
const NameLazy = lazy(() => import('@coinbase/onchainkit/identity').then(m => ({ default: m.Name })));

class OckBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
	constructor(props: { children: ReactNode }) {
		super(props);
		this.state = { hasError: false };
	}
	static getDerivedStateFromError() { return { hasError: true }; }
	render() { return this.state.hasError ? null : this.props.children; }
}

export function SafeWalletModal({ apiKey }: { apiKey: string }) {
	return (
		<OckBoundary>
			<Suspense fallback={null}>
                <OnchainKitProviderLazy
                    apiKey={apiKey}
                    chain={base}
                    config={{
                        appearance: {
                            name: 'Base Blocks',
                            mode: 'dark',
                            theme: 'default',
                        },
                        wallet: { display: 'modal' },
                    }}
                >
                    <ConnectWalletLazy className="ock-btn" />
                </OnchainKitProviderLazy>
			</Suspense>
		</OckBoundary>
	);
}

export function SafeWalletShell({ apiKey, address }: { apiKey: string; address?: `0x${string}` }) {
	return (
		<OckBoundary>
			<Suspense fallback={null}>
				<OnchainKitProviderLazy
					apiKey={apiKey}
					chain={base}
					config={{ appearance: { name: 'Base Blocks', mode: 'dark', theme: 'default' }, wallet: { display: 'modal' } }}
				>
					<div className="wallet-row">
						<ConnectWalletLazy className="ock-btn" />
						{address ? <NameLazy address={address} chain={base} /> : null}
					</div>
				</OnchainKitProviderLazy>
			</Suspense>
		</OckBoundary>
	);
}


