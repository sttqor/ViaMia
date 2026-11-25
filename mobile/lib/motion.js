import { Easing, FadeIn, FadeInDown, FadeOut } from "react-native-reanimated";

// Правила движения приложения (по гайду «20 ways…»):
// появление — ease-out, перемещение — ease-in-out, уход на 20% короче появления,
// без отскока в обычном интерфейсе, строки списка — с шагом 30 мс, нажатие — 0.97.
export const EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1);
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);
export const EASE_IN = Easing.bezier(0.55, 0, 1, 0.45);
export const DUR = { fast: 180, base: 280, slow: 420 };
export const STAGGER = 30;

// появление снизу (ease-out, без отскока); delay — для лесенки
export const enter = (delay = 0, duration = DUR.base) =>
  FadeInDown.duration(duration).delay(delay).easing(EASE_OUT);
// строка списка №i: шаг 30 мс, не дольше 8 шагов
export const enterRow = (i) => enter(Math.min(i, 8) * STAGGER);
export const fadeIn = (duration = DUR.base) => FadeIn.duration(duration).easing(EASE_OUT);
export const fadeOut = (duration = Math.round(DUR.base * 0.8)) => FadeOut.duration(duration).easing(EASE_IN);
