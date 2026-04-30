import { NextRequest, NextResponse } from "next/server";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function POST(request: NextRequest) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "turnstile_not_configured" }, { status: 503 });
  }

  let token: unknown;
  try {
    const body = await request.json();
    token = body?.token;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (typeof token !== "string" || !token.trim()) {
    return NextResponse.json({ ok: false, error: "missing_token" }, { status: 400 });
  }

  const formData = new FormData();
  formData.append("secret", secret);
  formData.append("response", token.trim());

  const forwarded = request.headers.get("x-forwarded-for");
  const clientIp = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip");
  if (clientIp) {
    formData.append("remoteip", clientIp);
  }

  const verifyRes = await fetch(VERIFY_URL, { method: "POST", body: formData });
  const data = (await verifyRes.json()) as { success?: boolean; "error-codes"?: string[] };

  if (data.success) {
    return NextResponse.json({ ok: true });
  }

  const codes = data["error-codes"]?.join(",") ?? "unknown";
  return NextResponse.json({ ok: false, error: codes }, { status: 400 });
}
