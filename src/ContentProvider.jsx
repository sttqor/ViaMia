import { useEffect, useMemo, useState } from "react";
import { ContentContext } from "./content-context";
import { EXPERIENCES, FACTS } from "./data";
import { fetchContent } from "./api";

// Откуда берутся туры и факты:
// 1) сразу — из кэша прошлой загрузки (или из data.js при первом запуске);
// 2) затем — свежие из Supabase. Если база не настроена, пустая или недоступна — остаются данные из шага 1.
const CACHE_KEY = "osh-guide-content-v1";

function loadInitial() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (cached?.tours?.length) return { tours: cached.tours, facts: cached.facts || [], source: "cache" };
  } catch {
    /* кэша нет */
  }
  return { tours: EXPERIENCES, facts: FACTS, source: "local" };
}

export function ContentProvider({ children }) {
  const [content, setContent] = useState(loadInitial);

  useEffect(() => {
    let cancelled = false;
    fetchContent()
      .then((remote) => {
        if (cancelled || !remote || remote.tours.length === 0) return;
        setContent({ ...remote, source: "remote" });
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ tours: remote.tours, facts: remote.facts }));
        } catch {
          /* хранилище недоступно */
        }
      })
      .catch((err) => {
        console.warn("Supabase: не удалось загрузить туры, показываю сохранённые", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => {
    const map = new Map(content.tours.map((t) => [t.id, t]));
    return { ...content, byId: (id) => map.get(id) };
  }, [content]);

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}
