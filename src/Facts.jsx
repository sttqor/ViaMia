import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { EXPERIENCES, FACTS } from "./data";
import { useSettings } from "./settings-context";
import "./Facts.css";

// Тур для кнопки и мини-карты берётся из поля `expId` факта (см. data.js).
// Если его нет, кнопка ведёт на вкладку из fact.linkTab.

const small = (url) => url.replace("w=1200", "w=320");

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
    const fact = loc(FACTS[index]);
    const expRaw = EXPERIENCES.find((e) => e.id === fact.expId);
    const exp = loc(expRaw);
    const controls = useDragControls();
    const scrollRef = useRef(null);
    const [dir, setDir] = useState(1);

    const go = (next) => {
        if (next < 0 || next >= FACTS.length) return;
        setDir(next > index ? 1 : -1);
        setIndex(next);
    };

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowRight" && index < FACTS.length - 1) {
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
    }, [index, onClose, setIndex]);

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
                        {FACTS.map((f, i) => (
                            <button key={f.id} className={i === index ? "on" : ""} onClick={() => go(i)} aria-label={t("facts.dot", { n: i + 1 })} />
                        ))}
                    </div>
                    <button
                        className="icon-btn"
                        onClick={() => go(index + 1)}
                        disabled={index === FACTS.length - 1}
                        aria-label={t("facts.next")}
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

export function FactsSection({ onGoTo, onOpenExp, MiniMap }) {
    const { t, loc } = useSettings();
    const [index, setIndex] = useState(null);

    return (
        <section className="fact2-section">
            <h2>{t("facts.title")}</h2>
            <div className="fact2-list">
                {FACTS.map((raw, i) => {
                    const f = loc(raw);
                    return (
                        <article
                            key={f.id}
                            className="card fact2-card"
                            role="button"
                            tabIndex={0}
                            onClick={() => setIndex(i)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") setIndex(i);
                            }}
                        >
                            <img className="fact2-thumb" src={small(f.image)} alt="" loading="lazy" />
                            <div className="fact2-text">
                                <span className="fact2-tag">{f.tag}</span>
                                <b>{f.emoji} {f.title}</b>
                                <p>{f.short}</p>
                            </div>
                            <ChevronRight size={16} color="var(--terracotta)" style={{ flexShrink: 0 }} />
                        </article>
                    );
                })}
            </div>

            {createPortal(
            <AnimatePresence>
                {index !== null && (
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
