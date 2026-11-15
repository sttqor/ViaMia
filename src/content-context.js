import { createContext, useContext } from "react";

export const ContentContext = createContext(null);

// { tours, selfTours, allTours, facts, byId(id), source: "local" | "cache" | "remote" }
export function useContent() {
  const value = useContext(ContentContext);
  if (!value) throw new Error("useContent нужно вызывать внутри <ContentProvider>");
  return value;
}
