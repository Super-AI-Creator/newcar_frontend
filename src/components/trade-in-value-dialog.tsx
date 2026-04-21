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

const STEPS = ["intro", "vehicle", "facts", "condition", "photos", "contact", "done"] as const;
type Step = (typeof STEPS)[number];

/** Intro panel — same asset as hero “Home Delivery” slide (`landing-page-sections` default). */
const TRADE_IN_INTRO_IMAGE = "/images/panel-cars.jpg";
const TF_IMG_VIN = "https://images.typeform.com/images/GmrqJiWDZDmj";
const TF_IMG_MILES = "https://images.typeform.com/images/ENy3LiSRuwxa";
const TF_IMG_PAYOFF = "https://images.typeform.com/images/uJY6tTXLwczq";
const TF_IMG_CONTACT = "https://images.typeform.com/images/QGSeubJJvZB2";
const TF_IMG_MECHANICAL = "https://images.typeform.com/images/zA4kY4ar7WDT";
const TF_IMG_DAMAGE = "https://images.typeform.com/images/esnGmHxq43nd";
const TF_IMG_INTENT = "https://images.typeform.com/images/ZaQqJaKQChVA";
const TF_IMG_PHOTO_GUIDE = "https://images.typeform.com/images/P56RQeeU3pQe";

const TRADE_INTENT_OPTIONS = [
  { value: "sell", label: "Just sell" },
  { value: "trade_new", label: "Trade in for a new car" },
  { value: "trade_used", label: "Trade in for a used car" }
] as const;

type TradeInValueDialogProps = Pick<ButtonProps, "variant" | "size" | "className"> & {
  triggerLabel?: string;
  /** `hero`: light button on dark landing hero. `neutral`: outline on white/light UI (e.g. deal room). */
  triggerTone?: "hero" | "neutral";
  /** Stored on `lead_requests.source` (e.g. `trade_in_hero`, `trade_in_deal_room`). */
  leadSource?: string;
  /** When set, VIN is prefilled when the dialog opens (user can edit). */
  prefillVin?: string;
};

function TypeformFieldImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-ink-200 bg-ink-50">
      <img src={src} alt={alt} width={640} height={360} className="mx-auto h-auto max-h-36 w-full object-contain sm:max-h-40" loading="lazy" decoding="async" />
    </div>
  );
}

/**
 * Notes body follows the same field order as the legacy Typeform (lX0SiNPY), plus vehicle line for internal use.
 * See: https://newcarsuperstore.typeform.com/to/lX0SiNPY
 */
function buildTradeInNotes(params: {
  headerLine: string;
  yearMakeModelTrim: string;
  vin: string;
  miles: string;
  payoff: string;
  mechanical: string;
  damages: string;
  tradeIntentLabel: string;
  /** Up to 4 URLs in submission order (filled slots only, order preserved). */
  photoUrlsOrdered: string[];
}): string {
  const photoLines = params.photoUrlsOrdered.map((url, index) => `Photo ${index + 1}: ${url}`);
  const lines = [
    params.headerLine,
    "",
    "Legacy Typeform field order (lX0SiNPY):",
    params.yearMakeModelTrim.trim() ? `Vehicle (additional context): ${params.yearMakeModelTrim.trim()}` : null,
    params.vin.trim() ? `VIN: ${params.vin.trim().toUpperCase()}` : "VIN: (not provided)",
    params.miles.trim() ? `Approx. miles: ${params.miles.trim()}` : null,
    params.payoff.trim() ? `Loan / payoff: ${params.payoff.trim()}` : null,
    params.mechanical.trim() ? `Known mechanical problems: ${params.mechanical.trim()}` : null,
    params.damages.trim() ? `Notable body damage: ${params.damages.trim()}` : null,
    params.tradeIntentLabel ? `Trade-in or sell: ${params.tradeIntentLabel}` : null,
    photoLines.length ? "" : null,
    ...photoLines
  ].filter(Boolean) as string[];
  return lines.join("\n");
}

export default function TradeInValueDialog({
  variant = "outline",
  size = "lg",
  className,
  triggerLabel = "Trade in Value",
  triggerTone = "hero",
  leadSource = "trade_in_hero",
  prefillVin
}: TradeInValueDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("intro");

  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [trim, setTrim] = useState("");
  const [miles, setMiles] = useState("");
  const [photoSlots, setPhotoSlots] = useState<(File | null)[]>([null, null, null, null]);
  const [vin, setVin] = useState("");
  const [payoff, setPayoff] = useState("");
  const [mechanical, setMechanical] = useState("");
  const [damages, setDamages] = useState("");
  const [tradeIntent, setTradeIntent] = useState<string>("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

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
    setYear("");
    setMake("");
    setModel("");
    setTrim("");
    setMiles("");
    setPhotoSlots([null, null, null, null]);
    const v = (prefillVin ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 17);
    setVin(v);
    setPayoff("");
    setMechanical("");
    setDamages("");
    setTradeIntent("");
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setPhone("");
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
  }, [open, user?.name, user?.email, prefillVin]);

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

  const tradeIntentLabel = useMemo(() => {
    const o = TRADE_INTENT_OPTIONS.find((x) => x.value === tradeIntent);
    return o?.label ?? "";
  }, [tradeIntent]);

  const stepIndex = STEPS.indexOf(step);

  function goVehicle() {
    setStep("vehicle");
  }

  function goFacts() {
    setSubmitAttempted(true);
    if (yearError || makeError || modelError) {
      toast({
        variant: "error",
        title: "Check your vehicle details",
        description: "Year, make, and model are required."
      });
      return;
    }
    setStep("facts");
  }

  function goCondition() {
    setSubmitAttempted(true);
    if (milesError) {
      toast({
        variant: "error",
        title: "Check mileage",
        description: "Approximate miles are required."
      });
      return;
    }
    setStep("condition");
  }

  function goPhotos() {
    setStep("photos");
  }

  function goContact() {
    setStep("contact");
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
    const filesInOrder = photoSlots.filter((f): f is File => f != null);
    let uploadedPhotoUrls: string[] = [];
    if (filesInOrder.length > 0) {
      try {
        for (const file of filesInOrder) {
          const upload = await api.uploadTradeInPhoto(file);
          const url = (upload.url ?? "").trim();
          if (url) uploadedPhotoUrls.push(url);
        }
      } catch {
        toast({
          variant: "error",
          title: "Photo upload failed",
          description: "Please try again, or clear photos and submit."
        });
        return;
      }
    }

    const headerLine =
      leadSource === "trade_in_deal_room"
        ? "Trade-in value request (internal form; opened from member deal room — replaces legacy Typeform flow)."
        : "Trade-in value request (internal form; replaces legacy Typeform https://newcarsuperstore.typeform.com/to/lX0SiNPY).";
    const notes = buildTradeInNotes({
      headerLine,
      yearMakeModelTrim: vehicleLine,
      miles,
      vin,
      payoff,
      mechanical,
      damages,
      tradeIntentLabel,
      photoUrlsOrdered: uploadedPhotoUrls
    });

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
        source: leadSource,
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

  const triggerClassName =
    triggerTone === "hero"
      ? "rounded-xl border-white/60 bg-white/10 text-white shadow-sm hover:border-white hover:bg-white hover:text-ink-900 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900"
      : "rounded-full border border-ink-200 bg-white text-ink-900 shadow-sm hover:bg-ink-50";

  const filledPhotoCount = photoSlots.filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant={variant} size={size} className={cn(triggerClassName, className)}>
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
                  {step !== "intro" ? ` · Step ${Math.max(1, stepIndex)} of 6` : null}
                </p>
                <DialogTitle className="break-words pt-1 text-2xl font-semibold leading-tight text-ink-900 sm:text-3xl">
                  {step === "intro" && "Get your trade-in value"}
                  {step === "vehicle" && "Tell us about your vehicle"}
                  {step === "facts" && "VIN, miles & payoff"}
                  {step === "condition" && "Condition & plans"}
                  {step === "photos" && "Photos (optional, up to 4)"}
                  {step === "contact" && "How can we reach you?"}
                </DialogTitle>
                <p className="break-words pt-2 text-sm leading-relaxed text-ink-700 sm:text-[15px]">
                  {step === "intro" &&
                    "Answer a few quick questions — same flow as our previous form, now handled securely on our site. Reference images match the original Typeform where helpful."}
                  {step === "vehicle" && "Year, make, and model are required so we can contextualize your trade (extra context beyond the legacy form)."}
                  {step === "facts" &&
                    "Same questions and order as before: VIN, mileage, and payoff. Each section uses the original form artwork as a visual guide."}
                  {step === "condition" &&
                    "Mechanical issues, body damage, and whether you want to trade or sell — matching the legacy questionnaire."}
                  {step === "photos" &&
                    "Up to four photos in fixed slots (1–4). We upload and attach them in this order so reviewers see the same sequence as the old Typeform upload."}
                  {step === "contact" &&
                    "We will text and email your appraisal follow-up — same idea as the original form’s contact step."}
                </p>
              </DialogHeader>

              {step === "intro" && (
                <div className="grid gap-4 p-5 sm:p-8">
                  <div className="overflow-hidden rounded-xl border border-ink-200 bg-ink-50">
                    <img
                      src={TRADE_IN_INTRO_IMAGE}
                      alt=""
                      width={800}
                      height={420}
                      className="h-auto max-h-48 w-full object-cover object-center sm:max-h-56"
                      loading="eager"
                      decoding="async"
                    />
                  </div>
                  <div className="flex min-w-0 items-start gap-2 rounded-lg bg-[#edf2ff] px-3 py-2.5 text-sm font-semibold leading-snug text-ink-700 sm:px-4">
                    <Lock className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                    <span className="min-w-0 break-words">100% private by default. No spam. No pressure.</span>
                  </div>
                  <div className="flex justify-end pt-1">
                    <Button type="button" className="rounded-xl px-8" onClick={goVehicle}>
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {step === "vehicle" && (
                <form
                  className="grid min-w-0 gap-4 p-5 sm:p-8"
                  onSubmit={(e) => {
                    e.preventDefault();
                    goFacts();
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
                    <div className="hidden sm:block" aria-hidden />
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
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                    <Button type="button" variant="outline" onClick={() => setStep("intro")}>
                      Back
                    </Button>
                    <Button type="submit">Continue</Button>
                  </div>
                </form>
              )}

              {step === "facts" && (
                <form
                  className="grid min-w-0 gap-6 p-5 sm:p-8"
                  onSubmit={(e) => {
                    e.preventDefault();
                    goCondition();
                  }}
                  noValidate
                >
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,220px)_1fr] sm:items-start sm:gap-6">
                    <TypeformFieldImage src={TF_IMG_VIN} alt="" />
                    <div className="space-y-1.5">
                      <Label htmlFor="ti-vin">What is the Vehicle Identification Number (VIN)?</Label>
                      <Input
                        id="ti-vin"
                        value={vin}
                        onChange={(e) => setVin(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 17))}
                        maxLength={17}
                        className="h-12 font-mono text-sm"
                        placeholder="17 characters (optional)"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,220px)_1fr] sm:items-start sm:gap-6">
                    <TypeformFieldImage src={TF_IMG_MILES} alt="" />
                    <div className="space-y-1.5">
                      <Label htmlFor="ti-miles">What is the current mileage on your vehicle?</Label>
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
                  </div>
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,220px)_1fr] sm:items-start sm:gap-6">
                    <TypeformFieldImage src={TF_IMG_PAYOFF} alt="" />
                    <div className="space-y-1.5">
                      <Label htmlFor="ti-payoff">What is the payoff amount (if any) remaining on the vehicle?</Label>
                      <Input id="ti-payoff" value={payoff} onChange={(e) => setPayoff(e.target.value)} placeholder="Rough amount is fine" className="h-12" />
                    </div>
                  </div>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                    <Button type="button" variant="outline" onClick={() => setStep("vehicle")}>
                      Back
                    </Button>
                    <Button type="submit">Continue</Button>
                  </div>
                </form>
              )}

              {step === "condition" && (
                <form
                  className="grid min-w-0 gap-6 p-5 sm:p-8"
                  onSubmit={(e) => {
                    e.preventDefault();
                    goPhotos();
                  }}
                  noValidate
                >
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,220px)_1fr] sm:items-start sm:gap-6">
                    <TypeformFieldImage src={TF_IMG_MECHANICAL} alt="" />
                    <div className="space-y-1.5">
                      <Label htmlFor="ti-mech">Are there any known mechanical problems with your vehicle? Please describe.</Label>
                      <Textarea
                        id="ti-mech"
                        value={mechanical}
                        onChange={(e) => setMechanical(e.target.value)}
                        placeholder="Optional"
                        className="min-h-[100px]"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,220px)_1fr] sm:items-start sm:gap-6">
                    <TypeformFieldImage src={TF_IMG_DAMAGE} alt="" />
                    <div className="space-y-1.5">
                      <Label htmlFor="ti-damage">Are there any notable damages to your vehicle? Please describe.</Label>
                      <Textarea
                        id="ti-damage"
                        value={damages}
                        onChange={(e) => setDamages(e.target.value)}
                        placeholder="Optional"
                        className="min-h-[100px]"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,220px)_1fr] sm:items-start sm:gap-6">
                    <TypeformFieldImage src={TF_IMG_INTENT} alt="" />
                    <fieldset className="min-w-0 space-y-3">
                      <legend className="text-sm font-medium text-ink-900">Are you looking to trade in your car or just sell it?</legend>
                      <div className="grid gap-2">
                        {TRADE_INTENT_OPTIONS.map((opt) => (
                          <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-sm text-ink-800">
                            <input
                              type="radio"
                              name="ti-intent"
                              value={opt.value}
                              checked={tradeIntent === opt.value}
                              onChange={() => setTradeIntent(opt.value)}
                              className="h-4 w-4 accent-brand-600"
                            />
                            <span>{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  </div>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:pt-1">
                    <Button type="button" variant="outline" onClick={() => setStep("facts")} disabled={submitting}>
                      Back
                    </Button>
                    <Button type="submit" className="rounded-xl sm:min-w-[200px]">
                      Continue
                    </Button>
                  </div>
                </form>
              )}

              {step === "photos" && (
                <form
                  className="grid min-w-0 gap-5 p-5 sm:p-8"
                  onSubmit={(e) => {
                    e.preventDefault();
                    goContact();
                  }}
                  noValidate
                >
                  <TypeformFieldImage src={TF_IMG_PHOTO_GUIDE} alt="" />
                  <p className="text-sm text-ink-700">
                    Please upload up to 4 photos of your vehicle (optional). Slot numbers match submission order (same as the legacy Typeform upload).
                  </p>
                  <div className="grid gap-4">
                    {[0, 1, 2, 3].map((slot) => (
                      <div key={slot} className="space-y-1.5">
                        <Label htmlFor={`ti-photo-${slot + 1}`}>Photo {slot + 1} (optional)</Label>
                        <Input
                          id={`ti-photo-${slot + 1}`}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            setPhotoSlots((prev) => {
                              const next = [...prev] as (File | null)[];
                              next[slot] = file;
                              return next;
                            });
                            e.target.value = "";
                          }}
                          className="h-12"
                        />
                        {photoSlots[slot] ? (
                          <p className="truncate text-xs text-ink-600">
                            Selected: {photoSlots[slot]!.name}
                            <button
                              type="button"
                              className="ml-2 text-brand-700 underline"
                              onClick={() =>
                                setPhotoSlots((prev) => {
                                  const next = [...prev] as (File | null)[];
                                  next[slot] = null;
                                  return next;
                                })
                              }
                            >
                              Remove
                            </button>
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  {filledPhotoCount > 0 ? (
                    <p className="text-xs text-ink-600">
                      {filledPhotoCount} photo{filledPhotoCount === 1 ? "" : "s"} will be sent in slot order (1 → 4).
                    </p>
                  ) : (
                    <p className="text-xs text-ink-500">JPG, PNG, WEBP. Max 8MB each.</p>
                  )}
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                    <Button type="button" variant="outline" onClick={() => setStep("condition")}>
                      Back
                    </Button>
                    <Button type="submit">Continue</Button>
                  </div>
                </form>
              )}

              {step === "contact" && (
                <form
                  className="grid min-w-0 gap-5 p-5 sm:p-8"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void submitTradeIn();
                  }}
                  noValidate
                >
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,220px)_1fr] sm:items-start sm:gap-6">
                    <TypeformFieldImage src={TF_IMG_CONTACT} alt="" />
                    <p className="text-sm text-ink-700">We will text and email your appraisal amount.</p>
                  </div>
                  <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                    <div className="min-w-0 space-y-1.5 sm:col-span-2">
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
                      {showPhone ? <p className="text-sm text-red-600">{phoneError}</p> : null}
                    </div>
                  </div>
                  <p className="text-xs text-ink-500">(No dealer spam)</p>
                  <TurnstileWidget
                    action="trade_in"
                    remountKey={turnstileRemount}
                    onToken={setTurnstileToken}
                    className="flex justify-center"
                  />
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:pt-1">
                    <Button type="button" variant="outline" onClick={() => setStep("photos")} disabled={submitting}>
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
