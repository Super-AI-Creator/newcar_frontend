"use client";

import { useEffect, useRef } from "react";
import { env } from "@/lib/env";

declare global {
  interface Window {
    google?: any;
  }
}

export default function GoogleSignInButton({ onCredential }: { onCredential: (token: string) => void }) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const configuredClientId =
    env.googleClientId && env.googleClientId !== "your-google-client-id" ? env.googleClientId : "";

  useEffect(() => {
    if (!configuredClientId) return;

    const existing = document.getElementById("google-gis");
    if (!existing) {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.id = "google-gis";
      document.head.appendChild(script);
      script.onload = init;
      return;
    }

    init();

    function init() {
      if (!window.google || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: configuredClientId,
        callback: (response: { credential?: string }) => {
          if (response.credential) onCredential(response.credential);
        }
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        shape: "pill",
        width: 320
      });
    }
  }, [onCredential, configuredClientId]);

  return <div ref={buttonRef} />;
}
