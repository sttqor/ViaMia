import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { MapPin } from "lucide-react";
import { BUMP_EVENT, FLY_EVENT } from "./flyToRoute";
import "./FlyLayer.css";

// Слой «полёта в маршрут». Монтируется один раз (в App), слушает FLY_EVENT,
// рисует миниатюры в портале и на «приземлении» шлёт BUMP_EVENT вкладке «Маршрут».

const MAX_FLIGHTS = 4;
const HALF = 22; // половина миниатюры 44px
const ARC_EASE = [0.45, 0, 0.75, 0.4]; // разгон к цели

let seq = 0;

// центр цели: кружок вкладки «Маршрут», иначе свёрнутая панель, иначе цели нет
function findTarget() {
  const el = document.querySelector('[data-fly-target="route"]') || document.querySelector(".tabbar-mini");
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

const bump = () => window.dispatchEvent(new CustomEvent(BUMP_EVENT));

// квадратичная кривая Безье
const bez = (a, c, b, p) => (1 - p) * (1 - p) * a + 2 * (1 - p) * p * c + p * p * b;

function Flight({ id, from, to, image, delay, onDone }) {
  const progress = useMotionValue(0);

  // контрольная точка — середина пути, поднятая вверх: сначала взлёт, потом падение в панель
  const dist = to ? Math.hypot(to.x - from.x, to.y - from.y) : 0;
  // Опорная точка — над кнопкой, а не над серединой пути: иначе при длинном полёте вниз
  // она оказывается ниже старта и миниатюра не взлетает. Подъём дуги ≈ L²/(2L + Δy):
  // при L = max(180, 0.6·dist) это ~55–70px вверх, потом нырок в таббар.
  const lift = Math.max(180, 0.6 * dist);
  const ctrl = to ? { x: from.x + (to.x - from.x) * 0.25, y: Math.min(from.y, to.y) - lift } : null;

  const x = useTransform(progress, (p) => (to ? bez(from.x, ctrl.x, to.x, p) : from.x) - HALF);
  const y = useTransform(progress, (p) => (to ? bez(from.y, ctrl.y, to.y, p) : from.y - 70 * p) - HALF);
  const scale = useTransform(progress, to ? [0, 0.15, 1] : [0, 0.4, 1], to ? [0.6, 1.1, 0.4] : [0.6, 1, 0.8]);
  const rotate = useTransform(progress, [0, 1], [0, to ? -18 : 0]);
  const opacity = useTransform(progress, to ? [0, 0.9, 1] : [0, 0.5, 1], [1, 1, 0]);

  useEffect(() => {
    const controls = animate(progress, 1, {
      duration: to ? 0.65 : 0.45,
      ease: to ? ARC_EASE : "easeOut",
      delay,
      onComplete: () => {
        if (to) bump();
        onDone(id);
      },
    });
    return () => controls.stop();
  }, [progress, to, delay, id, onDone]);

  return (
    <motion.div className="fly-thumb" style={{ x, y, scale, rotate, opacity }}>
      {image ? (
        <img
          src={image}
          alt=""
          draggable={false}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <MapPin size={20} color="currentColor" />
      )}
    </motion.div>
  );
}

export function FlyLayer() {
  const [flights, setFlights] = useState([]);
  const reduce = useReducedMotion();

  useEffect(() => {
    const onFly = (e) => {
      const { from, image, delay = 0 } = e.detail || {};
      if (!from) return;
      const to = findTarget();
      // меньше движения: без полёта, только отклик вкладки
      if (reduce) {
        if (to) bump();
        return;
      }
      const flight = { id: ++seq, from, to, image, delay };
      setFlights((list) => (list.length >= MAX_FLIGHTS ? list : [...list, flight]));
    };
    window.addEventListener(FLY_EVENT, onFly);
    return () => window.removeEventListener(FLY_EVENT, onFly);
  }, [reduce]);

  const done = useCallback((id) => setFlights((list) => list.filter((f) => f.id !== id)), []);

  if (flights.length === 0) return null;
  return createPortal(
    <div className="fly-layer" aria-hidden="true">
      {flights.map((f) => (
        <Flight key={f.id} {...f} onDone={done} />
      ))}
    </div>,
    document.body,
  );
}
