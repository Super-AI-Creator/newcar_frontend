"use client";

import { useEffect, useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button, type ButtonProps } from "@/components/ui/button";
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

const STEPS = ["intro", "contact", "vehicle", "extra", "done"] as const;
type Step = (typeof STEPS)[number];

type TradeInValueDialogProps = Pick<ButtonProps, "variant" | "size" | "className"> & {
  triggerLabel?: string;
};

function buildTradeInNotes(params: {
  miles: string;
  vin: string;
  payoff: string;
  condition: string;
}): string {
  const lines = [
    "Trade-in value request (landing — internal form, replaces prior Typeform flow).",
    "",
    params.miles.trim() ? `Approx. miles: ${params.miles.trim()}` : null,
    params.vin.trim() ? `VIN (if provided): ${params.vin.trim().toUpperCase()}` : null,
    params.payoff.trim() ? `Loan / payoff: ${params.payoff.trim()}` : null,
    params.condition.trim() ? `Condition / notes: ${params.condition.trim()}` : null,
  ].filter(Boolean) as string[];
  return lines.join("\n");
}

export default function TradeInValueDialog({
  variant = "outline",
  size = "lg",
  className,
  triggerLabel = "Trade in Value"
}: TradeInValueDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("intro");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [trim, setTrim] = useState("");
  const [miles, setMiles] = useState("");
  const [vin, setVin] = useState("");
  const [payoff, setPayoff] = useState("");
  const [condition, setCondition] = useState("");

  const [touched, setTouched] = useState({
    name: false,
    email: false,
    phone: false,
    year: false,
    make: false,
    model: false,
    miles: false
  });
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leadId, setLeadId] = useState<number | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileRemount, setTurnstileRemount] = useState(0);

  useEffect(() => {
    if (!open) return;
    setStep("intro");
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setPhone("");
    setYear("");
    setMake("");
    setModel("");
    setTrim("");
    setMiles("");
    setVin("");
    setPayoff("");
    setCondition("");
    setTouched({
      name: false,
      email: false,
      phone: false,
      year: false,
      make: false,
      model: false,
      miles: false
    });
    setSubmitAttempted(false);
    setLeadId(null);
    setTurnstileToken(null);
    setTurnstileRemount((k) => k + 1);
  }, [open, user?.name, user?.email]);

  const nameError = useMemo(() => validateLeadName(name), [name]);
  const emailError = useMemo(() => validateLeadEmail(email), [email]);
  const phoneError = useMemo(() => validateLeadPhone(phone), [phone]);
  const yearError = useMemo(() => {
    const t = year.trim();
    if (!t) return "Enter the vehicle year.";
    const n = Number(t);
    if (!Number.isFinite(n) || n < 1980 || n > new Date().getFullYear() + 1) return "Enter a valid model year.";
    return null;
  }, [year]);
  const makeError = useMemo(() => (make.trim() ? null : "Enter the make."), [make]);
  const modelError = useMemo(() => (model.trim() ? null : "Enter the model."), [model]);
  const milesError = useMemo(() => {
    const t = miles.trim();
    if (!t) return "Enter approximate miles.";
    const n = Number(t.replace(/,/g, ""));
    if (!Number.isFinite(n) || n < 0 || n > 2_000_000) return "Enter a realistic mileage.";
    return null;
  }, [miles]);

  const stepIndex = STEPS.indexOf(step);

  function goContact() {
    setStep("contact");
  }

  function goVehicle() {
    setSubmitAttempted(true);
    const nErr = validateLeadName(name);
    const eErr = validateLeadEmail(email);
    const pErr = validateLeadPhone(phone);
    if (nErr || eErr || pErr) {
      toast({
        variant: "error",
        title: "Check your contact info",
        description: "Please fix the highlighted fields."
      });
      return;
    }
    setStep("vehicle");
  }

  function goExtra() {
    setSubmitAttempted(true);
    if (yearError || makeError || modelError || milesError) {
      toast({
        variant: "error",
        title: "Check your vehicle details",
        description: "Year, make, model, and miles are required."
      });
      return;
    }
    setStep("extra");
  }

  async function submitTradeIn() {
    setSubmitAttempted(true);
    if (yearError || makeError || modelError || milesError || nameError || emailError || phoneError) {
      toast({ variant: "error", title: "Please complete all required fields." });
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
        toast({ variant: "error", title: "Verification failed", description: "Please try again." });
        return;
      }
    }

    const y = Number(year.trim());
    const vehicleLine = [year.trim(), make.trim(), model.trim(), trim.trim()].filter(Boolean).join(" ").trim();
    const notes = buildTradeInNotes({ miles, vin, payoff, condition });

    setSubmitting(true);
    try {
      const res = await api.submitLead({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        year: Number.isFinite(y) ? y : undefined,
        make: make.trim(),
        model: model.trim(),
        trim: trim.trim() || undefined,
        vehicle: vehicleLine || undefined,
        vin: vin.trim() ? vin.trim().toUpperCase() : undefined,
        source: "trade_in_hero",
        notes
      });
      setLeadId(res.lead_id ?? null);
      setStep("done");
    } catch {
      toast({
        variant: "error",
        title: "Could not submit",
        description: "Please try again in a moment."
      });
    } finally {
      setSubmitting(false);
    }
  }

  const showName = (submitAttempted || touched.name) && nameError;
  const showEmail = (submitAttempted || touched.email) && emailError;
  const showPhone = (submitAttempted || touched.phone) && phoneError;
  const showYear = (submitAttempted || touched.year) && yearError;
  const showMake = (submitAttempted || touched.make) && makeError;
  const showModel = (submitAttempted || touched.model) && modelError;
  const showMiles = (submitAttempted || touched.miles) && milesError;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size={size}
          className={cn(
            "rounded-xl border-white/60 bg-white/10 text-white shadow-sm hover:border-white hover:bg-white hover:text-ink-900 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900",
            className
          )}
        >
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent
        className={cn(
          "w-[min(760px,calc(100vw-1.25rem))] max-w-[min(760px,calc(100vw-1.25rem))] overflow-hidden rounded-[26px] border border-ink-200 p-0 sm:rounded-[28px]",
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
          {step === "done" ? (
            <>
              <DialogHeader className="border-b border-ink-200 px-6 py-4 pr-12">
                <DialogTitle className="text-lg">Trade in Form</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 p-6">
                <p className="text-sm text-ink-800">
                  Thanks — we received your trade-in details. Our team will review and reach out with next steps and value guidance.
                </p>
                {leadId != null ? (
                  <details className="rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 text-xs text-ink-600">
                    <summary className="cursor-pointer font-medium text-ink-800">Reference # (for support)</summary>
                    <p className="mt-2">Lead #{leadId}</p>
                  </details>
                ) : null}
                <div className="flex justify-end">
                  <Button type="button" onClick={() => setOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <DialogHeader className="min-w-0 border-b border-ink-200 px-5 py-5 pr-12 sm:px-8 sm:py-6 sm:pr-14">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Trade in Form
                  {step !== "intro" ? ` · Step ${Math.max(1, stepIndex)} of 4` : null}
                </p>
                <DialogTitle className="break-words pt-1 text-2xl font-semibold leading-tight text-ink-900 sm:text-3xl">
                  {step === "intro" && "Get your trade-in value"}
                  {step === "contact" && "How can we reach you?"}
                  {step === "vehicle" && "Tell us about your vehicle"}
                  {step === "extra" && "Loan, VIN & condition (optional)"}
                </DialogTitle>
                <p className="break-words pt-2 text-sm leading-relaxed text-ink-700 sm:text-[15px]">
                  {step === "intro" &&
                    "Answer a few quick questions — same idea as before, now handled securely on our site. Your information stays private; we use it to prepare an accurate trade-in picture for your broker."}
                  {step === "contact" &&
                    "Your information stays 100% private. We do not sell your contact details. This helps us verify you’re a real customer and follow up with value guidance."}
                  {step === "vehicle" && "Year, make, model, and approximate miles are required so we can contextualize your trade."}
                  {step === "extra" &&
                    "Add a payoff figure or VIN if you have them handy. Anything else we should know about condition or equipment?"}
                </p>
              </DialogHeader>

              {step === "intro" && (
                <div className="grid gap-4 p-5 sm:p-8">
                  <div className="flex min-w-0 items-start gap-2 rounded-lg bg-[#edf2ff] px-3 py-2.5 text-sm font-semibold leading-snug text-ink-700 sm:px-4">
                    <Lock className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                    <span className="min-w-0 break-words">100% private by default. No spam. No pressure.</span>
                  </div>
                  <div className="flex justify-end pt-1">
                    <Button type="button" className="rounded-xl px-8" onClick={goContact}>
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {step === "contact" && (
                <form
                  className="grid min-w-0 gap-4 p-5 sm:p-8"
                  onSubmit={(e) => {
                    e.preventDefault();
                    goVehicle();
                  }}
                  noValidate
                >
                  <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                    <div className="min-w-0 space-y-1.5">
                      <Label htmlFor="ti-name">Full name</Label>
                      <Input
                        id="ti-name"
                        autoComplete="name"
                        maxLength={120}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={() => setTouched((p) => ({ ...p, name: true }))}
                        className={cn("h-12", showName && "border-red-500")}
                      />
                      {showName ? <p className="text-sm text-red-600">{nameError}</p> : null}
                    </div>
                    <div className="min-w-0 space-y-1.5">
                      <Label htmlFor="ti-email">Email address</Label>
                      <Input
                        id="ti-email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                        className={cn("h-12", showEmail && "border-red-500")}
                      />
                      {showEmail ? <p className="text-sm text-red-600">{emailError}</p> : null}
                    </div>
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <Label htmlFor="ti-phone">Mobile number</Label>
                    <Input
                      id="ti-phone"
                      type="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      onBlur={() => setTouched((p) => ({ ...p, phone: true }))}
                      className={cn("h-12", showPhone && "border-red-500")}
                    />
                    <p className="text-xs text-ink-500">(No dealer spam)</p>
                    {showPhone ? <p className="text-sm text-red-600">{phoneError}</p> : null}
                  </div>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                    <Button type="button" variant="outline" onClick={() => setStep("intro")}>
                      Back
                    </Button>
                    <Button type="submit">Continue</Button>
                  </div>
                </form>
              )}

              {step === "vehicle" && (
                <form
                  className="grid min-w-0 gap-4 p-5 sm:p-8"
                  onSubmit={(e) => {
                    e.preventDefault();
                    goExtra();
                  }}
                  noValidate
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="ti-year">Year</Label>
                      <Input
                        id="ti-year"
                        inputMode="numeric"
                        maxLength={4}
                        value={year}
                        onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        onBlur={() => setTouched((p) => ({ ...p, year: true }))}
                        placeholder="e.g. 2019"
                        className={cn("h-12", showYear && "border-red-500")}
                      />
                      {showYear ? <p className="text-sm text-red-600">{yearError}</p> : null}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ti-miles">Approx. miles</Label>
                      <Input
                        id="ti-miles"
                        inputMode="numeric"
                        value={miles}
                        onChange={(e) => setMiles(e.target.value.replace(/[^\d,]/g, ""))}
                        onBlur={() => setTouched((p) => ({ ...p, miles: true }))}
                        placeholder="e.g. 42000"
                        className={cn("h-12", showMiles && "border-red-500")}
                      />
                      {showMiles ? <p className="text-sm text-red-600">{milesError}</p> : null}
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="ti-make">Make</Label>
                      <Input
                        id="ti-make"
                        value={make}
                        onChange={(e) => setMake(e.target.value)}
                        onBlur={() => setTouched((p) => ({ ...p, make: true }))}
                        placeholder="e.g. Honda"
                        className={cn("h-12", showMake && "border-red-500")}
                      />
                      {showMake ? <p className="text-sm text-red-600">{makeError}</p> : null}
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="ti-model">Model</Label>
                      <Input
                        id="ti-model"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        onBlur={() => setTouched((p) => ({ ...p, model: true }))}
                        placeholder="e.g. Accord"
                        className={cn("h-12", showModel && "border-red-500")}
                      />
                      {showModel ? <p className="text-sm text-red-600">{modelError}</p> : null}
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="ti-trim">Trim (optional)</Label>
                      <Input id="ti-trim" value={trim} onChange={(e) => setTrim(e.target.value)} placeholder="e.g. EX-L" className="h-12" />
                    </div>
                  </div>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                    <Button type="button" variant="outline" onClick={() => setStep("contact")}>
                      Back
                    </Button>
                    <Button type="submit">Continue</Button>
                  </div>
                </form>
              )}

              {step === "extra" && (
                <form
                  className="grid min-w-0 gap-4 p-5 sm:p-8"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void submitTradeIn();
                  }}
                  noValidate
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="ti-vin">VIN (optional)</Label>
                      <Input
                        id="ti-vin"
                        value={vin}
                        onChange={(e) => setVin(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 17))}
                        maxLength={17}
                        className="h-12 font-mono text-sm"
                        placeholder="17 characters"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ti-payoff">Loan payoff / balance (optional)</Label>
                      <Input
                        id="ti-payoff"
                        value={payoff}
                        onChange={(e) => setPayoff(e.target.value)}
                        placeholder="Rough amount is fine"
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="ti-condition">Condition, damage, or upgrades (optional)</Label>
                      <Textarea
                        id="ti-condition"
                        value={condition}
                        onChange={(e) => setCondition(e.target.value)}
                        placeholder="Accident history, smoke-free, aftermarket wheels, etc."
                        className="min-h-[100px]"
                      />
                    </div>
                  </div>
                  <TurnstileWidget
                    action="trade_in"
                    remountKey={turnstileRemount}
                    onToken={setTurnstileToken}
                    className="flex justify-center"
                  />
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:pt-1">
                    <Button type="button" variant="outline" onClick={() => setStep("vehicle")} disabled={submitting}>
                      Back
                    </Button>
                    <Button type="submit" disabled={submitting} className="rounded-xl sm:min-w-[200px]">
                      {submitting ? "Sending…" : "Submit"}
                    </Button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
