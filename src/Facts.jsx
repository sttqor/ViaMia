import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useContent } from "./content-context";
import { useSettings } from "./settings-context";
import "./Facts.css";

// Тур для кнопки и мини-карты берётся из поля `expId` факта (см. data.js).
// Если его нет, кнопка ведёт на вкладку из fact.linkTab.

function FactHero({ fact, onClose }) {
    const { t } = useSettings();
    const [loaded, setLoaded] = useState(false);
    return (
        <div className="fact2-hero">
            <img src={fact.image} alt="" className={loaded ? "loaded" : ""} onLoad={() => setLoaded(true)} />
            <div className="fact2-hero-fade" />
            <button className="icon-btn fact2-close" onClick={onClose} aria-label={t("facts.close")}>
                <ChevronDown size={20} />
            </button>
            <div className="fact2-hero-text">
                <span className="fact-tag">{fact.tag}</span>
                <h2>{fact.emoji} {fact.title}</h2>
            </div>
        </div>
    );
}

function FactSheet({ index, setIndex, onClose, onOpenExp, onGoTo, MiniMap }) {
    const { t, loc } = useSettings();
    const { facts, byId } = useContent();
    const fact = loc(facts[index]);
    const expRaw = fact.expId ? byId(fact.expId) : undefined;
    const exp = loc(expRaw);
    const controls = useDragControls();
    const scrollRef = useRef(null);
    const [dir, setDir] = useState(1);

    const go = (next) => {
        if (next < 0 || next >= facts.length) return;
        setDir(next > index ? 1 : -1);
        setIndex(next);
    };

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowRight" && index < facts.length - 1) {
                setDir(1);
                setIndex(index + 1);
            }
            if (e.key === "ArrowLeft" && index > 0) {
                setDir(-1);
                setIndex(index - 1);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [index, onClose, setIndex, facts.length]);

    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "";
        };
    }, []);

    useEffect(() => {
        scrollRef.current?.scrollTo(0, 0);
    }, [index]);

    return (
        <motion.div
            className="fact2-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="fact2-sheet"
                role="dialog"
                aria-modal="true"
                aria-label={fact.title}
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 32, stiffness: 320 }}
                drag="y"
                dragControls={controls}
                dragListener={false}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.5 }}
                onDragEnd={(_, info) => {
                    if (info.offset.y > 110 || info.velocity.y > 600) onClose();
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="fact2-grip" onPointerDown={(e) => controls.start(e)}>
                    <span />
                </div>

                <div className="fact2-scroll" ref={scrollRef}>
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                            key={fact.id}
                            initial={{ opacity: 0, x: 28 * dir }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -28 * dir }}
                            transition={{ duration: 0.18 }}
                        >
                            <FactHero fact={fact} onClose={onClose} />
                            <div className="fact2-body">
                                {(fact.body || []).map((p) => (
                                    <p key={p}>{p}</p>
                                ))}

                                {fact.points?.length > 0 && (
                                    <>
                                        <h3>{t("facts.summary")}</h3>
                                        <ul>
                                            {fact.points.map((p) => (
                                                <li key={p}>{p}</li>
                                            ))}
                                        </ul>
                                    </>
                                )}

                                {exp && MiniMap && (
                                    <div className="fact2-map">
                                        <div className="fact2-map-title">📍 {exp.place}</div>
                                        <MiniMap lat={exp.lat} lng={exp.lng} label={exp.place} />
                                    </div>
                                )}

                                {(expRaw || fact.linkTab) && fact.linkLabel && (
                                    <button className="cta" onClick={() => (expRaw ? onOpenExp(expRaw) : onGoTo(fact.linkTab))}>
                                        {fact.linkLabel} →
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                <div className="fact2-nav">
                    <button className="icon-btn" onClick={() => go(index - 1)} disabled={index === 0} aria-label={t("facts.prev")}>
                        <ChevronLeft size={18} />
                    </button>
                    <div className="fact2-dots">
                        {facts.map((f, i) => (
                            <button key={f.id} className={i === index ? "on" : ""} onClick={() => go(i)} aria-label={t("facts.dot", { n: i + 1 })} />
                        ))}
                    </div>
                    <button
                        className="icon-btn"
                        onClick={() => go(index + 1)}
                        disabled={index === facts.length - 1}
                        aria-label={t("facts.next")}
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// Факты как сторис: одна большая карточка, свайп или тап по краям листает,
// полоски сверху показывают, где вы сейчас
export function FactsSection({ onGoTo, onOpenExp, MiniMap }) {
    const { t, loc } = useSettings();
    const { facts } = useContent();
    const [index, setIndex] = useState(null);
    const [slide, setSlide] = useState(0);
    const [dir, setDir] = useState(1);
    const dragged = useRef(false);

    const current = Math.min(slide, Math.max(facts.length - 1, 0));
    const move = (step) => {
        const next = current + step;
        if (next < 0 || next >= facts.length) return;
        setDir(step);
        setSlide(next);
    };
    const tap = (step) => {
        if (dragged.current) return;
        move(step);
    };
    const f = facts[current] ? loc(facts[current]) : null;

    return (
        <section className="fact2-section">
            {f && (
                <div className="story" aria-roledescription="carousel" aria-label={t("facts.title")}>
                    <AnimatePresence initial={false}>
                        <motion.div
                            key={f.id}
                            className="story-slide"
                            initial={{ opacity: 0, x: 32 * dir }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 36 }}
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0.18}
                            onDragStart={() => {
                                dragged.current = true;
                            }}
                            onDragEnd={(_, info) => {
                                setTimeout(() => {
                                    dragged.current = false;
                                }, 0);
                                if (info.offset.x < -50 || info.velocity.x < -500) move(1);
                                else if (info.offset.x > 50 || info.velocity.x > 500) move(-1);
                            }}
                        >
                            <img src={f.image} alt="" draggable={false} />
                            <div className="story-fade" />
                            <button className="story-zone left" onClick={() => tap(-1)} aria-label={t("facts.prev")} disabled={current === 0} />
                            <button
                                className="story-zone right"
                                onClick={() => tap(1)}
                                aria-label={t("facts.next")}
                                disabled={current === facts.length - 1}
                            />
                            <div className="story-text">
                                <span className="fact-tag">{f.tag}</span>
                                <h2>{f.emoji} {f.title}</h2>
                                <p>{f.short}</p>
                                <button className="cta story-read" onClick={() => setIndex(current)}>
                                    {t("facts.read")} →
                                </button>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                    <div className="story-bars">
                        {facts.map((x, i) => (
                            <span key={x.id} className={i <= current ? "on" : ""} />
                        ))}
                    </div>
                    <span className="story-kicker">{t("facts.kicker")} · {current + 1}/{facts.length}</span>
                </div>
            )}

            {createPortal(
            <AnimatePresence>
                {index !== null && facts[index] && (
                    <FactSheet
                        index={index}
                        setIndex={setIndex}
                        onClose={() => setIndex(null)}
                        onOpenExp={(exp) => {
                            setIndex(null);
                            onOpenExp(exp);
                        }}
                        onGoTo={(tab) => {
                            setIndex(null);
                            onGoTo(tab);
                        }}
                        MiniMap={MiniMap}
                    />
                )}
            </AnimatePresence>,
            document.body
            )}
        </section>
    );
}
