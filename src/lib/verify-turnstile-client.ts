/** Calls the Next.js route that validates the token with Cloudflare (secret stays server-side). */
export async function verifyTurnstileToken(token: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("/api/turnstile/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token })
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  if (res.ok && data.ok) return { ok: true };
  return { ok: false, error: data.error ?? "Verification failed" };
}
