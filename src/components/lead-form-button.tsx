"use client";

import Link from "next/link";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button, type ButtonProps } from "@/components/ui/button";
import { api } from "@/lib/api";
import { validateLeadEmail, validateLeadName, validateLeadPhone } from "@/lib/contact-field-validation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast-provider";
import { ChevronRight, Lock } from "lucide-react";

type LeadFormButtonProps = Pick<ButtonProps, "variant" | "size" | "className"> & {
  vin?: string;
  make?: string;
  model?: string;
  trim?: string;
  year?: string | number;
  source?: string;
  title?: string;
  children: ReactNode;
};

export default function LeadFormButton({
  vin,
  make,
  model,
  trim,
  year,
  source,
  title = "Get Price",
  children,
  variant,
  size,
  className
}: LeadFormButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [submittedLeadId, setSubmittedLeadId] = useState<number | null>(null);
  const [submittedDealId, setSubmittedDealId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const vehicleLabel = useMemo(
    () => [year, make, model, trim].filter(Boolean).join(" "),
    [year, make, model, trim]
  );

  useEffect(() => {
    if (!open) return;
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setPhone("");
    setNotes("");
    setPrivacyConsent(false);
    setSubmittedLeadId(null);
    setSubmittedDealId(null);
    setSubmitAttempted(false);
  }, [open, user?.name, user?.email]);

  const nameError = useMemo(() => validateLeadName(name), [name]);
  const emailError = useMemo(() => validateLeadEmail(email), [email]);
  const phoneError = useMemo(() => validateLeadPhone(phone), [phone]);

  async function handleContinue() {
    setSubmitAttempted(true);
    const nErr = validateLeadName(name);
    const eErr = validateLeadEmail(email);
    const pErr = validateLeadPhone(phone);
    if (nErr || eErr || pErr) {
      toast({
        variant: "error",
        title: "Please check your information",
        description: "Name, email, and phone are required and must be in the correct format."
      });
      return;
    }
    if (!privacyConsent) {
      toast({
        variant: "error",
        title: "Privacy consent required",
        description: "Please agree to the privacy terms before continuing."
      });
      return;
    }
    setSubmitting(true);

    try {
      const lead = await api.submitLead({
        vin,
        year,
        make,
        model,
        trim,
        source,
        vehicle: vehicleLabel || undefined,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        notes: notes.trim() || undefined
      });
      setSubmittedLeadId(lead.lead_id ?? null);

      // If guest: prompt to create account with pre-filled lead info; pass returnUrl so after login they land back here.
      if (!user) {
        setOpen(false);
        const params = new URLSearchParams();
        if (name.trim()) params.set("name", name.trim());
        if (email.trim()) params.set("email", email.trim());
        if (phone.trim()) params.set("phone", phone.trim());
        params.set("from", "lead");
        if (pathname && pathname !== "/" && pathname.startsWith("/")) params.set("returnUrl", pathname);
        router.push(`/register?${params.toString()}`);
        return;
      }

      // Keep existing authenticated deal workflow for broker queue visibility.
      if (vin) {
        try {
          const deal = await api.createDeal({
            vin,
            customer_note: [
              `Lead from ${title}`,
              `Name: ${name.trim()}`,
              `Email: ${email.trim()}`,
              `Phone: ${phone.trim()}`,
              vehicleLabel ? `Vehicle: ${vehicleLabel}` : undefined,
              notes.trim() ? `Notes: ${notes.trim()}` : undefined
            ]
              .filter(Boolean)
              .join(" | ")
          });
          setSubmittedDealId(deal.id);
        } catch {
          toast({
            variant: "error",
            title: "Lead saved, but deal sync failed",
            description: "Request is captured. We could not attach it to your Deal Room right now."
          });
        }
      }
    } catch {
      toast({
        variant: "error",
        title: "Could not submit lead",
        description: "Please try again in a moment."
      });
      return;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          {children}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[760px] overflow-hidden rounded-[26px] border border-ink-200 p-0 sm:rounded-[28px]">
        {submittedLeadId ? (
          <>
            <DialogHeader className="border-b border-ink-200 px-6 py-4">
              <DialogTitle className="text-lg">Private quote request submitted</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 p-6">
              <p className="text-sm text-ink-700">
                Thanks. Your request has been captured and sent to our team.
              </p>
              <p className="text-sm text-ink-600">
                Lead ID: <span className="font-medium text-ink-900">#{submittedLeadId}</span>
                {submittedDealId ? (
                  <>
                    {" "}| Deal ID: <span className="font-medium text-ink-900">#{submittedDealId}</span>
                  </>
                ) : null}
              </p>
              <div className="flex justify-end">
                <Button onClick={() => setOpen(false)}>Close</Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="border-b border-ink-200 px-5 py-5 sm:px-8 sm:py-6">
              <DialogTitle className="text-[34px] font-semibold leading-[1.08] text-ink-900 sm:text-[44px]">Get a Private Quote</DialogTitle>
              <p className="pt-2 text-[15px] leading-relaxed text-ink-700 sm:text-[17px]">
                Your information stays 100% private. We do not share your name, phone, or email with any dealers.
                This helps us verify you&apos;re a real buyer and negotiate the best price on your behalf.
              </p>
            </DialogHeader>
            <form
              className="grid gap-4 p-5 sm:p-8"
              onSubmit={(e) => {
                e.preventDefault();
                void handleContinue();
              }}
              noValidate
            >
              {vehicleLabel && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink-200 bg-ink-50 px-4 py-3 text-sm text-ink-700">
                  <p>
                    Vehicle selected <span className="font-medium text-ink-900">{vehicleLabel}</span>
                  </p>
                  {vin ? (
                    <Link
                      href={`/vehicles/${encodeURIComponent(vin)}`}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 underline-offset-2 hover:underline"
                    >
                      View details
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  ) : null}
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="lead-form-name">Full name</Label>
                  <Input
                    id="lead-form-name"
                    name="name"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    aria-invalid={submitAttempted && !!nameError}
                    aria-describedby={submitAttempted && nameError ? "lead-form-name-err" : undefined}
                    className={cn("h-12", submitAttempted && nameError && "border-red-500 focus-visible:ring-red-500")}
                  />
                  {submitAttempted && nameError ? (
                    <p id="lead-form-name-err" className="text-sm text-red-600" role="alert">
                      {nameError}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lead-form-email">Email address</Label>
                  <Input
                    id="lead-form-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    aria-invalid={submitAttempted && !!emailError}
                    aria-describedby={submitAttempted && emailError ? "lead-form-email-err" : undefined}
                    className={cn("h-12", submitAttempted && emailError && "border-red-500 focus-visible:ring-red-500")}
                  />
                  {submitAttempted && emailError ? (
                    <p id="lead-form-email-err" className="text-sm text-red-600" role="alert">
                      {emailError}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-form-phone">Mobile number</Label>
                <Input
                  id="lead-form-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter your mobile number"
                  aria-invalid={submitAttempted && !!phoneError}
                  aria-describedby={submitAttempted && phoneError ? "lead-form-phone-err" : undefined}
                  className={cn("h-12", submitAttempted && phoneError && "border-red-500 focus-visible:ring-red-500")}
                />
                <p className="text-xs text-ink-500">(No dealer spam)</p>
                {submitAttempted && phoneError ? (
                  <p id="lead-form-phone-err" className="text-sm text-red-600" role="alert">
                    {phoneError}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-form-notes">What would you like to know?</Label>
                <Textarea
                  id="lead-form-notes"
                  name="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Questions about price, payments, trade-in, delivery, or anything else"
                  className="min-h-[102px]"
                />
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-[#edf2ff] px-4 py-2.5 text-sm font-semibold text-ink-700">
                <Lock className="h-4 w-4 text-brand-700" />
                100% private by default. No spam. No pressure.
              </div>
              <label className="flex items-start gap-2 text-sm leading-relaxed text-ink-700">
                <input
                  type="checkbox"
                  checked={privacyConsent}
                  onChange={(e) => setPrivacyConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-700 focus:ring-brand-500"
                />
                <span>I agree to the privacy terms and understand my info stays private until I decide to connect with a dealer.</span>
              </label>
              <div className="flex justify-center pt-1 sm:pt-2">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="min-w-[220px] rounded-xl bg-gradient-to-b from-[#4f91ff] to-[#2366d6] px-8 py-3 text-base font-semibold text-white shadow-[0_10px_24px_-12px_rgba(35,102,214,0.8)] hover:from-[#5b9aff] hover:to-[#2a70e1] sm:min-w-[260px] sm:text-lg"
                >
                  {submitting ? "Saving..." : "Continue"}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
