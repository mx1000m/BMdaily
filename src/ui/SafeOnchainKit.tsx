import { Component, ReactNode, Suspense, lazy, useEffect, useState } from 'react';
import { base } from 'viem/chains';

const OnchainKitProviderLazy = lazy(() => import('@coinbase/onchainkit').then(m => ({ default: m.OnchainKitProvider })));
const NameLazy = lazy(() => import('@coinbase/onchainkit/identity').then(m => ({ default: m.Name })));
const IdentityCardLazy = lazy(() => import('@coinbase/onchainkit/identity').then(m => ({ default: m.IdentityCard })));
const AvatarLazy = lazy(() => import('@coinbase/onchainkit/identity').then(m => ({ default: m.Avatar })));
const AddressLazy = lazy(() => import('@coinbase/onchainkit/identity').then(m => ({ default: m.Address })));

type BasenameProps = { apiKey: string; address: `0x${string}` };

class OckBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
	constructor(props: { children: ReactNode }) {
		super(props);
		this.state = { hasError: false };
	}
	static getDerivedStateFromError() { return { hasError: true }; }
	render() { return this.state.hasError ? null : this.props.children; }
}

export function SafeName({ apiKey, address }: BasenameProps) {
    return (
        <OckBoundary>
            <Suspense fallback={null}>
                <OnchainKitProviderLazy apiKey={apiKey} chain={base}>
                    <NameLazy address={address} chain={base} />
                </OnchainKitProviderLazy>
            </Suspense>
        </OckBoundary>
    );
}

export function SafeIdentityCard({ apiKey, address }: BasenameProps) {
    return (
        <OckBoundary>
            <Suspense fallback={null}>
                <OnchainKitProviderLazy apiKey={apiKey} chain={base}>
                    <IdentityCardLazy address={address} chain={base} className="bb-identity" />
                </OnchainKitProviderLazy>
            </Suspense>
        </OckBoundary>
    );
}

export function SafeIdentityCompact({ apiKey, address }: BasenameProps) {
    return (
        <OckBoundary>
            <Suspense fallback={null}>
                <OnchainKitProviderLazy apiKey={apiKey} chain={base}>
                    <div className="bb-identity-row">
                        <AvatarLazy address={address} chain={base} />
                        <div className="bb-identity-col">
                            <NameLazy address={address} chain={base} />
                            <AddressLazy address={address} />
                        </div>
                    </div>
                </OnchainKitProviderLazy>
            </Suspense>
        </OckBoundary>
    );
}

function BasenameText({ address }: { address: `0x${string}` }) {
    const [name, setName] = useState<string | null>(null);
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const mod = await import('@coinbase/onchainkit/identity');
                const resolved = await mod.getName({ address, chain: base });
                if (!cancelled) setName(resolved ?? null);
            } catch (_) {
                if (!cancelled) setName(null);
            }
        })();
        return () => { cancelled = true; };
    }, [address]);
    if (!name) return null;
    return <>{name}</>;
}


