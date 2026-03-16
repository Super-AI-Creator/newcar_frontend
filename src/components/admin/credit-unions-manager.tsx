"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  api,
  type CreditUnionRecord,
  type CreditUnionCreatePayload,
  type CreditUnionUpdatePayload,
  type CreditUnionLoanProgramRecord,
  type CreditUnionDisclosureRecord,
} from "@/lib/api";
import { useToast, type ToastContextValue } from "@/components/toast-provider";
import { Building2, Plus, Trash2 } from "lucide-react";

export function CreditUnionsManager({ embedded }: { embedded?: boolean }) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const listQuery = useQuery({
    queryKey: ["admin", "credit-unions"],
    queryFn: () => api.listCreditUnions({ include_inactive: true, limit: 200 }),
    enabled: true,
  });

  const items = listQuery.data ?? [];
  return (
    <div className="space-y-6">
      <Card className="border-ink-200 bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-brand-600" />
            Credit Union Accounts
          </CardTitle>
          <p className="text-sm font-normal text-ink-600">
            Create and manage credit unions. Each gets a white-label site and optional member signup link.
          </p>
        </CardHeader>
        <CardContent>
          {listQuery.isLoading && <p className="text-sm text-ink-500">Loading…</p>}
          {listQuery.error && (
            <p className="text-sm text-red-600">Failed to load credit unions.</p>
          )}
          {!listQuery.isLoading && !listQuery.error && (
            <ul className="space-y-3">
              {items.length === 0 && (
                <li className="rounded-xl border border-ink-200 bg-ink-50 p-4 text-sm text-ink-600">
                  No credit unions yet. Create one below.
                </li>
              )}
              {items.map((cu) => (
                <li key={cu.id}>
                  <CreditUnionRow
                    cu={cu}
                    onUpdated={() => queryClient.invalidateQueries({ queryKey: ["admin", "credit-unions"] })}
                    onDeleted={() => queryClient.invalidateQueries({ queryKey: ["admin", "credit-unions"] })}
                    toast={toast}
                  />
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6 border-t border-ink-200 pt-6">
            <CreateCreditUnionForm
              onCreated={() => queryClient.invalidateQueries({ queryKey: ["admin", "credit-unions"] })}
              toast={toast}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CreditUnionRow({
  cu,
  onUpdated,
  onDeleted,
  toast,
}: {
  cu: CreditUnionRecord;
  onUpdated: () => void;
  onDeleted: () => void;
  toast: ToastContextValue;
}) {
  const [editing, setEditing] = React.useState(false);
  const [assignEmail, setAssignEmail] = React.useState("");
  const assignMutation = useMutation({
    mutationFn: () => api.assignCreditUnionStaff(cu.id, assignEmail),
    onSuccess: (data) => {
      toast.toast({ title: "Done", description: data.message });
      setAssignEmail("");
    },
    onError: (e: unknown) => {
      const msg = (e as { message?: string })?.message ?? "";
      const description =
        msg === "Failed to fetch"
          ? "Cannot reach the server. Is the backend running? Check NEXT_PUBLIC_API_BASE_URL (or API_BASE_URL) in the frontend .env."
          : msg || "User not found. They must register first.";
      toast.toast({ title: "Failed", description, variant: "destructive" });
    },
  });

  return (
    <div className="rounded-xl border border-ink-200 bg-white p-4">
      {!editing ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-ink-900">{cu.name}</p>
              <p className="text-sm text-ink-500">
                Slug: <code className="rounded bg-ink-100 px-1">{cu.slug}</code>
                {cu.signup_link && (
                  <span className="ml-2">
                    · <a href={cu.signup_link} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">Signup link</a>
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/cu/${cu.slug}`} target="_blank">View site</Link>
              </Button>
              <DeleteCreditUnionButton id={cu.id} onDeleted={onDeleted} toast={toast} />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3">
            <span className="text-sm text-ink-600">Assign staff: enter the <strong>login email</strong> they use to sign in (they register first, then tell you their email):</span>
            <Input
              type="email"
              placeholder="their-login@email.com"
              value={assignEmail}
              onChange={(e) => setAssignEmail(e.target.value)}
              className="max-w-[220px] h-8 text-sm"
            />
            <Button
              size="sm"
              onClick={() => assignMutation.mutate()}
              disabled={!assignEmail.trim() || assignMutation.isPending}
            >
              {assignMutation.isPending ? "Assigning…" : "Make CU staff"}
            </Button>
          </div>
        </>
      ) : (
        <CreditUnionEditForm
          cu={cu}
          onSaved={() => { setEditing(false); onUpdated(); }}
          onCancel={() => setEditing(false)}
          toast={toast}
        />
      )}
    </div>
  );
}

function CreditUnionEditForm({
  cu,
  onSaved,
  onCancel,
  toast,
}: {
  cu: CreditUnionRecord;
  onSaved: () => void;
  onCancel: () => void;
  toast: ToastContextValue;
}) {
  const [name, setName] = React.useState(cu.name);
  const [slug, setSlug] = React.useState(cu.slug);
  const [logoUrl, setLogoUrl] = React.useState(cu.logo_url ?? "");
  const [phone, setPhone] = React.useState(cu.phone ?? "");
  const [address, setAddress] = React.useState(cu.address ?? "");
  const [contactName, setContactName] = React.useState(cu.contact_name ?? "");
  const [contactPhone, setContactPhone] = React.useState(cu.contact_phone ?? "");
  const [contactEmail, setContactEmail] = React.useState(cu.contact_email ?? "");
  const [isActive, setIsActive] = React.useState(cu.is_active);
  const [loanPrograms, setLoanPrograms] = React.useState<CreditUnionLoanProgramRecord[]>(
    cu.loan_programs?.length ? cu.loan_programs : [{ interest_rate: 0, max_term_months: 60, vehicle_type: "new" }]
  );
  const [disclosures, setDisclosures] = React.useState<CreditUnionDisclosureRecord[]>(
    cu.disclosures?.length ? cu.disclosures : [{ sort_order: 0, text: "" }]
  );
  const updateMutation = useMutation({
    mutationFn: (payload: CreditUnionUpdatePayload) => api.updateCreditUnion(cu.id, payload),
    onSuccess: () => {
      toast.toast({ title: "Credit union updated" });
      onSaved();
    },
    onError: (e: any) => {
      toast.toast({ title: "Update failed", description: e?.message ?? "Please try again.", variant: "destructive" });
    },
  });
  const handleSave = () => {
    updateMutation.mutate({
      name,
      slug,
      logo_url: logoUrl || null,
      phone: phone || null,
      address: address || null,
      contact_name: contactName || null,
      contact_phone: contactPhone || null,
      contact_email: contactEmail || null,
      is_active: isActive,
      loan_programs: loanPrograms.filter((p) => p.interest_rate > 0 || p.max_term_months > 0),
      disclosures: disclosures.filter((d) => d.text.trim()),
    });
  };
  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label>Slug (URL)</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="my-cu" /></div>
        <div className="sm:col-span-2"><Label>Logo URL</Label><Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} /></div>
        <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <div><Label>Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
        <div><Label>Contact name</Label><Input value={contactName} onChange={(e) => setContactName(e.target.value)} /></div>
        <div><Label>Contact phone</Label><Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} /></div>
        <div><Label>Contact email</Label><Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></div>
      </div>
      <div className="flex items-center gap-2">
        <Label>Active</Label>
        <Button size="sm" variant={isActive ? "default" : "outline"} onClick={() => setIsActive(true)}>Yes</Button>
        <Button size="sm" variant={!isActive ? "default" : "outline"} onClick={() => setIsActive(false)}>No</Button>
      </div>
      <LoanProgramsEditor value={loanPrograms} onChange={setLoanPrograms} />
      <DisclosuresEditor value={disclosures} onChange={setDisclosures} />
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={updateMutation.isPending}>Save</Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function CreateCreditUnionForm({
  onCreated,
  toast,
}: {
  onCreated: () => void;
  toast: ToastContextValue;
}) {
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [logoUrl, setLogoUrl] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [contactName, setContactName] = React.useState("");
  const [contactPhone, setContactPhone] = React.useState("");
  const [contactEmail, setContactEmail] = React.useState("");
  const [loanPrograms, setLoanPrograms] = React.useState<CreditUnionLoanProgramRecord[]>([
    { interest_rate: 0, max_term_months: 60, vehicle_type: "new" },
  ]);
  const [disclosures, setDisclosures] = React.useState<CreditUnionDisclosureRecord[]>([{ sort_order: 0, text: "" }]);
  const createMutation = useMutation({
    mutationFn: (payload: CreditUnionCreatePayload) => api.createCreditUnion(payload),
    onSuccess: () => {
      toast.toast({ title: "Credit union created" });
      setName(""); setSlug(""); setLogoUrl(""); setPhone(""); setAddress("");
      setContactName(""); setContactPhone(""); setContactEmail("");
      setLoanPrograms([{ interest_rate: 0, max_term_months: 60, vehicle_type: "new" }]);
      setDisclosures([{ sort_order: 0, text: "" }]);
      onCreated();
    },
    onError: (e: any) => {
      toast.toast({ title: "Create failed", description: e?.message ?? "Please try again.", variant: "destructive" });
    },
  });
  const handleCreate = () => {
    if (!name.trim()) {
      toast.toast({ title: "Enter a name", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      name: name.trim(),
      slug: slug.trim() || undefined,
      logo_url: logoUrl.trim() || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      contact_name: contactName.trim() || undefined,
      contact_phone: contactPhone.trim() || undefined,
      contact_email: contactEmail.trim() || undefined,
      loan_programs: loanPrograms.filter((p) => p.interest_rate > 0 || p.max_term_months > 0),
      disclosures: disclosures.filter((d) => d.text.trim()),
    });
  };
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-ink-900">Add Credit Union</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        <div><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Credit Union" /></div>
        <div><Label>Slug (optional)</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="my-cu" /></div>
        <div className="sm:col-span-2"><Label>Logo URL</Label><Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} /></div>
        <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <div><Label>Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
        <div><Label>Contact name</Label><Input value={contactName} onChange={(e) => setContactName(e.target.value)} /></div>
        <div><Label>Contact phone</Label><Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} /></div>
        <div><Label>Contact email</Label><Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></div>
      </div>
      <LoanProgramsEditor value={loanPrograms} onChange={setLoanPrograms} />
      <DisclosuresEditor value={disclosures} onChange={setDisclosures} />
      <Button onClick={handleCreate} disabled={createMutation.isPending || !name.trim()}>
        <Plus className="mr-1 h-4 w-4" /> Create Credit Union
      </Button>
    </div>
  );
}

function LoanProgramsEditor({
  value,
  onChange,
}: {
  value: CreditUnionLoanProgramRecord[];
  onChange: (v: CreditUnionLoanProgramRecord[]) => void;
}) {
  const add = () => onChange([...value, { interest_rate: 0, max_term_months: 60, vehicle_type: "new" }]);
  const remove = (i: number) => onChange(value.filter((_, j) => j !== i));
  const update = (i: number, field: keyof CreditUnionLoanProgramRecord, val: number | string) => {
    const next = [...value];
    (next[i] as any)[field] = val;
    onChange(next);
  };
  return (
    <div className="space-y-2">
      <Label>Loan programs</Label>
      {value.map((p, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2 rounded border border-ink-200 bg-ink-50 p-2">
          <Input
            type="number"
            step="0.125"
            placeholder="Rate %"
            className="w-24"
            value={p.interest_rate || ""}
            onChange={(e) => update(i, "interest_rate", Number(e.target.value) || 0)}
          />
          <Input
            type="number"
            placeholder="Max term mo"
            className="w-24"
            value={p.max_term_months || ""}
            onChange={(e) => update(i, "max_term_months", Number(e.target.value) || 0)}
          />
          <select
            className="rounded border border-ink-200 bg-white px-2 py-2 text-sm"
            value={p.vehicle_type || "new"}
            onChange={(e) => update(i, "vehicle_type", e.target.value)}
          >
            <option value="new">New</option>
            <option value="used">Used</option>
          </select>
          <Button type="button" size="sm" variant="ghost" onClick={() => remove(i)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={add}><Plus className="mr-1 h-4 w-4" /> Add program</Button>
    </div>
  );
}

function DisclosuresEditor({
  value,
  onChange,
}: {
  value: CreditUnionDisclosureRecord[];
  onChange: (v: CreditUnionDisclosureRecord[]) => void;
}) {
  const add = () => onChange([...value, { sort_order: value.length, text: "" }]);
  const remove = (i: number) => onChange(value.filter((_, j) => j !== i));
  const update = (i: number, field: "sort_order" | "text", val: number | string) => {
    const next = [...value];
    (next[i] as any)[field] = val;
    onChange(next);
  };
  return (
    <div className="space-y-2">
      <Label>Disclosures</Label>
      {value.map((d, i) => (
        <div key={i} className="flex gap-2 rounded border border-ink-200 bg-ink-50 p-2">
          <Input
            type="number"
            className="w-16"
            value={d.sort_order}
            onChange={(e) => update(i, "sort_order", Number(e.target.value) || 0)}
          />
          <Textarea
            placeholder="Disclosure text"
            className="min-h-[60px] flex-1"
            value={d.text}
            onChange={(e) => update(i, "text", e.target.value)}
          />
          <Button type="button" size="sm" variant="ghost" onClick={() => remove(i)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={add}><Plus className="mr-1 h-4 w-4" /> Add disclosure</Button>
    </div>
  );
}

function DeleteCreditUnionButton({
  id,
  onDeleted,
  toast,
}: {
  id: number;
  onDeleted: () => void;
  toast: ToastContextValue;
}) {
  const [confirm, setConfirm] = React.useState(false);
  const deleteMutation = useMutation({
    mutationFn: () => api.deleteCreditUnion(id),
    onSuccess: () => {
      toast.toast({ title: "Credit union deleted" });
      onDeleted();
    },
    onError: (e: any) => {
      toast.toast({ title: "Delete failed", description: e?.message ?? "Please try again.", variant: "destructive" });
    },
  });
  if (confirm) {
    return (
      <>
        <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>Confirm delete</Button>
        <Button size="sm" variant="outline" onClick={() => setConfirm(false)}>Cancel</Button>
      </>
    );
  }
  return (
    <Button size="sm" variant="outline" onClick={() => setConfirm(true)}>Delete</Button>
  );
}
