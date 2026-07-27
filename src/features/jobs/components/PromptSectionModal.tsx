import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X } from 'lucide-react';
import '../styles/prompt-section-modal.css';

interface PromptSectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (prompt: string) => Promise<void>;
    isGenerating: boolean;
    threshold?: number;
}

export function PromptSectionModal({ isOpen, onClose, onGenerate, isGenerating, threshold = 150 }: PromptSectionModalProps) {
    const [prompt, setPrompt] = useState('');
    const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    const openTimeRef = useRef(0);
    const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Reset prompt and trigger visibility transition on mount
    useEffect(() => {
        if (isOpen) {
            setPrompt('');
            // A tiny timeout to let layout construct before sliding up
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 50);
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
        }
    }, [isOpen]);

    // Track scroll position to hide modal at bottom of the page
    useEffect(() => {
        if (!isOpen) return;

        const handleScroll = () => {
            const totalHeight = document.documentElement.scrollHeight;
            const scrollPosition = window.innerHeight + window.scrollY;
            const scrollableDistance = totalHeight - window.innerHeight;

            // Only hide if the page is actually scrollable beyond the threshold
            if (scrollableDistance > threshold && totalHeight - scrollPosition <= threshold) {
                setIsScrolledToBottom(true);
            } else {
                setIsScrolledToBottom(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll();
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [isOpen, threshold]);

    // Helper to start/reset animation for a specific duration
    const triggerAnimation = (durationMs: number) => {
        if (animationTimeoutRef.current) {
            clearTimeout(animationTimeoutRef.current);
        }
        setIsAnimating(true);
        animationTimeoutRef.current = setTimeout(() => {
            setIsAnimating(false);
            animationTimeoutRef.current = null;
        }, durationMs);
    };

    // Trigger animation on open for 3 seconds
    useEffect(() => {
        if (isOpen) {
            openTimeRef.current = Date.now();
            triggerAnimation(3000);
        } else {
            setIsAnimating(false);
            if (animationTimeoutRef.current) {
                clearTimeout(animationTimeoutRef.current);
                animationTimeoutRef.current = null;
            }
        }
    }, [isOpen]);

    // Trigger animation on typing, keeping it running for at least 1 second after typing stops
    // (or until the initial 3 seconds open duration completes, whichever is longer)
    useEffect(() => {
        if (!isOpen) return;
        if (prompt === '') return; // Don't trigger typing animation on open reset

        const elapsed = Date.now() - openTimeRef.current;
        const remainingOpenTime = 3000 - elapsed;
        const delay = Math.max(1000, remainingOpenTime);

        triggerAnimation(delay);
    }, [prompt, isOpen]);

    // Clean up timeouts on unmount
    useEffect(() => {
        return () => {
            if (animationTimeoutRef.current) {
                clearTimeout(animationTimeoutRef.current);
            }
        };
    }, []);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || isGenerating) return;
        onGenerate(prompt);
    };

    return (
        <div className="prompt-modal-wrapper">
            <form
                onSubmit={handleSubmit}
                className={`prompt-modal-container ${isVisible ? 'is-visible' : ''} ${isScrolledToBottom ? 'hidden-bottom' : ''} ${isAnimating ? 'animating' : ''}`}
            >
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close AI job prompt"
                    className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                    <X size={16} />
                </button>
                <textarea
                    id="guide-prompt-textarea"
                    className="prompt-textarea"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe the job role and requirements to generate..."
                    disabled={isGenerating}
                    rows={5}
                />

                <div id="guide-prompt-suggestions" className="prompt-suggestions">
                    <button
                        type="button"
                        onClick={() => setPrompt("Need a Senior Frontend React Developer to build a highly responsive and animated e-commerce dashboard. The candidate must have 4+ years of professional experience with React, TypeScript, Tailwind CSS, and state management libraries like Redux or Zustand. The project requires integrating complex REST APIs, implementing lazy loading, and optimizing page load speeds. Budget is $3000 max. Remote work is fine.")}
                        className="suggestion-pill"
                        disabled={isGenerating}
                    >
                        Web Dev
                    </button>
                    <button
                        type="button"
                        onClick={() => setPrompt("Looking for an experienced UI/UX Designer to design high-fidelity mobile screens for a fintech wallet application (iOS and Android). Responsibilities include conducting user research, creating wireframes, building a scalable design system in Figma, and providing interactive prototypes with micro-animations. Deliverables: Figma design files and developer hand-off assets.")}
                        className="suggestion-pill"
                        disabled={isGenerating}
                    >
                        UI/UX Design
                    </button>
                    <button
                        type="button"
                        onClick={() => setPrompt("Looking for a Technical Copywriter/Content Writer to write 5 SEO-optimized, highly engaging blog posts (1,500 words each) targeting software engineers and tech startups. Topics will cover modern web development architectures, React performance optimization tips, and cloud database comparisons. Must write in clear English, structure articles with headers/bullet points, and insert code snippets where appropriate.")}
                        className="suggestion-pill"
                        disabled={isGenerating}
                    >
                        Copywriting
                    </button>
                </div>

                <button
                    id="guide-prompt-generate-btn"
                    type="submit"
                    disabled={!prompt.trim() || isGenerating}
                    className="prompt-ai-submit-btn"
                >
                    {isGenerating ? (
                        <div className="prompt-spinner" />
                    ) : (
                        <>
                            <span>Generate Job</span>
                            <Sparkles size={12} />
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}

