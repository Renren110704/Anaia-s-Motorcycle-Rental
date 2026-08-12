import { useCallback, useEffect, useMemo, useState } from "react";

const safeInt = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export const formatCooldown = (seconds) => {
  const s = Math.max(0, safeInt(seconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
};

export default function useResendCooldown({
  storageKey,
  cooldownSeconds = 60,
} = {}) {
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const key = useMemo(() => {
    const k = String(storageKey || "").trim();
    return k.length ? k : null;
  }, [storageKey]);

  const readRemaining = useCallback(() => {
    if (!key) return 0;
    const expiresAtRaw = sessionStorage.getItem(key);
    const expiresAt = safeInt(expiresAtRaw);
    if (!expiresAt) return 0;
    const diffMs = expiresAt - Date.now();
    return diffMs > 0 ? Math.ceil(diffMs / 1000) : 0;
  }, [key]);

  const startCooldown = useCallback(() => {
    if (!key) return;
    const expiresAt = Date.now() + safeInt(cooldownSeconds) * 1000;
    sessionStorage.setItem(key, String(expiresAt));
    setRemainingSeconds(Math.max(0, safeInt(cooldownSeconds)));
  }, [cooldownSeconds, key]);

  const clearCooldown = useCallback(() => {
    if (!key) return;
    sessionStorage.removeItem(key);
    setRemainingSeconds(0);
  }, [key]);

  useEffect(() => {
    setRemainingSeconds(readRemaining());
    if (!key) return;

    const intervalId = window.setInterval(() => {
      const next = readRemaining();
      setRemainingSeconds(next);
      if (next <= 0) {
        sessionStorage.removeItem(key);
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [key, readRemaining]);

  const canResend = remainingSeconds <= 0;

  return {
    canResend,
    remainingSeconds,
    startCooldown,
    clearCooldown,
  };
}
