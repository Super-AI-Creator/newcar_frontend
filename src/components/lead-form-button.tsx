"use client";

import Link from "next/link";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button, type ButtonProps } from "@/components/ui/button";
import { api } from "@/lib/api";
import { validateLeadEmail, validateLeadName, validateLeadPhone } from "@/lib/contact-field-validation";
import { isTurnstileEnabled } from "@/lib/turnstile";
import { verifyTurnstileToken } from "@/lib/verify-turnstile-client";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast-provider";
import { CUSTOM_QUOTE_FORM_HEADING, CUSTOM_QUOTE_FORM_INTRO } from "@/content/custom-quote-copy";
import { ChevronRight, Lock } from "lucide-react";

type LeadFormButtonProps = Pick<ButtonProps, "variant" | "size" | "className"> & {
  vin?: string;
  make?: string;
  model?: string;
  trim?: string;
  year?: string | number;
  source?: string;
  title?: string;
  formHeading?: string;
  formIntro?: string;
  requireVehicleInput?: boolean;
  vehicleInputLabel?: string;
  vehicleInputPlaceholder?: string;
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
  formHeading = CUSTOM_QUOTE_FORM_HEADING,
  formIntro = CUSTOM_QUOTE_FORM_INTRO,
  requireVehicleInput = false,
  vehicleInputLabel = "Make and Model",
  vehicleInputPlaceholder = "Please enter the make and model car you want a custom quote for",
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
  const [customVehicle, setCustomVehicle] = useState("");
  const [touched, setTouched] = useState<{ name: boolean; email: boolean; phone: boolean; vehicle: boolean }>({
    name: false,
    email: false,
    phone: false,
    vehicle: false
  });
  const [submittedLeadId, setSubmittedLeadId] = useState<number | null>(null);
  const [submittedDealId, setSubmittedDealId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileRemount, setTurnstileRemount] = useState(0);
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
    setCustomVehicle("");
    setTouched({ name: false, email: false, phone: false, vehicle: false });
    setSubmittedLeadId(null);
    setSubmittedDealId(null);
    setSubmitAttempted(false);
    setTurnstileToken(null);
    setTurnstileRemount((k) => k + 1);
  }, [open, user?.name, user?.email]);

  const nameError = useMemo(() => validateLeadName(name), [name]);
  const emailError = useMemo(() => validateLeadEmail(email), [email]);
  const phoneError = useMemo(() => validateLeadPhone(phone), [phone]);
  const customVehicleError = useMemo(() => {
    if (!requireVehicleInput) return null;
    return customVehicle.trim() ? null : "Please enter the make and model you want a custom quote for.";
  }, [customVehicle, requireVehicleInput]);
  const showNameError = (submitAttempted || touched.name) && !!nameError;
  const showEmailError = (submitAttempted || touched.email) && !!emailError;
  const showPhoneError = (submitAttempted || touched.phone) && !!phoneError;
  const showVehicleError = (submitAttempted || touched.vehicle) && !!customVehicleError;
  const turnstileOk = !isTurnstileEnabled() || Boolean(turnstileToken);
  const isFormValid = !nameError && !emailError && !phoneError && !customVehicleError && turnstileOk;

  async function handleContinue() {
    setSubmitAttempted(true);
    const nErr = validateLeadName(name);
    const eErr = validateLeadEmail(email);
    const pErr = validateLeadPhone(phone);
    if (nErr || eErr || pErr || customVehicleError) {
      toast({
        variant: "error",
        title: "Please check your information",
        description: "Please complete the required fields before continuing."
      });
      return;
    }
    if (isTurnstileEnabled()) {
      if (!turnstileToken) {
        toast({
          variant: "error",
          title: "Security check",
          description: "Complete the verification below the form."
        });
        return;
      }
      const check = await verifyTurnstileToken(turnstileToken);
      if (!check.ok) {
        setTurnstileToken(null);
        setTurnstileRemount((k) => k + 1);
        toast({
          variant: "error",
          title: "Security check failed",
          description: "Please try the verification again."
        });
        return;
      }
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
        vehicle: requireVehicleInput ? customVehicle.trim() : vehicleLabel || undefined,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        notes: notes.trim() || undefined
      });
      setSubmittedLeadId(lead.lead_id ?? null);

      if (!user) {
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
      <DialogContent
        className={cn(
          "w-[min(760px,calc(100vw-1.25rem))] max-w-[min(760px,calc(100vw-1.25rem))] overflow-hidden rounded-[26px] border border-ink-200 p-0 sm:rounded-[28px]",
          /* Top-anchored on small screens so tall content isn’t clipped; centered on sm+ */
          "top-4 translate-y-0 sm:top-1/2 sm:-translate-y-1/2"
        )}
      >
        <div
          className={cn(
            "max-h-[calc(100dvh-1.25rem)] overflow-x-hidden overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]",
            "sm:max-h-[min(90dvh,920px)]",
            "pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          )}
        >
        {submittedLeadId ? (
          <>
            <DialogHeader className="border-b border-ink-200 px-6 py-4 pr-12">
              <DialogTitle className="text-lg">Request received</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 p-6">
              <p className="text-sm text-ink-800">
                Thanks — our team will review your request and reach out shortly. If you asked about a specific vehicle, a broker may
                contact you by phone or email.
              </p>
              <details className="rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 text-xs text-ink-600">
                <summary className="cursor-pointer font-medium text-ink-800">Reference # (for support)</summary>
                <p className="mt-2">
                  Lead #{submittedLeadId}
                  {submittedDealId ? (
                    <>
                      {" "}
                      · Deal #{submittedDealId}
                    </>
                  ) : null}
                </p>
              </details>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                {!user ? (
                  <Button
                    className="w-full sm:w-auto"
                    onClick={() => {
                      const params = new URLSearchParams();
                      if (email.trim()) params.set("email", email.trim());
                      if (pathname && pathname !== "/" && pathname.startsWith("/")) params.set("returnUrl", pathname);
                      router.push(`/login${params.toString() ? `?${params.toString()}` : ""}`);
                    }}
                  >
                    Continue to sign in
                  </Button>
                ) : null}
                <Button variant={user ? "default" : "outline"} className="w-full sm:w-auto" onClick={() => setOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="min-w-0 border-b border-ink-200 px-5 py-5 pr-12 sm:px-8 sm:py-6 sm:pr-14">
              <DialogTitle className="break-words text-lg font-semibold leading-snug text-ink-900 sm:text-xl sm:leading-snug md:text-2xl md:leading-tight">
                {formHeading}
              </DialogTitle>
              <p className="break-words pt-2 text-sm leading-relaxed text-ink-700 sm:text-[17px]">
                {formIntro}
              </p>
            </DialogHeader>
            <form
              className="grid min-w-0 max-w-full gap-4 p-5 sm:p-8"
              onSubmit={(e) => {
                e.preventDefault();
                void handleContinue();
              }}
              noValidate
            >
              {vehicleLabel && !requireVehicleInput && (
                <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-ink-200 bg-ink-50 px-3 py-3 text-sm text-ink-700 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-4">
                  <p className="min-w-0 break-words">
                    Vehicle selected <span className="font-medium text-ink-900">{vehicleLabel}</span>
                  </p>
                  {vin ? (
                    <Link
                      href={`/vehicles/${encodeURIComponent(vin)}`}
                      className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-700 underline-offset-2 hover:underline"
                    >
                      View details
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  ) : null}
                </div>
              )}
              {requireVehicleInput && (
                <div className="min-w-0 space-y-1.5">
                  <Label htmlFor="lead-form-vehicle">{vehicleInputLabel}</Label>
                  <Input
                    id="lead-form-vehicle"
                    name="vehicle"
                    maxLength={255}
                    value={customVehicle}
                    onChange={(e) => setCustomVehicle(e.target.value)}
                    onBlur={() => setTouched((prev) => ({ ...prev, vehicle: true }))}
                    placeholder={vehicleInputPlaceholder}
                    aria-invalid={showVehicleError}
                    aria-describedby={showVehicleError ? "lead-form-vehicle-err" : undefined}
                    className={cn("h-12", showVehicleError && "border-red-500 focus-visible:ring-red-500")}
                  />
                  {showVehicleError ? (
                    <p id="lead-form-vehicle-err" className="text-sm text-red-600" role="alert">
                      {customVehicleError}
                    </p>
                  ) : null}
                </div>
              )}
              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <div className="min-w-0 space-y-1.5">
                  <Label htmlFor="lead-form-name">Full name</Label>
                  <Input
                    id="lead-form-name"
                    name="name"
                    autoComplete="name"
                    maxLength={120}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
                    placeholder="Enter your full name"
                    aria-invalid={showNameError}
                    aria-describedby={showNameError ? "lead-form-name-err" : undefined}
                    className={cn("h-12", showNameError && "border-red-500 focus-visible:ring-red-500")}
                  />
                  {showNameError ? (
                    <p id="lead-form-name-err" className="text-sm text-red-600" role="alert">
                      {nameError}
                    </p>
                  ) : null}
                </div>
                <div className="min-w-0 space-y-1.5">
                  <Label htmlFor="lead-form-email">Email address</Label>
                  <Input
                    id="lead-form-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    maxLength={254}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                    placeholder="Enter your email"
                    aria-invalid={showEmailError}
                    aria-describedby={showEmailError ? "lead-form-email-err" : undefined}
                    className={cn("h-12", showEmailError && "border-red-500 focus-visible:ring-red-500")}
                  />
                  {showEmailError ? (
                    <p id="lead-form-email-err" className="text-sm text-red-600" role="alert">
                      {emailError}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor="lead-form-phone">Mobile number</Label>
                <Input
                  id="lead-form-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  maxLength={20}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
                  placeholder="Enter your mobile number"
                  aria-invalid={showPhoneError}
                  aria-describedby={showPhoneError ? "lead-form-phone-err" : undefined}
                  className={cn("h-12", showPhoneError && "border-red-500 focus-visible:ring-red-500")}
                />
                <p className="text-xs text-ink-500">(No dealer spam)</p>
                {showPhoneError ? (
                  <p id="lead-form-phone-err" className="text-sm text-red-600" role="alert">
                    {phoneError}
                  </p>
                ) : null}
              </div>
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor="lead-form-notes">What would you like to know?</Label>
                <Textarea
                  id="lead-form-notes"
                  name="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Questions about price, payments, trade-in, delivery, or anything else"
                  className="min-h-[102px] max-w-full"
                />
              </div>
              <div className="flex min-w-0 items-start gap-2 rounded-lg bg-[#edf2ff] px-3 py-2.5 text-sm font-semibold leading-snug text-ink-700 sm:px-4">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                <span className="min-w-0 break-words">100% private by default. No spam. No pressure.</span>
              </div>
              <TurnstileWidget
                action="lead"
                remountKey={turnstileRemount}
                onToken={setTurnstileToken}
                className="flex justify-center"
              />
              <div className="flex justify-center pt-1 sm:pt-2">
                <Button
                  type="submit"
                  disabled={submitting || !isFormValid}
                  className="w-full max-w-[280px] rounded-xl bg-gradient-to-b from-[#4f91ff] to-[#2366d6] px-6 py-3 text-base font-semibold text-white shadow-[0_10px_24px_-12px_rgba(35,102,214,0.8)] hover:from-[#5b9aff] hover:to-[#2a70e1] sm:w-auto sm:min-w-[260px] sm:px-8 sm:text-lg"
                >
                  {submitting ? "Saving..." : "Continue"}
                </Button>
              </div>
            </form>
          </>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
