"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import SiteHeader from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { US_STATES } from "@/lib/states";
import { useAuth } from "@/components/auth-provider";
import { ShieldCheck } from "lucide-react";

const EMPLOYMENT_OPTIONS = [
  { value: "employed", label: "I am Employed" },
  { value: "unemployed", label: "I am Unemployed" },
  { value: "retired", label: "Retired" },
];

const HOUSING_OPTIONS = [
  { value: "rent", label: "I rent" },
  { value: "own", label: "I own my house" },
];

const CREDIT_TERMS_TEXT = `I certify that the information I have provided on this application is, to the best of my knowledge, complete and accurate. I have read the Privacy Policy and authorize that my credit report is obtained. I am 18 years of age or older with a valid driver's license. I understand that financial institution(s) will rely on this information to judge my creditworthiness, and will retain this application and information about me whether or not this application is approved. Further, I authorize an investigation of my credit and employment history, in conjunction with which my credit report(s) may be obtained from one or more consumer credit reporting agencies. I understand that false statements may subject me to criminal penalties. I further understand that the Dealer and/or the financial institution(s) that evaluate my application may require additional information. FAIR CREDIT REPORTING ACT DISCLOSURE: I/We understand that this application for credit will be submitted by the Dealer to various financial institutions for evaluation.`;

function randomCaptcha() {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  return { a, b, answer: a + b };
}

export default function CreditApplicationPage() {
  return (
    <Suspense fallback={<CreditApplicationPageFallback />}>
      <CreditApplicationPageContent />
    </Suspense>
  );
}

function CreditApplicationPageFallback() {
  return (
    <div className="app-page min-h-screen">
      <SiteHeader />
      <main className="app-main space-y-6">
        <section className="w-full border-b border-ink-200 bg-white py-6">
          <p className="market-kicker">Secure Application</p>
          <h1 className="market-heading text-3xl sm:text-4xl">Credit Application</h1>
        </section>
        <Card className="border-ink-200 bg-white">
          <CardContent className="py-10 text-center text-sm text-ink-600">Loading application...</CardContent>
        </Card>
      </main>
    </div>
  );
}

function CreditApplicationPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialVin = useMemo(() => searchParams.get("vin") ?? "", [searchParams]);
  const initialMake = useMemo(() => searchParams.get("make") ?? "", [searchParams]);
  const initialModel = useMemo(() => searchParams.get("model") ?? "", [searchParams]);
  const initialTrim = useMemo(() => searchParams.get("trim") ?? "", [searchParams]);
  const isStaffUser =
    user?.role === "dealer" || user?.role === "admin" || user?.role === "broker_admin" || user?.role === "super_admin";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [ssn, setSsn] = useState("");
  const [driversLicenseNumber, setDriversLicenseNumber] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [timeAtCurrentAddress, setTimeAtCurrentAddress] = useState("");
  const [homePhone, setHomePhone] = useState("");
  const [previousStreetAddress, setPreviousStreetAddress] = useState("");
  const [previousCity, setPreviousCity] = useState("");
  const [previousState, setPreviousState] = useState("");
  const [previousZipCode, setPreviousZipCode] = useState("");
  const [timeAtPreviousAddress, setTimeAtPreviousAddress] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("");
  const [occupationTitle, setOccupationTitle] = useState("");
  const [employerName, setEmployerName] = useState("");
  const [workPhone, setWorkPhone] = useState("");
  const [timeAtCurrentJob, setTimeAtCurrentJob] = useState("");
  const [workStreetAddress, setWorkStreetAddress] = useState("");
  const [workCity, setWorkCity] = useState("");
  const [workState, setWorkState] = useState("");
  const [workZipCode, setWorkZipCode] = useState("");
  const [previousEmployer, setPreviousEmployer] = useState("");
  const [timeAtPreviousEmployer, setTimeAtPreviousEmployer] = useState("");
  const [grossMonthlyIncome, setGrossMonthlyIncome] = useState("");
  const [housingStatus, setHousingStatus] = useState("");
  const [monthlyHousingPayment, setMonthlyHousingPayment] = useState("");
  const [salespersonName, setSalespersonName] = useState("");
  const [electronicSignature, setElectronicSignature] = useState("");
  const [notes, setNotes] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [captcha, setCaptcha] = useState<ReturnType<typeof randomCaptcha> | null>(null);
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaError, setCaptchaError] = useState(false);

  useEffect(() => {
    setCaptcha(randomCaptcha());
  }, []);

  const captchaValid = useMemo(() => {
    if (!captcha) return false;
    const n = parseInt(captchaInput.trim(), 10);
    return Number.isFinite(n) && n === captcha.answer;
  }, [captcha, captchaInput]);

  const submitMutation = useMutation({
    mutationFn: () => {
      if (loading) {
        return Promise.reject(new Error("Please wait a moment and submit again."));
      }
      if (!captchaValid) {
        setCaptchaError(true);
        return Promise.reject(new Error("Please solve the security question correctly."));
      }
      setCaptchaError(false);
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        birth_date: birthDate || undefined,
        ssn: ssn || undefined,
        drivers_license_number: driversLicenseNumber || undefined,
        street_address: streetAddress || undefined,
        city: city || undefined,
        state: state || undefined,
        zip_code: zipCode || undefined,
        time_at_current_address: timeAtCurrentAddress || undefined,
        home_phone: homePhone || undefined,
        previous_street_address: previousStreetAddress || undefined,
        previous_city: previousCity || undefined,
        previous_state: previousState || undefined,
        previous_zip_code: previousZipCode || undefined,
        time_at_previous_address: timeAtPreviousAddress || undefined,
        employment_status: employmentStatus || undefined,
        occupation_title: occupationTitle || undefined,
        employer_name: employerName || undefined,
        work_phone: workPhone || undefined,
        time_at_current_job: timeAtCurrentJob || undefined,
        work_street_address: workStreetAddress || undefined,
        work_city: workCity || undefined,
        work_state: workState || undefined,
        work_zip_code: workZipCode || undefined,
        previous_employer: previousEmployer || undefined,
        time_at_previous_employer: timeAtPreviousEmployer || undefined,
        gross_monthly_income: grossMonthlyIncome ? Number(grossMonthlyIncome) : undefined,
        housing_status: housingStatus || undefined,
        monthly_housing_payment: monthlyHousingPayment ? Number(monthlyHousingPayment) : undefined,
        salesperson_name: salespersonName || undefined,
        electronic_signature: electronicSignature || undefined,
        agreed_to_terms: agreedToTerms,
        vin: initialVin || undefined,
        vehicle_make: initialMake || undefined,
        vehicle_model: initialModel || undefined,
        vehicle_trim: initialTrim || undefined,
        notes: notes || undefined,
      };
      if (user) {
        return api.creditApplication(payload);
      }
      return api.publicCreditApplication(payload);
    },
  });

  // After a successful submission, leave the form page.
  useEffect(() => {
    if (!submitMutation.isSuccess) return;
    if (user) {
      router.replace("/dashboard/customer");
    } else {
      router.replace(`/login?returnUrl=${encodeURIComponent("/dashboard/customer")}`);
    }
  }, [submitMutation.isSuccess, router, user]);

  const canSubmit =
    !!firstName?.trim() &&
    !!lastName?.trim() &&
    !!email?.trim() &&
    agreedToTerms &&
    captchaValid &&
    !loading &&
    !submitMutation.isPending;

  if (isStaffUser) {
    return (
      <div className="app-page min-h-screen">
        <SiteHeader />
        <main className="app-main space-y-6">
          <section className="w-full border-b border-ink-200 bg-white py-6">
            <p className="market-kicker">Access Scope</p>
            <h1 className="market-heading text-3xl sm:text-4xl">Credit Application</h1>
          </section>
          <Card className="border-ink-200 bg-white">
            <CardContent className="space-y-3 py-8 text-center">
              <p className="text-ink-800">Credit Application is intended for shopper/customer accounts.</p>
              <p className="text-sm text-ink-600">Your account has workspace tools for operations instead.</p>
              <div className="flex flex-wrap justify-center gap-2">
                {user?.role === "dealer" && (
                  <Button asChild variant="outline">
                    <Link href="/dashboard/dealer">Go to Dealer Workspace</Link>
                  </Button>
                )}
                {(user?.role === "admin" || user?.role === "broker_admin" || user?.role === "super_admin") && (
                  <Button asChild variant="outline">
                    <Link href="/admin">Go to Broker Workspace</Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="app-page min-h-screen">
      <SiteHeader />
      <main className="app-main space-y-6">
        <section className="w-full border-b border-ink-200 bg-white py-6">
          <p className="market-kicker">Secure Application</p>
          <h1 className="market-heading text-3xl sm:text-4xl">Credit Application</h1>
        </section>

        <Card className="border-ink-200 bg-white">
          <CardHeader>
            <CardTitle>Personal Info (required)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="First Name" value={firstName} setValue={setFirstName} required />
            <Field label="Last Name" value={lastName} setValue={setLastName} required />
            <Field label="Email Address" type="email" value={email} setValue={setEmail} required />
            <Field label="Birth Date" type="date" value={birthDate} setValue={setBirthDate} />
            <Field label="Social Security Number" value={ssn} setValue={setSsn} />
            <Field label="Drivers License Number" value={driversLicenseNumber} setValue={setDriversLicenseNumber} />
          </CardContent>
        </Card>

        <Card className="border-ink-200 bg-white">
          <CardHeader>
            <CardTitle>Current Address Info (required)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Street Address" value={streetAddress} setValue={setStreetAddress} />
            <Field label="City/Town" value={city} setValue={setCity} />
            <StateSelect label="State/Province" value={state} setValue={setState} />
            <Field label="ZIP/Postal Code" value={zipCode} setValue={setZipCode} />
            <Field label="How long at current address" value={timeAtCurrentAddress} setValue={setTimeAtCurrentAddress} />
            <Field label="Phone" value={homePhone} setValue={setHomePhone} />
          </CardContent>
        </Card>

        <Card className="border-ink-200 bg-white">
          <CardHeader>
            <CardTitle>Previous Address Info (optional if at current address more than 3 years)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Address" value={previousStreetAddress} setValue={setPreviousStreetAddress} />
            <Field label="City/Town" value={previousCity} setValue={setPreviousCity} />
            <StateSelect label="State/Province" value={previousState} setValue={setPreviousState} />
            <Field label="ZIP/Postal Code" value={previousZipCode} setValue={setPreviousZipCode} />
            <Field label="How long at this address" value={timeAtPreviousAddress} setValue={setTimeAtPreviousAddress} />
          </CardContent>
        </Card>

        <Card className="border-ink-200 bg-white">
          <CardHeader>
            <CardTitle>Current Employment Info</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Your Current Employment Status</Label>
              <Select value={employmentStatus} onValueChange={setEmploymentStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Field label="Occupation title" value={occupationTitle} setValue={setOccupationTitle} />
            <Field label="Present employer" value={employerName} setValue={setEmployerName} />
            <Field label="Enter your phone number from work" value={workPhone} setValue={setWorkPhone} />
            <Field label="How long" value={timeAtCurrentJob} setValue={setTimeAtCurrentJob} />
            <Field label="Address" value={workStreetAddress} setValue={setWorkStreetAddress} />
            <Field label="City/Town" value={workCity} setValue={setWorkCity} />
            <StateSelect label="State/Province" value={workState} setValue={setWorkState} />
            <Field label="ZIP/Postal Code" value={workZipCode} setValue={setWorkZipCode} />
            <Field label="Previous Employer to cover 5 years" value={previousEmployer} setValue={setPreviousEmployer} />
            <Field label="How long previous" value={timeAtPreviousEmployer} setValue={setTimeAtPreviousEmployer} />
            <Field label="Monthly Income" type="number" value={grossMonthlyIncome} setValue={setGrossMonthlyIncome} />
          </CardContent>
        </Card>

        <Card className="border-ink-200 bg-white">
          <CardHeader>
            <CardTitle>Income &amp; Housing Info</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Do you rent or own</Label>
              <Select value={housingStatus} onValueChange={setHousingStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {HOUSING_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Field label="Monthly Payment" type="number" value={monthlyHousingPayment} setValue={setMonthlyHousingPayment} />
            <Field label="Salesperson Name" value={salespersonName} setValue={setSalespersonName} />
            <Field label="Electronic Signature" value={electronicSignature} setValue={setElectronicSignature} />
            <div className="sm:col-span-2 space-y-2">
              <Label>Vehicle of Interest</Label>
              <Input
                value={[initialVin, initialMake, initialModel, initialTrim].filter(Boolean).join(" | ") || "—"}
                readOnly
                className="bg-ink-50"
              />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label>Additional Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-ink-200 bg-white">
          <CardContent className="space-y-4 pt-6">
            <label className="flex items-start gap-3 text-sm text-ink-700">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-ink-300"
              />
              <span className="leading-relaxed">
                I agree to the terms of service. By signing this document you agree to the following: {CREDIT_TERMS_TEXT}
              </span>
            </label>

            <div className="rounded-xl border border-ink-200 bg-ink-50/50 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                  <ShieldCheck className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-ink-900">Security check</h3>
                    <p className="mt-0.5 text-sm text-ink-600">
                      Please solve the simple math below so we know you&apos;re not a bot.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className="inline-flex items-center justify-center rounded-lg border border-ink-200 bg-white px-4 py-2 font-mono text-lg font-semibold tabular-nums text-ink-900"
                      aria-hidden
                    >
                      {captcha ? `${captcha.a} + ${captcha.b} = ?` : "Loading..."}
                    </span>
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder="Your answer"
                      value={captchaInput}
                      onChange={(e) => {
                        setCaptchaInput(e.target.value);
                        setCaptchaError(false);
                      }}
                      className={`w-28 font-mono tabular-nums ${captchaError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                      aria-label="Answer to the security question"
                      aria-invalid={captchaError}
                    />
                  </div>
                  {captchaError && (
                    <p className="text-sm font-medium text-red-600" role="alert">
                      Incorrect. Please try again.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Button onClick={() => submitMutation.mutate()} disabled={!canSubmit}>
                {submitMutation.isPending ? "Submitting..." : "Submit"}
              </Button>
              {submitMutation.isSuccess && (
                <p className="text-sm font-medium text-emerald-700">
                  Application submitted. Our team will contact you shortly.
                </p>
              )}
              {submitMutation.isError && (
                <p className="text-sm text-red-700">
                  {submitMutation.error?.message ?? "Submission failed. Please check required fields and try again."}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  setValue,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  setValue: (next: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required ? " *" : ""}
      </Label>
      <Input type={type} value={value} onChange={(e) => setValue(e.target.value)} />
    </div>
  );
}

const STATE_NONE = "__none__";

function StateSelect({
  label,
  value,
  setValue,
}: {
  label: string;
  value: string;
  setValue: (next: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        value={value === "" ? STATE_NONE : value}
        onValueChange={(v) => setValue(v === STATE_NONE ? "" : v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="— None —" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={STATE_NONE}>— None —</SelectItem>
          {US_STATES.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
