import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useSpring,
  useTransform,
  useVelocity,
} from "framer-motion";
import "./TabBar.css";

// Нижняя панель в стиле iOS 26 (Liquid Glass):
// • стеклянная капсула, выбранная вкладка — «линза», которая перетекает между вкладками
// • можно зажать и вести пальцем по панели — линза едет за пальцем, выбор на отпускании
// • повторный тап по активной вкладке — прокрутка наверх
// • при прокрутке вниз панель сворачивается в кружок с текущей иконкой, вверх — разворачивается

const SPRING = { type: "spring", stiffness: 520, damping: 40, mass: 0.9 };
const LAYOUT_SPRING = { type: "spring", stiffness: 420, damping: 36 };
const DRAG_THRESHOLD = 6;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

function haptic() {
  try {
    navigator.vibrate?.(8); // Android; iOS Safari вибро из браузера не даёт
  } catch {
    /* нет вибро */
  }
}

export function TabBar({ tabs, activeId, onSelect, onReselect, minimized, onExpand, label }) {
  const n = tabs.length;
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.id === activeId));
  const ActiveIcon = tabs[activeIndex].Icon;

  const trackRef = useRef(null);
  const drag = useRef(null);
  const hoverRef = useRef(activeIndex);
  const prevTabW = useRef(0);

  const [tabW, setTabW] = useState(0);
  const [pressed, setPressed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [hoverIndex, setHoverIndex] = useState(activeIndex);

  // Позиция линзы и «жидкое» растяжение от скорости
  const x = useMotionValue(0);
  const velocity = useVelocity(x);
  const stretchRaw = useTransform(velocity, (v) => 1 + Math.min(Math.abs(v) / 3500, 0.28));
  const stretch = useSpring(stretchRaw, { stiffness: 600, damping: 30 });

  // Ширина одной вкладки (ResizeObserver срабатывает и сразу после подписки)
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setTabW(el.clientWidth / n));
    ro.observe(el);
    return () => ro.disconnect();
  }, [n, minimized]);

  // Линза едет к активной вкладке (при первом замере — прыжком, без анимации)
  useEffect(() => {
    if (!tabW || drag.current?.moved) return undefined;
    const target = activeIndex * tabW;
    if (prevTabW.current !== tabW) {
      prevTabW.current = tabW;
      x.set(target);
      return undefined;
    }
    const controls = animate(x, target, SPRING);
    return () => controls.stop();
  }, [activeIndex, tabW, x]);

  // Во время перетаскивания подсвечиваем вкладку под линзой
  useMotionValueEvent(x, "change", (v) => {
    if (!drag.current?.moved || !tabW) return;
    const i = clamp(Math.round(v / tabW), 0, n - 1);
    if (i !== hoverRef.current) {
      hoverRef.current = i;
      setHoverIndex(i);
      haptic();
    }
  });

  const indexAt = (clientX) => {
    const r = trackRef.current.getBoundingClientRect();
    return clamp(Math.floor((clientX - r.left) / tabW), 0, n - 1);
  };

  const choose = (idx) => {
    const tab = tabs[idx];
    if (idx === activeIndex) onReselect?.(tab.id);
    else {
      haptic();
      onSelect(tab.id);
    }
  };

  function onPointerDown(e) {
    if (!tabW || (e.pointerType === "mouse" && e.button !== 0)) return;
    trackRef.current.setPointerCapture?.(e.pointerId);
    const r = trackRef.current.getBoundingClientRect();
    drag.current = { id: e.pointerId, startX: e.clientX, left: r.left, moved: false };
    hoverRef.current = activeIndex;
    setPressed(true);
  }

  function onPointerMove(e) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (!d.moved) {
      if (Math.abs(e.clientX - d.startX) < DRAG_THRESHOLD) return;
      d.moved = true;
      setHoverIndex(activeIndex);
      setDragging(true);
    }
    x.set(clamp(e.clientX - d.left - tabW / 2, 0, (n - 1) * tabW));
  }

  function finish(e, cancelled) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    setPressed(false);
    setDragging(false);
    if (cancelled) {
      animate(x, activeIndex * tabW, SPRING);
      return;
    }
    const idx = d.moved ? clamp(Math.round(x.get() / tabW), 0, n - 1) : indexAt(e.clientX);
    animate(x, idx * tabW, SPRING);
    choose(idx);
  }

  const highlight = dragging ? hoverIndex : activeIndex;

  return (
    <div className={`tabbar-dock ${minimized ? "is-min" : ""}`}>
      <motion.nav
        layout
        transition={LAYOUT_SPRING}
        className="tabbar"
        style={{ borderRadius: 999 }}
        aria-label={label}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {minimized ? (
            <motion.button
              key="mini"
              layout="position"
              className="tabbar-mini"
              onClick={onExpand}
              aria-label={tabs[activeIndex].label}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.18 }}
            >
              <ActiveIcon size={24} strokeWidth={2.1} />
            </motion.button>
          ) : (
            <motion.div
              key="full"
              ref={trackRef}
              className="tabbar-track"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={(e) => finish(e, false)}
              onPointerCancel={(e) => finish(e, true)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {tabW > 0 && (
                <motion.div
                  className={`tabbar-lens ${pressed ? "is-pressed" : ""}`}
                  style={{ width: tabW, x, scaleX: stretch }}
                  animate={{ scale: pressed ? 1.12 : 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 28 }}
                  aria-hidden="true"
                />
              )}
              {tabs.map((tab, i) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`tabbar-item ${i === highlight ? "is-on" : ""} ${tab.accent ? "is-accent" : ""}`}
                  aria-current={i === activeIndex ? "page" : undefined}
                  // мышь и палец обрабатываются через pointer-события выше,
                  // а click с detail === 0 — это Enter/Space с клавиатуры
                  onClick={(e) => {
                    if (e.detail === 0) choose(i);
                  }}
                >
                  {tab.accent ? (
                    // выделенная вкладка (маршрут) — иконка в терракотовом кружке
                    <i className="tabbar-accent-icon">
                      <tab.Icon size={20} strokeWidth={2.4} />
                    </i>
                  ) : (
                    <tab.Icon size={24} strokeWidth={i === highlight ? 2.3 : 1.9} />
                  )}
                  <span>{tab.label}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </div>
  );
}
