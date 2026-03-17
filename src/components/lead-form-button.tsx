"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button, type ButtonProps } from "@/components/ui/button";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast-provider";

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
  const [submittedLeadId, setSubmittedLeadId] = useState<number | null>(null);
  const [submittedDealId, setSubmittedDealId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
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
    setSubmittedLeadId(null);
    setSubmittedDealId(null);
  }, [open, user?.name, user?.email]);

  async function handleContinue() {
    if (!name.trim() || !email.trim() || !phone.trim()) return;
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
              "Lead from Get Price",
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
            description: "Request is captured. We could not attach it to your deal tracker right now."
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
      <DialogContent className="max-w-4xl overflow-hidden p-0">
        {submittedLeadId ? (
          <>
            <DialogHeader className="border-b border-ink-200 px-5 py-3">
              <DialogTitle className="text-base">{title} request submitted</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 p-5">
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
            <DialogHeader className="border-b border-ink-200 px-5 py-3">
              <DialogTitle className="text-base">Tell us about your request</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 p-5">
              {vehicleLabel && (
                <p className="rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 text-sm text-ink-700">
                  Car: <span className="font-medium">{vehicleLabel}</span>
                </p>
              )}
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 555-5555" />
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any specific details about your request..."
                  className="min-h-[96px]"
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleContinue} disabled={!name.trim() || !email.trim() || !phone.trim() || submitting}>
                  {submitting ? "Saving..." : "Continue"}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
