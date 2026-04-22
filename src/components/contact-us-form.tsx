"use client";

import { useEffect, useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { validateLeadEmail, validateLeadName, validateLeadPhone } from "@/lib/contact-field-validation";
import { isTurnstileEnabled } from "@/lib/turnstile";
import { verifyTurnstileToken } from "@/lib/verify-turnstile-client";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast-provider";
import { cn } from "@/lib/utils";
import { MARKETING_PHONE_DISPLAY } from "@/lib/marketing-contact";

export default function ContactUsForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [touched, setTouched] = useState({ name: false, email: false, phone: false });
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [doneLeadId, setDoneLeadId] = useState<number | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileRemount, setTurnstileRemount] = useState(0);

  useEffect(() => {
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
  }, [user?.name, user?.email]);

  const nameError = useMemo(() => validateLeadName(name), [name]);
  const emailError = useMemo(() => validateLeadEmail(email), [email]);
  const phoneError = useMemo(() => validateLeadPhone(phone), [phone]);
  const showNameError = (submitAttempted || touched.name) && !!nameError;
  const showEmailError = (submitAttempted || touched.email) && !!emailError;
  const showPhoneError = (submitAttempted || touched.phone) && !!phoneError;
  const turnstileOk = !isTurnstileEnabled() || Boolean(turnstileToken);
  const isFormValid = !nameError && !emailError && !phoneError && turnstileOk;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitAttempted(true);
    if (nameError || emailError || phoneError) {
      toast({
        variant: "error",
        title: "Please check your information",
        description: "Complete the required fields before sending."
      });
      return;
    }
    if (isTurnstileEnabled()) {
      if (!turnstileToken) {
        toast({ variant: "error", title: "Security check", description: "Complete the verification below the form." });
        return;
      }
      const check = await verifyTurnstileToken(turnstileToken);
      if (!check.ok) {
        setTurnstileToken(null);
        setTurnstileRemount((k) => k + 1);
        toast({ variant: "error", title: "Security check failed", description: "Please try the verification again." });
        return;
      }
    }

    setSubmitting(true);
    try {
      const lead = await api.submitLead({
        source: "contact_us_page",
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        notes: notes.trim() || undefined
      });
      setDoneLeadId(lead.lead_id ?? null);
      setTurnstileToken(null);
      setTurnstileRemount((k) => k + 1);
    } catch {
      toast({
        variant: "error",
        title: "Could not send message",
        description: "Please try again in a moment or call us directly."
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (doneLeadId !== null) {
    return (
      <div className="rounded-2xl border border-ink-200 bg-ink-50/80 p-6 sm:p-8">
        <h2 className="font-display text-xl font-semibold text-ink-900">Message sent</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-700">
          Thank you — our team will respond shortly. If your question is urgent, call{" "}
          <a className="font-semibold text-brand-700 underline-offset-2 hover:underline" href="tel:+18187059200">
            {MARKETING_PHONE_DISPLAY}
          </a>
          .
        </p>
        <p className="mt-3 text-xs text-ink-500">Reference #{doneLeadId}</p>
      </div>
    );
  }

  return (
    <form
      className="grid gap-4 rounded-2xl border border-ink-200 bg-white p-5 shadow-sm sm:p-8"
      onSubmit={(e) => void onSubmit(e)}
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="contact-name">Full name</Label>
          <Input
            id="contact-name"
            name="name"
            autoComplete="name"
            maxLength={120}
            value={name}
            onChange={(ev) => setName(ev.target.value)}
            onBlur={() => setTouched((p) => ({ ...p, name: true }))}
            placeholder="Your name"
            aria-invalid={showNameError}
            aria-describedby={showNameError ? "contact-name-err" : undefined}
            className={cn("h-12", showNameError && "border-red-500 focus-visible:ring-red-500")}
          />
          {showNameError ? (
            <p id="contact-name-err" className="text-sm text-red-600" role="alert">
              {nameError}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contact-email">Email</Label>
          <Input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            maxLength={254}
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            onBlur={() => setTouched((p) => ({ ...p, email: true }))}
            placeholder="you@example.com"
            aria-invalid={showEmailError}
            aria-describedby={showEmailError ? "contact-email-err" : undefined}
            className={cn("h-12", showEmailError && "border-red-500 focus-visible:ring-red-500")}
          />
          {showEmailError ? (
            <p id="contact-email-err" className="text-sm text-red-600" role="alert">
              {emailError}
            </p>
          ) : null}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contact-phone">Phone</Label>
        <Input
          id="contact-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          maxLength={20}
          value={phone}
          onChange={(ev) => setPhone(ev.target.value)}
          onBlur={() => setTouched((p) => ({ ...p, phone: true }))}
          placeholder="Mobile number"
          aria-invalid={showPhoneError}
          aria-describedby={showPhoneError ? "contact-phone-err" : undefined}
          className={cn("h-12", showPhoneError && "border-red-500 focus-visible:ring-red-500")}
        />
        {showPhoneError ? (
          <p id="contact-phone-err" className="text-sm text-red-600" role="alert">
            {phoneError}
          </p>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contact-message">Message</Label>
        <Textarea
          id="contact-message"
          name="message"
          value={notes}
          onChange={(ev) => setNotes(ev.target.value)}
          placeholder="How can we help? (vehicle interest, lease vs buy, delivery area, etc.)"
          className="min-h-[120px]"
        />
      </div>
      <div className="flex items-start gap-2 rounded-lg bg-[#edf2ff] px-3 py-2.5 text-sm font-semibold text-ink-700 sm:px-4">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden />
        <span>Your details stay private — we do not sell your information.</span>
      </div>
      <TurnstileWidget action="lead" remountKey={turnstileRemount} onToken={setTurnstileToken} className="flex justify-center" />
      <div>
        <Button type="submit" disabled={submitting || !isFormValid} className="w-full rounded-xl sm:w-auto sm:min-w-[200px]">
          {submitting ? "Sending…" : "Send message"}
        </Button>
      </div>
    </form>
  );
}
