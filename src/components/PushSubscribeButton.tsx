"use client";

import { useEffect, useState } from "react";

const isIOS =
  typeof navigator !== "undefined" &&
  /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isStandalone =
  typeof window !== "undefined" &&
  ((window.navigator as any).standalone ||
    window.matchMedia("(display-mode: standalone)").matches);

export default function PushSubscribeButton() {
  const [state, setState] = useState<
    "idle" | "allowed" | "denied" | "unsupported"
  >("idle");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setState(
      Notification.permission === "granted"
        ? "allowed"
        : Notification.permission === "denied"
          ? "denied"
          : "idle"
    );
  }, []);

  async function subscribe() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setState("unsupported");
      return;
    }
    const OneSignal = (window as any).OneSignal;
    try {
      if (OneSignal) {
        await OneSignal.Notifications.requestPermission(true);
        const perm = await OneSignal.Notifications.getPermission();
        setState(perm === "granted" ? "allowed" : "idle");
      } else {
        await Notification.requestPermission();
        setState(
          Notification.permission === "granted"
            ? "allowed"
            : Notification.permission === "denied"
              ? "denied"
              : "idle"
        );
      }
    } catch {
      setState("idle");
    }
  }

  if (state === "allowed") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-brand/15 px-5 py-2.5 text-sm font-semibold text-ink">
        🔔 Notifications on ✓
      </span>
    );
  }
  if (state === "denied") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-5 py-2.5 text-sm text-slate-500">
        🔕 Notifications blocked — enable in browser settings
      </span>
    );
  }
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        onClick={subscribe}
        className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
      >
        🔔 Get notified about new news
      </button>
      {isIOS && !isStandalone && (
        <p className="max-w-xs text-xs text-slate-500">
          Tip: tap Share → Add to Home Screen first, then open the app and
          press 🔔 to get push notifications on iPhone.
        </p>
      )}
    </div>
  );
}
