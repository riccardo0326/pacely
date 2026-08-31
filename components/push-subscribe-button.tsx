"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SW_PATH } from "@/lib/notifications/constants";
import {
  deletePushSubscription,
  getWebPushPublicKeyAction,
  savePushSubscription,
} from "@/server/actions/notifications";

type PushUiState =
  "loading" | "unavailable" | "unconfigured" | "denied" | "off" | "on" | "busy";

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function PushSubscribeButton() {
  const [state, setState] = useState<PushUiState>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!isPushSupported()) {
        if (!cancelled) setState("unavailable");
        return;
      }
      const publicKey = await getWebPushPublicKeyAction();
      if (cancelled) return;
      if (!publicKey) {
        setState("unconfigured");
        return;
      }
      if (Notification.permission === "denied") {
        setState("denied");
        return;
      }
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (cancelled) return;
      setState(subscription ? "on" : "off");
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setError(null);
    setState("busy");
    try {
      const publicKey = await getWebPushPublicKeyAction();
      if (!publicKey) {
        setState("unconfigured");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const registration = await navigator.serviceWorker.register(SW_PATH, {
        scope: "/",
      });
      await registration.update();
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = subscription.toJSON();
      const result = await savePushSubscription({
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
      });
      if (!result.ok) {
        setError(result.error);
        setState("off");
        return;
      }
      setState("on");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Impossibile attivare le push",
      );
      setState("off");
    }
  }

  async function disable() {
    setError(null);
    setState("busy");
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await deletePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setState("off");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Impossibile disattivare le push",
      );
      setState("on");
    }
  }

  if (state === "loading") {
    return (
      <p className="text-sm text-muted-foreground">
        Controllo notifiche browser…
      </p>
    );
  }
  if (state === "unavailable") {
    return (
      <p className="text-sm text-muted-foreground">
        Questo browser non supporta le notifiche push. Su iPhone usa Safari e
        aggiungi Pacely alla schermata Home.
      </p>
    );
  }
  if (state === "unconfigured") {
    return (
      <p className="text-sm text-muted-foreground">
        Le push non sono configurate su questo ambiente (chiavi VAPID mancanti).
        Le notifiche in-app restano attive.
      </p>
    );
  }
  if (state === "denied") {
    return (
      <p className="text-sm text-muted-foreground">
        Le notifiche browser sono bloccate. Puoi sbloccarle dalle impostazioni
        del sito.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {state === "on" ? (
        <Button type="button" variant="outline" onClick={() => void disable()}>
          Disattiva push browser
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          disabled={state === "busy"}
          onClick={() => void enable()}
        >
          {state === "busy" ? "Attivazione…" : "Attiva push browser"}
        </Button>
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
