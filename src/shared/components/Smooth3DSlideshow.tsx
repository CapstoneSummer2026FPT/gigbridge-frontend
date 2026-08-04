"use client";

import React, {
    useState,
    useEffect,
    useCallback,
    useRef,
    type CSSProperties,
} from "react";

const useIsStaticRenderer = () => false;

export interface Slide {
    id?: string;
    image?: { src?: string; srcSet?: string; alt?: string };
    title?: string;
    description?: string;
    projectUrl?: string;
}

export type AutoplayDir = "leftToRight" | "rightToLeft";
export type TitleCorner = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";

export interface Smooth3DSlideshowProps {
    slides?: Slide[];
    cardWidth?: number;
    cardHeight?: number;
    radius?: number;
    tilt?: number;
    sideTilt?: number;
    gap?: number;
    opacity?: number;
    transition?: any;
    autoplay?: boolean;
    autoplayDirection?: AutoplayDir;
    showTitle?: boolean;
    titleFont?: CSSProperties;
    titleColor?: string;
    titlePosition?: {
        position?: TitleCorner;
        paddingLeft?: number;
        paddingRight?: number;
        paddingTop?: number;
        paddingBottom?: number;
    };
    style?: CSSProperties;
    onCardClick?: (slide: Slide, index: number) => void;
}

const DEFAULT_SLIDES: Slide[] = [
    {
        image: {
            src: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60",
        },
        title: "E-Commerce Platform\nReact & ASP.NET",
        description: "A modern scalable online store platform with seamless payment integration.",
    },
    {
        image: {
            src: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=60",
        },
        title: "AI Analytics Dashboard\nTypeScript & Python",
        description: "Real-time analytics dashboard with AI-driven insights and interactive charts.",
    },
    {
        image: {
            src: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=60",
        },
        title: "Mobile Task App\nReact Native",
        description: "Cross-platform mobile workspace designed for high efficiency teams.",
    },
];

// Fixed internals
const PERSPECTIVE = 1600;
const SCALE_STEP = 0.16;
const MAX_VISIBLE = 2;
const DEPTH = 240;

function cssTransition(t: any): { dur: number; ease: string } {
    const dur = t && typeof t.duration === "number" ? t.duration : 0.6;
    let ease = "cubic-bezier(0.22, 1, 0.36, 1)";
    const e = t?.ease;
    if (Array.isArray(e) && e.length === 4) {
        ease = `cubic-bezier(${e[0]}, ${e[1]}, ${e[2]}, ${e[3]})`;
    } else if (typeof e === "string") {
        const map: Record<string, string> = {
            linear: "linear",
            easeIn: "ease-in",
            easeOut: "ease-out",
            easeInOut: "ease-in-out",
        };
        ease = map[e] || "ease";
    }
    return { dur, ease };
}

export function Smooth3DSlideshow(props: Smooth3DSlideshowProps) {
    const mergedProps = { ...COMPONENT_DEFAULTS, ...props };
    const {
        slides = DEFAULT_SLIDES,
        cardWidth = 400,
        cardHeight = 360,
        radius = 4,
        tilt = 12,
        sideTilt = 8,
        gap = 8,
        opacity = 60,
        transition,
        autoplay = false,
        autoplayDirection = "rightToLeft",
        showTitle = true,
        titleFont,
        titleColor = "#ffffff",
        titlePosition,
        style,
        onCardClick,
    } = mergedProps;

    const tp = titlePosition || {};
    const corner: TitleCorner = (tp.position as TitleCorner) || "bottomLeft";
    const isTop = corner === "topLeft" || corner === "topRight";
    const isRight = corner === "topRight" || corner === "bottomRight";
    const padLeft = tp.paddingLeft ?? 22;
    const padRight = tp.paddingRight ?? 22;
    const padTop = tp.paddingTop ?? 24;
    const padBottom = tp.paddingBottom ?? 24;

    const isStatic = useIsStaticRenderer();
    const list = slides && slides.length ? slides : DEFAULT_SLIDES;
    const n = list.length;

    const loop = true;
    const [active, setActive] = useState(0);

    useEffect(() => {
        setActive((a) => Math.max(0, Math.min(n - 1, a)));
    }, [n]);

    const moveDur =
        transition && typeof transition.duration === "number"
            ? transition.duration
            : 0.6;
    const lockRef = useRef(false);
    const lock = useCallback(() => {
        lockRef.current = true;
        window.setTimeout(
            () => {
                lockRef.current = false;
            },
            Math.max(50, moveDur * 1000)
        );
    }, [moveDur]);

    const step = useCallback(
        (dir: number) => {
            if (lockRef.current) return;
            lock();
            setActive((a) => (((a + dir) % n) + n) % n);
        },
        [n, lock]
    );

    const handleCardClick = useCallback(
        (i: number) => {
            if (isStatic || lockRef.current) return;
            lock();
            const slide = list[i];
            if (i === active) {
                if (onCardClick && slide) {
                    onCardClick(slide, i);
                } else if (slide?.projectUrl) {
                    window.open(slide.projectUrl, "_blank", "noopener,noreferrer");
                }
            } else {
                setActive(i);
            }
        },
        [isStatic, list, active, onCardClick, lock]
    );

    const delay =
        transition && typeof transition.delay === "number"
            ? transition.delay
            : 2.5;
    useEffect(() => {
        if (isStatic || !autoplay || n < 2) return;
        const ms = Math.max(0.3, delay) * 1000;
        const dir = autoplayDirection === "leftToRight" ? -1 : 1;
        const id = window.setInterval(() => step(dir), ms);
        return () => window.clearInterval(id);
    }, [isStatic, autoplay, autoplayDirection, delay, n, step]);

    const onKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "ArrowRight") {
                e.preventDefault();
                step(1);
            } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                step(-1);
            }
        },
        [step]
    );

    const { dur, ease } = cssTransition(transition);
    const transitionCss = `transform ${dur}s ${ease}, opacity ${dur}s ${ease}`;

    const effectiveRadius =
        (Math.max(0, Math.min(20, radius)) / 20) *
        (Math.min(cardWidth, cardHeight) / 2);
    const dim = 1 - Math.max(0, Math.min(100, opacity)) / 100;

    const rootStyle: CSSProperties = {
        ...(style || {}),
        position: "relative",
        width: "100%",
        height: cardHeight + 40,
        minWidth: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        perspective: `${PERSPECTIVE}px`,
        overflow: "hidden",
        outline: "none",
        userSelect: "none",
    };

    return (
        <div
            style={rootStyle}
            tabIndex={0}
            role="group"
            aria-roledescription="carousel"
            onKeyDown={isStatic ? undefined : onKeyDown}
        >
            {/* Control Arrows */}
            {n > 1 && (
                <>
                    <button
                        type="button"
                        onClick={() => step(-1)}
                        className="absolute left-3 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition hover:bg-black/70 border border-white/10"
                        aria-label="Previous slide"
                    >
                        ❮
                    </button>
                    <button
                        type="button"
                        onClick={() => step(1)}
                        className="absolute right-3 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition hover:bg-black/70 border border-white/10"
                        aria-label="Next slide"
                    >
                        ❯
                    </button>
                </>
            )}

            <div
                style={{
                    position: "relative",
                    width: cardWidth,
                    height: cardHeight,
                    transformStyle: "preserve-3d",
                }}
            >
                {list.map((slide, i) => {
                    let rel = i - active;
                    if (loop) {
                        if (rel > n / 2) rel -= n;
                        if (rel < -n / 2) rel += n;
                    }
                    const ax = Math.abs(rel);
                    const visible = ax <= MAX_VISIBLE;
                    const isActive = rel === 0;
                    const sc = Math.max(0.4, 1 - ax * SCALE_STEP);
                    const tx = rel * (gap * 30);
                    const tz = -ax * DEPTH;
                    const ry = -rel * tilt;
                    const rz = rel * sideTilt;
                    const src = slide.image?.src || "";

                    const cardStyle: CSSProperties = {
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        width: cardWidth,
                        height: cardHeight,
                        borderRadius: effectiveRadius,
                        overflow: "hidden",
                        transformStyle: "preserve-3d",
                        transformOrigin: "center center",
                        transform: `translate(-50%, -50%) translateX(${tx}px) translateZ(${tz}px) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${sc})`,
                        transition: transitionCss,
                        opacity: visible ? 1 : 0,
                        cursor: "pointer",
                        pointerEvents: visible && !isStatic ? "auto" : "none",
                        backgroundColor: "#12131a",
                        border: isActive ? "1.5px solid rgba(255,255,255,0.25)" : "1px solid rgba(255,255,255,0.08)",
                        boxShadow: isActive
                            ? "0 20px 40px -10px rgba(0,0,0,0.6), 0 0 20px rgba(73,75,231,0.2)"
                            : "0 10px 25px -10px rgba(0,0,0,0.4)",
                    };

                    return (
                        <div
                            key={slide.id || i}
                            style={cardStyle}
                            onClick={isStatic ? undefined : () => handleCardClick(i)}
                            aria-label={slide.title}
                            aria-hidden={!visible}
                        >
                            {src ? (
                                <img
                                    src={src}
                                    alt={slide.image?.alt || slide.title || ""}
                                    draggable={false}
                                    style={{
                                        position: "absolute",
                                        inset: 0,
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                        display: "block",
                                        userSelect: "none",
                                    }}
                                />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900/60 to-purple-950/80 p-6 text-center">
                                    <span className="text-4xl font-extrabold text-white/20">GB</span>
                                </div>
                            )}

                            {showTitle && (
                                <>
                                    <div
                                        style={{
                                            position: "absolute",
                                            inset: 0,
                                            background: isTop
                                                ? "linear-gradient(0deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.85) 100%)"
                                                : "linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.88) 100%)",
                                            pointerEvents: "none",
                                        }}
                                    />

                                    <div
                                        style={{
                                            position: "absolute",
                                            left: padLeft,
                                            right: padRight,
                                            [isTop ? "top" : "bottom"]: isTop ? padTop : padBottom,
                                            textAlign: isRight ? "right" : "left",
                                            pointerEvents: "none",
                                        }}
                                    >
                                        <span
                                            style={{
                                                color: titleColor,
                                                fontSize: 20,
                                                fontWeight: 700,
                                                lineHeight: "1.25em",
                                                letterSpacing: "-0.02em",
                                                whiteSpace: "pre-line",
                                                textShadow: "0 2px 10px rgba(0,0,0,0.6)",
                                                display: "block",
                                                ...(titleFont || {}),
                                            }}
                                        >
                                            {slide.title}
                                        </span>
                                        {slide.description && (
                                            <span className="mt-1 block text-xs text-white/80 line-clamp-2">
                                                {slide.description}
                                            </span>
                                        )}
                                    </div>
                                </>
                            )}

                            <div
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    background: "#000000",
                                    opacity: isActive ? 0 : dim,
                                    transition: `opacity ${dur}s ${ease}`,
                                    pointerEvents: "none",
                                }}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const COMPONENT_DEFAULTS = {
    slides: DEFAULT_SLIDES,
    cardWidth: 400,
    cardHeight: 360,
    radius: 4,
    tilt: 12,
    sideTilt: 8,
    gap: 8,
    opacity: 60,
    autoplay: false,
    autoplayDirection: "rightToLeft",
    transition: {
        type: "tween",
        duration: 0.6,
        delay: 2.5,
        ease: [0.22, 1, 0.36, 1],
    },
    showTitle: true,
    titleFont: {
        fontFamily: "Inter, sans-serif",
        fontWeight: "700",
        fontSize: "20px",
        letterSpacing: "-0.02em",
        lineHeight: "1.2em",
    } as any,
    titleColor: "#ffffff",
    titlePosition: {
        position: "bottomLeft",
        paddingLeft: 20,
        paddingRight: 20,
        paddingTop: 20,
        paddingBottom: 20,
    },
};

export default Smooth3DSlideshow;
