import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Wallet, ConnectWallet } from '@coinbase/onchainkit/wallet';
import { useAccount, useWriteContract, useChainId, useSwitchChain, useReadContract, useConnect } from 'wagmi';
import { base } from 'viem/chains';
import { bmContractAddress, bmAbi } from '../calls/bm';
import baseLogo from '../../Base_Logo.png';
import { Identity, Avatar, Name, Address } from '@coinbase/onchainkit/identity';

export function BMInterface() {
    const { isConnected } = useAccount();
    const { connectAsync } = useConnect();
    const { writeContractAsync } = useWriteContract();
    const chainId = useChainId();
    const { switchChainAsync } = useSwitchChain();
    const [isSending, setIsSending] = useState(false);
    const valueWei = useMemo(() => 2_000_000_000_000n, []);
    const dayMs = 24 * 60 * 60 * 1000;

    const { address } = useAccount();
    const [fcName, setFcName] = useState<string | null>(null);
    const [fcPfp, setFcPfp] = useState<string | null>(null);
    
    // Leaderboard state
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [leaderboardData, setLeaderboardData] = useState<Array<{ address: string; count: number; name?: string }>>([]);
    const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

    // Mobile-only dynamic width for identity card (grow to keep name in one line)
    const idWrapRef = useRef<HTMLDivElement | null>(null);
    const [mobileIdWidth, setMobileIdWidth] = useState<number | undefined>(undefined);
    const adjustIdentityWidth = useCallback(() => {
        try {
            if (typeof window === 'undefined') return;
            const isMobile = window.innerWidth <= 768;
            if (!isMobile) { setMobileIdWidth(undefined); return; }
            const wrap = idWrapRef.current;
            if (!wrap) return;
            const nameEl = wrap.querySelector('[data-testid="name"]') as HTMLElement | null;
            if (!nameEl) return;
            const current = wrap.clientWidth;
            // Estimate extra width for avatar + margins inside the card
            const extra = 110; // px
            const desired = Math.ceil(nameEl.scrollWidth + extra);
            const maxW = Math.floor(window.innerWidth * 0.96);
            const clamped = Math.min(desired, maxW);
            if (clamped > current + 2) {
                setMobileIdWidth(clamped);
            } else if (clamped < current - 20) {
                // shrink back if plenty of space
                setMobileIdWidth(clamped);
            }
        } catch {}
    }, []);
    useEffect(() => {
        const t1 = setTimeout(adjustIdentityWidth, 150);
        const t2 = setTimeout(adjustIdentityWidth, 500);
        const t3 = setTimeout(adjustIdentityWidth, 1200);
        window.addEventListener('resize', adjustIdentityWidth);
        return () => {
            clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
            window.removeEventListener('resize', adjustIdentityWidth);
        };
    }, [address, adjustIdentityWidth]);

    // Prompt to add Mini App (enables notifications flow) and fetch Farcaster profile if present
    useEffect(() => {
        (async () => {
            try {
                const mod = await import(/* @vite-ignore */ 'https://esm.sh/@farcaster/miniapp-sdk');
                const isMini = await mod.sdk.isInMiniApp();
                if (isMini) {
                    // Gentle prompt to add mini app so user can enable notifications
                    try { await mod.sdk.actions.addMiniApp?.(); } catch {}
                }
                const viewer = await mod.sdk.getViewer?.();
                const fid = viewer?.fid;
                if (!fid) return;
                const resp = await fetch(`/.netlify/functions/farcaster-profile?fid=${fid}`);
                if (!resp.ok) return;
                const data = await resp.json();
                setFcName(data?.name || data?.username || null);
                setFcPfp(data?.pfp || null);
            } catch {}
        })();
    }, []);

    // Confetti loader (lazy load once)
    const confettiLoadedRef = useRef(false);
    const loadConfettiLib = useCallback(async () => {
        if (confettiLoadedRef.current) return;
        if (typeof (window as any).confetti === 'function') { confettiLoadedRef.current = true; return; }
        await new Promise<void>((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';
            s.async = true;
            s.onload = () => { confettiLoadedRef.current = true; resolve(); };
            s.onerror = () => reject(new Error('confetti-load-failed'));
            document.body.appendChild(s);
        });
    }, []);
    const fireConfetti = useCallback(async () => {
        await loadConfettiLib();
        const confetti = (window as any).confetti as ((opts: any) => void) | undefined;
        if (!confetti) return;
        const colors = ['#0052FF', '#1e66ff', '#3962aa', '#7fa8ff', '#93a4d2'];
        confetti({ particleCount: 120, spread: 60, startVelocity: 35, gravity: 0.9, ticks: 200, origin: { x: 0.5, y: 0.6 }, colors });
        setTimeout(() => confetti({ particleCount: 90, spread: 100, startVelocity: 45, gravity: 0.9, ticks: 180, origin: { x: 0.5, y: 0.3 }, colors }), 120);
        // Show share popup after confetti
        setTimeout(() => setShowSharePopup(true), 1000);
    }, [loadConfettiLib]);

    // Talent Protocol Builder Score
    const [builderScore, setBuilderScore] = useState<number | null>(null);
    const [builderScoreLoading, setBuilderScoreLoading] = useState(false);
    useEffect(() => {
        async function loadScore() {
            if (!address) { setBuilderScore(null); return; }
            try {
                setBuilderScoreLoading(true);
                const apiKey = (import.meta.env.VITE_TALENT_API_KEY as string);
                const headers = { 'X-API-KEY': apiKey, 'Accept': 'application/json' } as Record<string, string>;
                const url = `https://api.talentprotocol.com/score?id=${address}&account_source=wallet&scorer_slug=builder_score`;
                const res = await fetch(url, { headers });
                if (!res.ok) { setBuilderScore(null); return; }
                const data = await res.json();
                const points = (data && data.score && typeof data.score.points === 'number') ? data.score.points : null;
                setBuilderScore(points);
            } catch (e) {
                setBuilderScore(null);
            } finally {
                setBuilderScoreLoading(false);
            }
        }
        void loadScore();
    }, [address]);

    // Reset optimistic timer/count when wallet disconnects
    useEffect(() => {
        if (!isConnected) { setLastBmLocalTs(null); setUserBmCountDelta(0); }
    }, [isConnected]);

    // Onchain reads
    const { data: lastBmTs } = useReadContract({
        address: bmContractAddress,
        abi: bmAbi,
        functionName: 'lastBM',
        args: address ? [address] : undefined,
        query: { enabled: Boolean(address) },
    });

    const { data: userBmCount } = useReadContract({
        address: bmContractAddress,
        abi: bmAbi,
        functionName: 'bmCount',
        args: address ? [address] : undefined,
        query: { enabled: Boolean(address) },
    });

    const { data: totalBmCount } = useReadContract({
        address: bmContractAddress,
        abi: bmAbi,
        functionName: 'totalBmCount',
    });

    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    const [lastBmLocalTs, setLastBmLocalTs] = useState<number | null>(null);
    const [userBmCountDelta, setUserBmCountDelta] = useState(0);

    const remainingMs = useMemo(() => {
        const chainLast = typeof lastBmTs === 'bigint' ? Number(lastBmTs) * 1000 : 0;
        const effectiveLast = lastBmLocalTs ?? chainLast;
        const resetAt = effectiveLast + dayMs;
        return Math.max(0, resetAt - now);
    }, [lastBmTs, lastBmLocalTs, now]);

    const remainingText = useMemo(() => {
        const s = Math.ceil(remainingMs / 1000);
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
    }, [remainingMs]);

    // When cooldown ends, schedule a server-side notification (if user enabled it)
    useEffect(() => {
        (async () => {
            try {
                if (!address || typeof lastBmTs !== 'bigint') return;
                const mod = await import(/* @vite-ignore */ 'https://esm.sh/@farcaster/miniapp-sdk');
                const isMini = await mod.sdk.isInMiniApp();
                if (!isMini) return;
                const viewer = await mod.sdk.getViewer?.().catch(() => undefined);
                const fid = viewer?.fid;
                if (!fid) return;
                const last = Number(lastBmTs) * 1000;
                const nextAt = last + dayMs;
                const delay = nextAt - Date.now();
                if (delay <= 0) return;
                const timer = setTimeout(() => {
                    fetch('/.netlify/functions/send-notification', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            fid,
                            title: "Your next BM's ready.☕",
                            body: 'Tap to BM!',
                            targetUrl: window.location.origin,
                        })
                    }).catch(() => {});
                }, delay + 500);
                return () => clearTimeout(timer);
            } catch {}
        })();
    }, [address, lastBmTs]);

    const openWalletModal = useCallback(() => {
        const selectors = [
            '[data-testid="connect-wallet-button"]',
            'button[class*="connect-wallet"]',
            'button[class*="connect"]'
        ];
        for (const selector of selectors) {
            const el = document.querySelector(selector) as HTMLButtonElement | null;
            if (el) { el.click(); return; }
        }
        const hidden = document.getElementById('hidden-connect-wallet-container');
        const anyBtn = hidden?.querySelector('button') as HTMLButtonElement | null;
        anyBtn?.click();
    }, []);

    const connectFarcasterWallet = useCallback(async () => {
        try {
            const mod = await import(/* @vite-ignore */ 'https://esm.sh/@farcaster/miniapp-sdk');
            const isMini = await mod.sdk.isInMiniApp();
            if (!isMini) return false;
            const provider = await mod.sdk.wallet.getEthereumProvider();
            if (!provider) return false;
            (window as any).ethereum = provider; // ensure injected connector sees it
            // request accounts and connect via wagmi injected connector
            await provider.request?.({ method: 'eth_requestAccounts' });
            const { injected } = await import('wagmi/connectors');
            await connectAsync({ connector: injected() });
            return true;
        } catch {
            return false;
        }
    }, [connectAsync]);

    // If running inside Farcaster, auto-connect the integrated wallet on load
    useEffect(() => {
        if (!isConnected) {
            void connectFarcasterWallet();
        }
    }, [isConnected, connectFarcasterWallet]);

    // Fetch leaderboard data
    const fetchLeaderboard = useCallback(async () => {
        setIsLoadingLeaderboard(true);
        try {
            const response = await fetch('/.netlify/functions/leaderboard');
            const data = await response.json();
            setLeaderboardData(data.entries || []);
        } catch (error) {
            console.error('Failed to fetch leaderboard:', error);
            setLeaderboardData([]);
        } finally {
            setIsLoadingLeaderboard(false);
        }
    }, []);

    const handleLeaderboardClick = useCallback(() => {
        setShowLeaderboard(true);
        if (leaderboardData.length === 0) {
            void fetchLeaderboard();
        }
    }, [fetchLeaderboard, leaderboardData.length]);

    const sendBm = useCallback(async () => {
        if (!isConnected || isSending) return;
        try {
            setIsSending(true);
            if (chainId !== base.id) {
                await switchChainAsync({ chainId: base.id });
            }
            await writeContractAsync({ address: bmContractAddress, abi: bmAbi, functionName: 'bm', args: [], value: valueWei });
            setLastBmLocalTs(Date.now());
            setUserBmCountDelta((d) => d + 1);
            void fireConfetti();
            // Re-adjust width in case the header reflows after name/avatar updates
            setTimeout(adjustIdentityWidth, 100);
            // Schedule server-side notification if we have a fid
            try {
                const mod = await import(/* @vite-ignore */ 'https://esm.sh/@farcaster/miniapp-sdk');
                const isMini = await mod.sdk.isInMiniApp();
                if (isMini) {
                    const viewer = await mod.sdk.getViewer?.().catch(() => undefined);
                    const fid = viewer?.fid;
                    if (fid) {
                        await fetch('/.netlify/functions/schedule-save', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ fid, nextAt: Date.now() + dayMs }),
                        });
                        // also ensure the fid is in index via webhook path is already handled on enable
                    }
                }
            } catch {}
        } catch (_) {
        } finally {
            setIsSending(false);
        }
    }, [isConnected, isSending, writeContractAsync, valueWei, chainId, switchChainAsync, fireConfetti, adjustIdentityWidth]);

    const handleTap = useCallback(async () => {
        if (!isConnected) {
            const connected = await connectFarcasterWallet();
            if (!connected) { openWalletModal(); }
            return;
        }
        if (remainingMs > 0) return;
        void sendBm();
    }, [isConnected, remainingMs, sendBm, openWalletModal, connectFarcasterWallet]);

    const [isPressed, setIsPressed] = useState(false);
    const pressDown = () => setIsPressed(true);
    const pressUp = () => setIsPressed(false);

    // Share popup state
    const [showSharePopup, setShowSharePopup] = useState(false);

    return (
        <main className="app-main min-h-screen bg-black flex flex-col items-center justify-center p-6" style={{ position: 'relative', zIndex: 1 }}>
            {/* Leaderboard Button */}
            <button
                onClick={handleLeaderboardClick}
                style={{
                    position: 'absolute',
                    top: '20px',
                    left: '20px',
                    width: '48px',
                    height: '48px',
                    background: '#0052FF',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                }}
            >
                <img src="/leaderboard_button.png" alt="Leaderboard" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </button>

            {isConnected && address && (
                <div ref={idWrapRef} className="identity-card-mobile fix-top" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'stretch', width: mobileIdWidth ? `${mobileIdWidth}px` : undefined, transition: 'width 150ms ease' }}>
                    <Identity address={address as `0x${string}`} chain={base} className="text-white">
                        {fcPfp ? <img src={fcPfp} alt="pfp" style={{ width: 48, height: 48, borderRadius: '50%' }} /> : <Avatar />}
                        {fcName ? <span data-testid="name" style={{ fontWeight: 700 }}>{fcName}</span> : <Name />}
                        {!fcName && <Address />}
                    </Identity>
                    {/* Extension block visually attached under the identity card */}
                    <div
                        style={{
                            background: '#000000',
                            width: '100%',
                            marginTop: '0',
                            borderBottomLeftRadius: '10px',
                            borderBottomRightRadius: '10px',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderTop: 'none',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            padding: '8px 10px',
                        }}
                    >
                        {/* Row 1: Talent Protocol Builder Score */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <img src="/TalentProtocolLogo.png" alt="Talent Protocol" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                            <a href="https://app.talentprotocol.com/search" target="_blank" rel="noreferrer" className="link-underline" style={{ fontSize: '12px' }}>
                                Builder Score: <strong>{builderScoreLoading ? '—' : (builderScore ?? '—')}</strong>
                            </a>
                        </div>
                        {/* Row 2: BM count */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <img src="/LogoBM.png" alt="BM" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                            <span style={{ color: '#ffffff', fontSize: '12px' }}>Your BM count: <strong>{(typeof userBmCount === 'bigint' ? Number(userBmCount) : 0) + userBmCountDelta}</strong></span>
                        </div>
                    </div>
                </div>
            )}
            
            <img src={baseLogo} alt="Base logo" style={{ width: '219px', height: 'auto', marginTop: '0px', marginBottom: '24px' }} className="mobile-push-25 logo-mobile-offset logo-mobile-tight" />
            <div className="w-full max-w-md flex flex-col items-center gap-6 mobile-push-8">
                <Wallet>
                    <div id="hidden-connect-wallet-container" style={{ display: 'none' }}>
                        <ConnectWallet />
                    </div>
                </Wallet>

                <button
                    onClick={handleTap}
                    onMouseDown={pressDown}
                    onMouseUp={pressUp}
                    onMouseLeave={pressUp}
                    onTouchStart={pressDown}
                    onTouchEnd={pressUp}
                    disabled={isSending || remainingMs > 0}
                    className="select-none text-2xl font-bold disabled:opacity-40 disabled:cursor-not-allowed mobile-push-8 desktop-spacer"
                    style={{
                        width: '243px',
                        height: '243px',
                        border: '12px solid #ffffff',
                        borderRadius: '25px',
                        color: '#ffffff',
                        background: 'linear-gradient(140deg, #93a4d2 0%, #3962aa 40%, #0052ff 85%, #0052ff 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                        textTransform: 'uppercase',
                        transform: isPressed ? 'scale(0.9)' : 'scale(1)',
                        transition: 'transform 90ms ease-out'
                    }}
                >
                    {isSending ? 'Sending BM…' : remainingMs > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', textTransform: 'none', width: '100%', padding: '0 16px', boxSizing: 'border-box' }}>
                            <div style={{ fontSize: '18px', fontWeight: 700, lineHeight: 1.15, textAlign: 'center', width: '100%', wordBreak: 'break-word' }}>Brewing your next
                                <br />
                                Based Morning...
                            </div>
                            <div style={{ fontSize: '16px', opacity: 0.8 }}>{remainingText}</div>
                            <img src="/CoffeeCupAnimation.webp" alt="Brewing animation" style={{ width: '64px', height: '64px', objectFit: 'contain', marginTop: '2px', mixBlendMode: 'screen', pointerEvents: 'none', transform: 'scale(2)' }} />
                        </div>
                    ) : 'TAP TO BM'}
                </button>

                <div style={{ textAlign: 'center', color: '#ffffff' }} className="mobile-push-12">
                    <div style={{ fontWeight: 700, marginTop: '8px' }}>
                        Boost your daily Base TX count and hit a new contract.<span className="desktop-br"><br /></span> All for less than a penny (0,000002eth).
                    </div>
                    <div style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0', fontSize: '14px', fontWeight: 700, color: '#ffffff', cursor: 'default' }}>
                        <img src="/analytic.png" alt="Analytics" style={{ height: '1em', width: '1em', objectFit: 'contain' }} />
                        <span>Global BM count: {typeof totalBmCount === 'bigint' ? Number(totalBmCount) : 0}</span>
                    </div>
                </div>
            </div>

            {/* Share Popup Modal */}
            {showSharePopup && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: '#1a1a1a',
                        border: '2px solid #0052FF',
                        borderRadius: '15px',
                        padding: '30px',
                        maxWidth: '400px',
                        width: '100%',
                        textAlign: 'center',
                        boxShadow: '0 8px 32px rgba(0, 82, 255, 0.3)',
                        position: 'relative'
                    }}>
                        {/* Close X button */}
                        <button
                            onClick={() => setShowSharePopup(false)}
                            style={{
                                position: 'absolute',
                                top: '15px',
                                right: '15px',
                                background: 'transparent',
                                border: 'none',
                                color: '#ffffff',
                                fontSize: '24px',
                                cursor: 'pointer',
                                width: '30px',
                                height: '30px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '50%',
                                transition: 'background-color 0.2s ease'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            ×
                        </button>
                        <h2 style={{
                            color: '#ffffff',
                            fontSize: '24px',
                            fontWeight: 'bold',
                            margin: '0 0 20px 0',
                            textShadow: '0 0 10px #0052FF',
                            textAlign: 'center'
                        }}>
                            Share your BM
                        </h2>
                        
                        <p style={{
                            color: '#ffffff',
                            fontSize: '16px',
                            margin: '0 0 25px 0',
                            lineHeight: '1.4'
                        }}>
                            Share your BM while you wait for your next BM!
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'center', margin: '0 0 25px 0' }}>
                            <img 
                                src="/twitter_animation.gif" 
                                alt="BM Animation" 
                                style={{
                                    width: '200px',
                                    height: 'auto',
                                    borderRadius: '10px'
                                }}
                            />
                        </div>

                        <div style={{
                            display: 'flex',
                            gap: '15px',
                            justifyContent: 'center'
                        }}>
                            <button
                                onClick={() => {
                                    const tweetText = "Have you said your daily BM on @base yet?\n\nDon't forget to Tap to BM 👇👇 https://bmdaily.netlify.app/";
                                    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
                                    window.open(twitterUrl, '_blank');
                                }}
                                style={{
                                    backgroundColor: '#0052FF',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '12px 24px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(0, 82, 255, 0.3)',
                                    transition: 'transform 0.2s ease'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                Share on X
                            </button>
                            
                            <button
                                onClick={() => {
                                    const farcasterText = "Have you said your daily BM on @base.base.eth yet?\n\nDon't forget to Tap to BM 👇👇 https://bmdaily.netlify.app/";
                                    const farcasterUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(farcasterText)}&channelKey=base`;
                                    window.open(farcasterUrl, '_blank');
                                }}
                                style={{
                                    backgroundColor: '#7966bb',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '12px 24px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(121, 102, 187, 0.3)',
                                    transition: 'transform 0.2s ease'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                Share on Farcaster
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Leaderboard Modal */}
            {showLeaderboard && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '20px'
                }}
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        setShowLeaderboard(false);
                    }
                }}
                >
                    <div style={{
                        backgroundColor: '#1a1a1a',
                        border: '2px solid #0052FF',
                        borderRadius: '15px',
                        padding: '20px',
                        maxWidth: '500px',
                        width: '100%',
                        maxHeight: '80vh',
                        overflowY: 'auto',
                        boxShadow: '0 8px 32px rgba(0, 82, 255, 0.3)',
                        position: 'relative'
                    }}>
                        <h2 style={{
                            color: '#ffffff',
                            fontSize: '24px',
                            fontWeight: 'bold',
                            textAlign: 'center',
                            marginBottom: '20px',
                            textTransform: 'uppercase'
                        }}>
                            BM LEADERBOARD
                        </h2>

                        {isLoadingLeaderboard ? (
                            <div style={{ textAlign: 'center', color: '#ffffff', padding: '40px' }}>
                                Loading...
                            </div>
                        ) : (
                            <table style={{ width: '100%', color: '#ffffff', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
                                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>RANK</th>
                                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>ADDRESS</th>
                                        <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>BM COUNT</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leaderboardData.map((entry, index) => {
                                        const displayAddress = entry.name || 
                                            `${entry.address.substring(0, 5)}...${entry.address.substring(entry.address.length - 4)}`;
                                        return (
                                            <tr key={entry.address} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                                <td style={{ padding: '12px', fontWeight: 'bold' }}>{index + 1}</td>
                                                <td style={{ padding: '12px' }}>{displayAddress}</td>
                                                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>{entry.count}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}

                        <button
                            onClick={() => setShowLeaderboard(false)}
                            style={{
                                width: '100%',
                                marginTop: '20px',
                                backgroundColor: '#0052FF',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '12px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                textTransform: 'uppercase'
                            }}
                        >
                            CLOSE
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
}


