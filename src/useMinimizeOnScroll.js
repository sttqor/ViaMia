import { useEffect, useState } from "react";

// Сворачивание нижней панели при прокрутке вниз и разворачивание при прокрутке вверх, как в iOS 26
export function useMinimizeOnScroll() {
  const [minimized, setMinimized] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - last;
      if (y < 24) {
        setMinimized(false);
        last = y;
      } else if (dy > 12) {
        setMinimized(true);
        last = y;
      } else if (dy < -12) {
        setMinimized(false);
        last = y;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return [minimized, setMinimized];
}
