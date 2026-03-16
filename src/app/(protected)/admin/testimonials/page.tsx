"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import SiteHeader from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast-provider";
import { api } from "@/lib/api";
import { ArrowLeft, MessageSquarePlus, Save, Trash2, Upload } from "lucide-react";

type AdminTestimonial = {
  id: number;
  author: string;
  quote: string;
  title?: string | null;
  image_url?: string | null;
  sort_order: number;
};

export default function AdminTestimonialsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const toast = useToast();
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ["admin", "testimonials"],
    queryFn: async () => {
      const data = await api.adminListTestimonials();
      return data.items as AdminTestimonial[];
    },
    enabled: isSuperAdmin,
  });

  const [author, setAuthor] = useState("");
  const [title, setTitle] = useState("");
  const [quote, setQuote] = useState("");
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [imageUrl, setImageUrl] = useState<string>("");

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.uploadAdminManualVehiclePhoto(file),
    onSuccess: (result) => {
      const url = (result.url ?? "").trim();
      if (!url) {
        toast.toast({ title: "Upload failed", description: "No image URL was returned.", variant: "error" });
        return;
      }
      setImageUrl(url);
      toast.toast({ title: "Photo uploaded", variant: "success" });
    },
    onError: (e: any) => toast.toast({ title: "Upload failed", description: e?.message ?? "Please try again.", variant: "error" }),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.adminCreateTestimonial({
        author: author.trim(),
        title: title.trim() || null,
        quote: quote.trim(),
        image_url: imageUrl.trim() || null,
        sort_order: sortOrder,
      }),
    onSuccess: () => {
      setAuthor("");
      setTitle("");
      setQuote("");
      setSortOrder(0);
      setImageUrl("");
      queryClient.invalidateQueries({ queryKey: ["admin", "testimonials"] });
      toast.toast({ title: "Testimonial added", variant: "success" });
    },
    onError: (e: any) => toast.toast({ title: "Create failed", description: e?.message ?? "Please try again.", variant: "error" }),
  });

  if (!isSuperAdmin) {
    return (
      <div className="app-page min-h-screen">
        <SiteHeader />
        <main className="app-main">
          <Card className="border-ink-200 bg-white">
            <CardContent className="py-10 text-center text-ink-600">Super Admin access required.</CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const items = listQuery.data ?? [];
  const nextSortHint = useMemo(() => (items.length ? Math.max(...items.map((i) => i.sort_order)) + 1 : 0), [items]);

  return (
    <div className="app-page min-h-screen">
      <SiteHeader />
      <main className="app-main space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to Admin
            </Link>
          </Button>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Testimonials</h1>
        </div>

        <Card className="border-ink-200 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquarePlus className="h-5 w-5 text-brand-600" />
              Add testimonial
            </CardTitle>
            <p className="text-sm font-normal text-ink-600">
              Add 10+ testimonials here. The landing page carousel updates automatically.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Author *</Label>
                <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="e.g. Maria L., Los Angeles" className="mt-1" />
              </div>
              <div>
                <Label>Title (optional)</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 2022 Toyota Camry" className="mt-1" />
              </div>
              <div className="sm:col-span-2">
                <Label>Quote *</Label>
                <Textarea value={quote} onChange={(e) => setQuote(e.target.value)} placeholder="What did they say?" className="mt-1" rows={3} />
              </div>
              <div>
                <Label>Sort order</Label>
                <Input
                  type="number"
                  value={Number.isFinite(sortOrder) ? sortOrder : 0}
                  onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-ink-500">Tip: try {nextSortHint} for the next new one.</p>
              </div>
              <div>
                <Label>Photo (optional)</Label>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploadMutation.isPending}
                    onClick={() => document.getElementById("testimonial-photo-input")?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {uploadMutation.isPending ? "Uploading…" : "Upload photo"}
                  </Button>
                  <input
                    id="testimonial-photo-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      uploadMutation.mutate(file);
                      e.target.value = "";
                    }}
                  />
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt="Testimonial photo" className="h-10 w-10 rounded-full border border-ink-200 object-cover" />
                  ) : (
                    <span className="text-xs text-ink-500">No photo</span>
                  )}
                </div>
              </div>
            </div>

            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !author.trim() || !quote.trim()}
            >
              <Save className="mr-2 h-4 w-4" />
              {createMutation.isPending ? "Saving…" : "Add testimonial"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-ink-200 bg-white">
          <CardHeader>
            <CardTitle>Existing testimonials</CardTitle>
            <p className="text-sm font-normal text-ink-600">Edit or delete existing items.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {listQuery.isLoading && <p className="text-sm text-ink-500">Loading…</p>}
            {listQuery.error && <p className="text-sm text-red-600">Failed to load testimonials.</p>}
            {!listQuery.isLoading && !listQuery.error && (
              <ul className="space-y-3">
                {items.map((t) => (
                  <li key={t.id}>
                    <AdminTestimonialRow item={t} />
                  </li>
                ))}
                {items.length === 0 && (
                  <li className="rounded-xl border border-ink-200 bg-ink-50 p-4 text-sm text-ink-600">
                    No testimonials yet. Add one above.
                  </li>
                )}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function AdminTestimonialRow({ item }: { item: AdminTestimonial }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const [author, setAuthor] = useState(item.author);
  const [title, setTitle] = useState(item.title ?? "");
  const [quote, setQuote] = useState(item.quote);
  const [sortOrder, setSortOrder] = useState(item.sort_order ?? 0);
  const [imageUrl, setImageUrl] = useState(item.image_url ?? "");

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.uploadAdminManualVehiclePhoto(file),
    onSuccess: (result) => {
      const url = (result.url ?? "").trim();
      if (!url) {
        toast.toast({ title: "Upload failed", description: "No image URL was returned.", variant: "error" });
        return;
      }
      setImageUrl(url);
      toast.toast({ title: "Photo uploaded", variant: "success" });
    },
    onError: (e: any) => toast.toast({ title: "Upload failed", description: e?.message ?? "Please try again.", variant: "error" }),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      api.adminUpdateTestimonial(item.id, {
        author: author.trim(),
        title: title.trim() || null,
        quote: quote.trim(),
        image_url: imageUrl.trim() || null,
        sort_order: sortOrder,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "testimonials"] });
      toast.toast({ title: "Saved", variant: "success" });
      setEditing(false);
    },
    onError: (e: any) => toast.toast({ title: "Save failed", description: e?.message ?? "Please try again.", variant: "error" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.adminDeleteTestimonial(item.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "testimonials"] });
      toast.toast({ title: "Deleted", variant: "success" });
    },
    onError: (e: any) => toast.toast({ title: "Delete failed", description: e?.message ?? "Please try again.", variant: "error" }),
  });

  if (!editing) {
    return (
      <div className="rounded-xl border border-ink-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-full border border-ink-200 bg-ink-100">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt={author} className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div>
              <p className="font-semibold text-ink-900">{item.author}</p>
              <p className="text-xs text-ink-500">Sort order: {item.sort_order}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
            <Button
              size="sm"
              variant="secondary"
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
        {item.title ? <p className="mt-2 text-xs uppercase tracking-wide text-ink-500">{item.title}</p> : null}
        <p className="mt-2 text-sm text-ink-800">“{item.quote}”</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-ink-200 bg-white p-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Author *</Label>
          <Input value={author} onChange={(e) => setAuthor(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
        </div>
        <div className="sm:col-span-2">
          <Label>Quote *</Label>
          <Textarea value={quote} onChange={(e) => setQuote(e.target.value)} className="mt-1" rows={3} />
        </div>
        <div>
          <Label>Sort order</Label>
          <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value) || 0)} className="mt-1" />
        </div>
        <div>
          <Label>Photo</Label>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={uploadMutation.isPending}
              onClick={() => document.getElementById(`testimonial-photo-input-${item.id}`)?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploadMutation.isPending ? "Uploading…" : "Upload photo"}
            </Button>
            <input
              id={`testimonial-photo-input-${item.id}`}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                uploadMutation.mutate(file);
                e.target.value = "";
              }}
            />
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="Testimonial photo" className="h-10 w-10 rounded-full border border-ink-200 object-cover" />
            ) : (
              <span className="text-xs text-ink-500">No photo</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending || !author.trim() || !quote.trim()}>
          <Save className="mr-2 h-4 w-4" />
          {updateMutation.isPending ? "Saving…" : "Save"}
        </Button>
        <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
      </div>
    </div>
  );
}

