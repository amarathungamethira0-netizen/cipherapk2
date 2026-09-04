import { useCallback, useEffect, useState } from "react";

export function useLocalStorage<T>(key: string, initial: T | (() => T)) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) return JSON.parse(raw) as T;
    } catch {
      /* ignore */
    }
    const seeded = typeof initial === "function" ? (initial as () => T)() : initial;
    try {
      // Seed defaults immediately so first-launch data is durable even before an edit.
      window.localStorage.setItem(key, JSON.stringify(seeded));
    } catch {
      /* storage full / blocked */
    }
    return seeded;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full / blocked */
    }
  }, [key, value]);

  const remove = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* storage blocked */
    }
  }, [key]);

  return [value, setValue, remove] as const;
}
