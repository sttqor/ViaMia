

// Движение (правила «20 ways»): появление — easeOut, перемещение — пружина без отскока,
// лесенка — 30 мс, нажатие — 0.97. Отскок — только для подтверждения (сердечко, галочка). Только transform и opacity.
export const SPRING = { type: "spring", bounce: 0, duration: 0.32 };
export const EASE_OUT = [0.22, 1, 0.36, 1];
export const EASE_IN_OUT = [0.65, 0, 0.35, 1];
// Появление карточки при прокрутке: один раз, лёгкий подъём; задержка по кругу из 6,
// чтобы длинный список не «ехал» секундами
export const inView = (index) => ({
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.3, delay: (index % 6) * 0.03, ease: EASE_OUT },
});
// Экран поверх вкладок (тур, бронь, билет, выбор языка) въезжает справа
export const SCREEN_IN = {
  initial: { opacity: 0, x: 32 },
  animate: { opacity: 1, x: 0 },
  transition: SPRING,
};
// Текст на обложке появляется по очереди
export const STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.03, delayChildren: 0.08 } } };
export const RISE = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT } } };
// Фото обложки чуть «оседает» при открытии
export const HERO_IMG = { initial: { scale: 1.08 }, animate: { scale: 1 }, transition: { duration: 1.1, ease: EASE_OUT } };
export const TAP = { scale: 0.97 };

// ссылка из базы (сайт агентства, фото) — только http(s), иначе не ссылка вовсе
export const safeHttp = (u) => (/^https?:\/\//i.test(u || "") ? u : undefined);

// «от $17» или «цена по запросу»
export function priceText(exp, t, money) {
  if (exp.selfGuided) return t("price.free");
  return exp.price == null ? t("price.request") : t("price.from", { price: money(exp.price) });
}
