"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button, type ButtonProps } from "@/components/ui/button";
import { buildLeadFormUrl } from "@/lib/lead-form";
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
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [leadUrl, setLeadUrl] = useState<string | null>(null);
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
    setLeadUrl(null);
  }, [open, user?.name, user?.email]);

  async function handleContinue() {
    if (!name.trim() || !email.trim() || !phone.trim()) return;
    setSubmitting(true);

    // Save an internal lead note for broker workflow when user is authenticated.
    if (user && vin) {
      try {
        await api.createDeal({
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
      } catch {
        toast({
          variant: "error",
          title: "Could not save lead in workspace",
          description: "We will still continue to your lead form."
        });
      }
    }

    const url = new URL(
      buildLeadFormUrl({
        vin,
        make,
        model,
        trim,
        year,
        source
      })
    );
    url.searchParams.set("name", name.trim());
    url.searchParams.set("email", email.trim());
    url.searchParams.set("phone", phone.trim());
    if (notes.trim()) url.searchParams.set("notes", notes.trim());
    if (vehicleLabel) url.searchParams.set("vehicle", vehicleLabel);
    setLeadUrl(url.toString());
    setSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          {children}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl overflow-hidden p-0">
        {leadUrl ? (
          <>
            <DialogHeader className="border-b border-ink-200 px-5 py-3">
              <DialogTitle className="text-base">{title}</DialogTitle>
            </DialogHeader>
            <iframe
              src={leadUrl}
              title="Lead form"
              className="h-[75vh] w-full border-0"
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
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
