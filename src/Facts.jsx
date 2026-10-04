import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { EXPERIENCES, FACTS } from "./data";
import "./facts.css";

// Какой тур открывать по кнопке в факте (id из EXPERIENCES).
// Если факта здесь нет, кнопка ведёт на вкладку из fact.linkTab.
const FACT_TO_EXP = {
    "older-than-rome": "sulaiman",
    devzira: "cooking",
    "jaima-bazaar": "bazaar",
};

const small = (url) => url.replace("w=1200", "w=320");

function FactHero({ fact, onClose }) {
    const [loaded, setLoaded] = useState(false);
    return (
        <div className="fact2-hero">
            <img src={fact.image} alt="" className={loaded ? "loaded" : ""} onLoad={() => setLoaded(true)} />
            <div className="fact2-hero-fade" />
            <button className="icon-btn fact2-close" onClick={onClose} aria-label="Закрыть">
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
    const fact = FACTS[index];
    const exp = EXPERIENCES.find((e) => e.id === FACT_TO_EXP[fact.id]);
    const controls = useDragControls();
    const scrollRef = useRef(null);
    const dir = useRef(1);

    const go = (next) => {
        if (next < 0 || next >= FACTS.length) return;
        dir.current = next > index ? 1 : -1;
        setIndex(next);
    };

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowRight") go(index + 1);
            if (e.key === "ArrowLeft") go(index - 1);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    });

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
                            initial={{ opacity: 0, x: 28 * dir.current }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -28 * dir.current }}
                            transition={{ duration: 0.18 }}
                        >
                            <FactHero fact={fact} onClose={onClose} />
                            <div className="fact2-body">
                                {fact.body.map((p) => (
                                    <p key={p}>{p}</p>
                                ))}

                                <h3>Коротко о главном</h3>
                                <ul>
                                    {fact.points.map((p) => (
                                        <li key={p}>{p}</li>
                                    ))}
                                </ul>

                                {exp && MiniMap && (
                                    <div className="fact2-map">
                                        <div className="fact2-map-title">📍 {exp.place}</div>
                                        <MiniMap lat={exp.lat} lng={exp.lng} label={exp.place} />
                                    </div>
                                )}

                                <button className="cta" onClick={() => (exp ? onOpenExp(exp) : onGoTo(fact.linkTab))}>
                                    {fact.linkLabel} →
                                </button>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                <div className="fact2-nav">
                    <button className="icon-btn" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Предыдущий факт">
                        <ChevronLeft size={18} />
                    </button>
                    <div className="fact2-dots">
                        {FACTS.map((f, i) => (
                            <button key={f.id} className={i === index ? "on" : ""} onClick={() => go(i)} aria-label={`Факт ${i + 1}`} />
                        ))}
                    </div>
                    <button
                        className="icon-btn"
                        onClick={() => go(index + 1)}
                        disabled={index === FACTS.length - 1}
                        aria-label="Следующий факт"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

export function FactsSection({ onGoTo, onOpenExp, MiniMap }) {
    const [index, setIndex] = useState(null);

    return (
        <section className="fact2-section">
            <h2>Интересные факты</h2>
            <div className="fact2-list">
                {FACTS.map((f, i) => (
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
                ))}
            </div>

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
            </AnimatePresence>
        </section>
    );
}