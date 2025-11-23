/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useRef, useState } from 'react';
import { ConnectButton } from '@mysten/dapp-kit';
import { useTestAccount } from './hooks/useTestWallet';

interface LandingPageProps {
    onEnter: () => void;
    onViewInventory?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter, onViewInventory }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const account = useTestAccount();
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                    }
                });
            },
            { threshold: 0.1 }
        );

        const elements = document.querySelectorAll('.scroll-reveal');
        elements.forEach((el) => observer.observe(el));

        return () => observer.disconnect();
    }, []);

    const toggleAudio = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleEnded = () => setIsPlaying(false);
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);

        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);

        return () => {
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
        };
    }, []);

    return (
        <div className="min-h-screen bg-brand-bg text-brand-dark font-mono overflow-x-hidden selection:bg-neon-pink selection:text-white">
            {/* Audio Player */}
            <audio
                ref={audioRef}
                src="/2025-11-23 22-43-08.mp3"
                preload="metadata"
            />

            {/* Audio Control Button - Fixed Position */}
            <div className="fixed top-6 left-6 z-50 flex items-center gap-3">
                <button
                    onClick={toggleAudio}
                    className="w-16 h-16 bg-neon-pink border-4 border-brand-dark shadow-hard hover:shadow-hard-lime hover:scale-110 transition-all duration-200 flex items-center justify-center group"
                    aria-label={isPlaying ? "Pause audio" : "Play audio"}
                >
                    {isPlaying ? (
                        <svg className="w-8 h-8 text-brand-dark" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                        </svg>
                    ) : (
                        <svg className="w-8 h-8 text-brand-dark ml-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    )}
                </button>

                {/* FigJam-style Annotation */}
                <div className="flex items-center gap-2">
                    {/* Arrow pointing from text to button (left direction) */}
                    <svg
                        className="w-6 h-6 text-brand-dark"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                    >
                        <path d="M16 12H0M6 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="bg-white border-2 border-brand-dark shadow-hard px-3 py-1.5 font-bold text-sm">
                        PLAY MUSIC
                    </div>
                </div>
            </div>

            {/* --- HERO SECTION --- */}
            <section className="min-h-screen flex flex-col items-center justify-center relative border-b-8 border-brand-dark overflow-hidden">
                {/* Background Noise/Grid */}
                <div className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(#111 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

                {/* Floating Elements */}
                <div className="absolute top-20 left-10 w-32 h-32 border-4 border-brand-dark shadow-hard animate-float-1 hidden md:block rotate-12 overflow-hidden bg-gray-800">
                    <img
                        src="/comics-7.jpeg"
                        alt="Comic 7"
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="absolute bottom-40 right-20 w-48 h-48 border-4 border-brand-dark shadow-hard-pink animate-float-2 hidden md:block -rotate-6 rounded-full overflow-hidden bg-gray-800">
                    <img
                        src="/comics-2.jpeg"
                        alt="Comic 2"
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-brutal-red border-4 border-brand-dark shadow-hard-sm animate-bounce-fast hidden lg:block rounded-none rotate-45"></div>

                {/* Main Title */}
                <div className="relative z-10 text-center mix-blend-hard-light">
                    <h1 className="font-display text-[12vw] md:text-[15vw] leading-[0.8] text-brand-dark drop-shadow-[8px_8px_0px_rgba(255,0,255,1)] hover:scale-105 transition-transform duration-300 cursor-default">
                        INFINITE
                    </h1>
                    <h1 className="font-display text-[12vw] md:text-[15vw] leading-[0.8] text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-neon-lime to-neon-pink drop-shadow-[8px_8px_0px_#111] hover:-rotate-2 transition-transform duration-300 cursor-default">
                        HEROES
                    </h1>
                </div>

                <p className="mt-8 font-bold text-xl md:text-3xl bg-white border-4 border-brand-dark shadow-hard px-6 py-2 rotate-2 animate-pulse-fast">
                    AI-AGENT DRIVEN COMIC PUBLISHING PROTOCOL ON SUI
                </p>

                {account ? (
                    <div className="mt-16 flex flex-col items-center gap-4">
                        <button
                            onClick={onEnter}
                            className="group relative inline-flex items-center justify-center px-12 py-6 text-3xl font-display font-bold text-white transition-all duration-200 bg-brand-dark border-4 border-brand-dark focus:outline-none focus:ring-4 focus:ring-neon-lime focus:ring-offset-4 hover:bg-neon-pink hover:text-brand-dark hover:shadow-hard-lime hover:-translate-y-2 active:translate-y-0 active:shadow-none"
                        >
                            <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-gray-700"></span>
                            <span className="relative">CREATE COMICS NOW</span>
                            <svg className="w-8 h-8 ml-4 transition-transform duration-200 group-hover:translate-x-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                        </button>
                        {onViewInventory && (
                            <button
                                onClick={onViewInventory}
                                className="px-8 py-3 text-xl font-display font-bold text-brand-dark transition-all duration-200 bg-neon-lime border-4 border-brand-dark shadow-hard hover:shadow-hard-pink hover:scale-105 hover:-translate-y-1"
                            >
                                📚 VIEW INVENTORY
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="mt-16 flex flex-col items-center gap-6">
                        <p className="text-xl font-bold bg-white border-4 border-brand-dark px-6 py-2 shadow-hard rotate-1">
                            CONNECT WALLET TO ENTER
                        </p>
                        <div className="scale-150 border-4 border-brand-dark shadow-hard hover:shadow-hard-pink transition-all">
                            <ConnectButton />
                        </div>
                        <p className="text-xs text-gray-500 font-mono mt-4">
                            Debug: {account ? `Connected: ${(account as any).address.slice(0, 6)}...` : "No Account Detected"}
                            (Test Mode: {localStorage.getItem("testMode") || "null"})
                        </p>
                    </div>
                )}
            </section>

            {/* --- ABOUT SECTION --- */}
            <section className="py-24 px-4 md:px-10 bg-white relative border-b-8 border-brand-dark">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-6xl md:text-8xl font-display mb-12 text-center scroll-reveal">
                        <span className="bg-neon-lime px-4 shadow-hard border-4 border-brand-dark">ABOUT</span>
                    </h2>

                    <div className="scroll-reveal bg-brand-bg border-4 border-brand-dark shadow-hard-xl p-8 md:p-12 mb-8">
                        <p className="text-xl md:text-2xl leading-relaxed mb-6">
                            Infinite Heroes is a decentralized application (dApp) built on the Sui Network that empowers users to become instant comic book creators.
                        </p>
                        <p className="text-lg md:text-xl leading-relaxed mb-6">
                            By orchestrating AI Agents for generative storytelling and leveraging Walrus Storage for decentralized, high-capacity media hosting, Infinite Heroes solves the "Prosumer Paradox" in Web3—giving users ownership of high-quality media assets without the prohibitive costs of on-chain storage or manual production.
                        </p>
                        <p className="text-lg md:text-xl leading-relaxed">
                            The platform transforms a simple user selfie into a stylized HeroAsset, which can then be inserted into infinite, AI-generated narratives. The final product is a ComicIssue—a Dynamic NFT (dNFT) that links verifiable ownership (Sui) with immutable, decentralized media hosting (Walrus).
                        </p>
                    </div>

                    {/* Tech Stack Icons */}
                    <div className="scroll-reveal flex flex-wrap justify-center items-center gap-8 md:gap-12">
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-20 h-20 bg-neon-blue border-4 border-brand-dark shadow-hard flex items-center justify-center text-4xl font-bold">⚡</div>
                            <span className="text-sm font-bold">SUI BLOCKCHAIN</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-20 h-20 bg-neon-pink border-4 border-brand-dark shadow-hard flex items-center justify-center text-4xl font-bold">🤖</div>
                            <span className="text-sm font-bold">AI AGENTS</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-20 h-20 bg-neon-lime border-4 border-brand-dark shadow-hard flex items-center justify-center text-4xl font-bold">🌊</div>
                            <span className="text-sm font-bold">WALRUS STORAGE</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-20 h-20 bg-neon-yellow border-4 border-brand-dark shadow-hard flex items-center justify-center text-4xl font-bold">🎨</div>
                            <span className="text-sm font-bold">DYNAMIC NFT</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- HOW IT WORKS SECTION --- */}
            <section className="py-24 px-4 md:px-10 bg-brand-bg relative border-b-8 border-brand-dark">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-6xl md:text-8xl font-display mb-16 text-center scroll-reveal">
                        <span className="bg-neon-pink px-4 shadow-hard border-4 border-brand-dark text-white">HOW IT WORKS</span>
                    </h2>

                    <div className="space-y-12">
                        {/* Step 1: Identity Tokenization */}
                        <div className="scroll-reveal bg-white border-4 border-brand-dark shadow-hard-xl p-8 md:p-10 hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all duration-200 group">
                            <div className="flex flex-col md:flex-row items-start gap-6">
                                <div className="w-20 h-20 bg-neon-pink border-4 border-brand-dark flex items-center justify-center text-4xl font-bold flex-shrink-0 group-hover:rotate-12 transition-transform">1</div>
                                <div className="flex-1">
                                    <h3 className="text-4xl md:text-5xl font-display mb-4">IDENTITY TOKENIZATION (THE CAST)</h3>
                                    <div className="space-y-4 text-lg md:text-xl">
                                        <div className="flex items-start gap-3">
                                            <span className="font-bold text-neon-pink">UPLOAD:</span>
                                            <span>The user uploads a photo (selfie or avatar).</span>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <span className="font-bold text-neon-pink">MINTING:</span>
                                            <span>The platform mints a HeroAsset NFT on Sui. The high-resolution source image is stored on Walrus, while the Sui object retains the BlobID and identity metadata.</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Step 2: Narrative Selection */}
                        <div className="scroll-reveal bg-neon-blue border-4 border-brand-dark shadow-hard-xl p-8 md:p-10 hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all duration-200 group" style={{ transitionDelay: '100ms' }}>
                            <div className="flex flex-col md:flex-row items-start gap-6">
                                <div className="w-20 h-20 bg-white border-4 border-brand-dark flex items-center justify-center text-4xl font-bold flex-shrink-0 group-hover:-rotate-12 transition-transform">2</div>
                                <div className="flex-1">
                                    <h3 className="text-4xl md:text-5xl font-display mb-4 text-brand-dark">NARRATIVE SELECTION</h3>
                                    <div className="space-y-4 text-lg md:text-xl text-brand-dark">
                                        <div className="flex items-start gap-3">
                                            <span className="font-bold">GENRE:</span>
                                            <span>Users select a narrative archetype (e.g., Cyberpunk Noir, High Fantasy, Space Opera).</span>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <span className="font-bold">MODE:</span>
                                            <span>Users toggle between "Action Mode" (visual focus) or "Novel Mode" (rich dialogue and plot depth).</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Step 3: Generation & Ownership */}
                        <div className="scroll-reveal bg-neon-yellow border-4 border-brand-dark shadow-hard-xl p-8 md:p-10 hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all duration-200 group" style={{ transitionDelay: '200ms' }}>
                            <div className="flex flex-col md:flex-row items-start gap-6">
                                <div className="w-20 h-20 bg-brand-dark border-4 border-brand-dark flex items-center justify-center text-4xl font-bold text-white flex-shrink-0 group-hover:rotate-180 transition-transform">3</div>
                                <div className="flex-1">
                                    <h3 className="text-4xl md:text-5xl font-display mb-4">GENERATION & OWNERSHIP</h3>
                                    <div className="space-y-4 text-lg md:text-xl">
                                        <p>The user clicks "Start Adventure".</p>
                                        <p>The AI Agent Swarm generates the script, consistency maps, and final panels.</p>
                                        <p className="font-bold">A ComicIssue NFT is delivered to the user's wallet, fully readable and tradable immediately via Sui Kiosk.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- TECHNOLOGY SECTION --- */}
            <section className="py-24 px-4 md:px-10 bg-white relative border-b-8 border-brand-dark">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-6xl md:text-8xl font-display mb-16 text-center scroll-reveal">
                        <span className="bg-neon-blue px-4 shadow-hard border-4 border-brand-dark text-white">TECHNOLOGY</span>
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                        {/* Sui Blockchain */}
                        <div className="scroll-reveal bg-brand-bg border-4 border-brand-dark shadow-hard-xl p-8 hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all duration-200 group">
                            <div className="w-16 h-16 bg-neon-blue border-4 border-brand-dark mb-6 flex items-center justify-center text-4xl font-bold group-hover:rotate-12 transition-transform">⚡</div>
                            <h3 className="text-3xl font-display mb-4">THE LEDGER: SUI BLOCKCHAIN (MOVE)</h3>
                            <p className="text-lg leading-relaxed mb-4">
                                Sui serves as the control plane for asset ownership, logic, and royalty enforcement.
                            </p>
                            <ul className="space-y-2 text-base">
                                <li className="flex items-start gap-2">
                                    <span className="font-bold">•</span>
                                    <span><strong>Object-Based Ownership:</strong> Unlike account-based chains, Sui's object model allows us to create ComicIssue assets that act as distinct containers for data.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="font-bold">•</span>
                                    <span><strong>Dynamic Fields:</strong> We utilize dynamic fields to track evolving metadata, such as read_count, sequel_links (connecting issues), and community_votes.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="font-bold">•</span>
                                    <span><strong>Kiosk Implementation:</strong> All assets are minted directly into a Sui Kiosk. This forces all secondary market trades to adhere to our defined TransferPolicy, guaranteeing royalties for the original HeroAsset creator.</span>
                                </li>
                            </ul>
                        </div>

                        {/* AI Agents */}
                        <div className="scroll-reveal bg-neon-pink border-4 border-brand-dark shadow-hard-xl p-8 hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all duration-200 group">
                            <div className="w-16 h-16 bg-white border-4 border-brand-dark mb-6 flex items-center justify-center text-4xl font-bold group-hover:-rotate-12 transition-transform">🤖</div>
                            <h3 className="text-3xl font-display mb-4 text-white">AI AGENT SWARM</h3>
                            <p className="text-lg leading-relaxed mb-4 text-white">
                                Content generation is handled by a coordinated swarm of specialized AI agents:
                            </p>
                            <ul className="space-y-4 text-base text-white">
                                <li className="flex items-start gap-2">
                                    <span className="font-bold">•</span>
                                    <div>
                                        <strong>Script Agent (LLM):</strong> Handles world-building, dialogue generation, and "Novel Mode" narrative depth.
                                    </div>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="font-bold">•</span>
                                    <div>
                                        <strong>Visual Agent (Image Gen):</strong> Utilizes the HeroAsset Walrus blob as a ControlNet reference to ensure the user's character remains consistent across different panels and poses.
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- GALLERY / MARQUEE REVERSE --- */}
            <section className="py-12 bg-brand-dark overflow-hidden border-y-8 border-neon-pink">
                <div className="animate-marquee-reverse whitespace-nowrap">
                    {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                        <div key={num} className="inline-block mx-4 w-64 h-64 border-4 border-white shadow-[8px_8px_0px_#CCFF00] relative group cursor-pointer hover:scale-105 transition-transform overflow-hidden bg-gray-800">
                            <img
                                src={`/comics-${num}.jpeg`}
                                alt={`Comic #${num}`}
                                className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                                onError={(e) => {
                                    // Fallback to placeholder if image fails to load
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const placeholder = target.parentElement?.querySelector('.placeholder');
                                    if (placeholder) {
                                        (placeholder as HTMLElement).style.display = 'flex';
                                    }
                                }}
                            />
                            <div className="placeholder absolute inset-0 flex items-center justify-center text-white font-display text-2xl opacity-50 group-hover:opacity-100" style={{ display: 'none' }}>
                                COMIC #{num}
                            </div>
                        </div>
                    ))}
                    {/* Duplicate for seamless loop */}
                    {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                        <div key={`duplicate-${num}`} className="inline-block mx-4 w-64 h-64 border-4 border-white shadow-[8px_8px_0px_#CCFF00] relative group cursor-pointer hover:scale-105 transition-transform overflow-hidden bg-gray-800">
                            <img
                                src={`/comics-${num}.jpeg`}
                                alt={`Comic #${num}`}
                                className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const placeholder = target.parentElement?.querySelector('.placeholder');
                                    if (placeholder) {
                                        (placeholder as HTMLElement).style.display = 'flex';
                                    }
                                }}
                            />
                            <div className="placeholder absolute inset-0 flex items-center justify-center text-white font-display text-2xl opacity-50 group-hover:opacity-100" style={{ display: 'none' }}>
                                COMIC #{num}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* --- CTA SECTION --- */}
            <section className="py-32 px-4 bg-neon-lime flex flex-col items-center justify-center text-center border-b-8 border-brand-dark">
                <h2 className="text-5xl md:text-7xl font-display mb-8 max-w-4xl leading-tight">
                    READY TO ENTER THE <span className="text-white text-stroke-black">MULTIVERSE?</span>
                </h2>
                {account ? (
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <button
                            onClick={onEnter}
                            className="text-2xl md:text-4xl font-bold bg-white border-4 border-brand-dark px-12 py-6 shadow-hard hover:bg-brand-dark hover:text-white hover:shadow-hard-pink transition-all hover:-rotate-2"
                        >
                            START GENERATING &rarr;
                        </button>
                        {onViewInventory && (
                            <button
                                onClick={onViewInventory}
                                className="text-xl md:text-2xl font-bold bg-brand-dark text-white border-4 border-white px-8 py-4 shadow-hard hover:bg-neon-pink hover:text-brand-dark hover:shadow-hard-lime transition-all hover:rotate-2"
                            >
                                📚 VIEW INVENTORY
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="scale-125 border-4 border-brand-dark shadow-hard bg-white">
                        <ConnectButton />
                    </div>
                )}
            </section>

            {/* --- FOOTER --- */}
            <footer className="bg-brand-dark text-white py-12 px-8 border-t-8 border-neon-blue font-mono text-sm">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="text-center md:text-left">
                        <div className="flex items-center gap-3 mb-2">
                            <img
                                src="/logo.png"
                                alt="Infinite Heroes Logo"
                                className="h-12 w-12 rounded-full object-cover"
                            />
                            <h4 className="text-2xl font-display text-neon-pink">INFINITE HEROES</h4>
                        </div>
                        <p className="text-gray-400 mb-2">AI-Agent Driven Comic Publishing Protocol on Sui</p>
                        <p className="text-gray-400">© 2025. All rights reserved.</p>
                    </div>
                    <div className="flex gap-6">
                        <button type="button" className="hover:text-neon-lime hover:underline bg-transparent border-none cursor-pointer font-mono text-sm">TWITTER</button>
                        <button type="button" className="hover:text-neon-lime hover:underline bg-transparent border-none cursor-pointer font-mono text-sm">DISCORD</button>
                        <button type="button" className="hover:text-neon-lime hover:underline bg-transparent border-none cursor-pointer font-mono text-sm">GITHUB</button>
                    </div>
                </div>
            </footer>

        </div>
    );
};
