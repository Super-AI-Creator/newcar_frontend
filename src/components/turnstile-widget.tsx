"use client";

import { Turnstile } from "@marsidev/react-turnstile";
import { TURNSTILE_SITE_KEY } from "@/lib/turnstile";

type Props = {
  onToken: (token: string | null) => void;
  className?: string;
  /** Passed to Cloudflare for analytics (login, register, lead, etc.). */
  action?: string;
  /** Bump to remount the widget after a failed verify or expiry. */
  remountKey?: number;
};

export function TurnstileWidget({ onToken, className, action, remountKey = 0 }: Props) {
  if (!TURNSTILE_SITE_KEY) return null;

  return (
    <div className={className} key={remountKey}>
      <Turnstile
        siteKey={TURNSTILE_SITE_KEY}
        onSuccess={(t) => onToken(t)}
        onExpire={() => onToken(null)}
        onError={() => onToken(null)}
        options={{
          theme: "light",
          ...(action ? { action } : {})
        }}
      />
    </div>
  );
}
