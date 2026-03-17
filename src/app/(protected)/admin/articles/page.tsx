"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import SiteHeader from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast-provider";
import { api, type ArticleRecord, type ArticleUpsertPayload } from "@/lib/api";
import { ArrowLeft, FileText, Plus, Pencil, Trash2, ExternalLink } from "lucide-react";

function slugFromTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export default function AdminArticlesPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const toast = useToast();
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ["admin", "articles"],
    queryFn: () => api.adminListArticles(),
    enabled: isSuperAdmin,
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [content, setContent] = useState("");

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setSlug("");
    setDate(new Date().toISOString().slice(0, 10));
    setContent("");
    setEditingId(null);
    setShowAdd(false);
  };

  const fillForm = (a: ArticleRecord & { content?: string }) => {
    setTitle(a.title);
    setDescription(a.description ?? "");
    setSlug(a.slug);
    setDate(a.date?.slice(0, 10) || new Date().toISOString().slice(0, 10));
    setContent(a.content ?? "");
    setEditingId(a.id);
    setShowAdd(false);
  };

  const slugSuggestion = useMemo(() => (title.trim() ? slugFromTitle(title) : ""), [title]);

  const createMutation = useMutation({
    mutationFn: (payload: ArticleUpsertPayload) => api.adminCreateArticle(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "articles"] });
      toast.toast({ title: "Article created", variant: "success" });
      resetForm();
    },
    onError: (e: unknown) =>
      toast.toast({
        title: "Could not create article",
        description: (e as { message?: string })?.message ?? "Please try again.",
        variant: "error",
      }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ArticleUpsertPayload }) =>
      api.adminUpdateArticle(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "articles"] });
      toast.toast({ title: "Article updated", variant: "success" });
      resetForm();
    },
    onError: (e: unknown) =>
      toast.toast({
        title: "Could not update article",
        description: (e as { message?: string })?.message ?? "Please try again.",
        variant: "error",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.adminDeleteArticle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "articles"] });
      toast.toast({ title: "Article deleted", variant: "success" });
      resetForm();
    },
    onError: (e: unknown) =>
      toast.toast({
        title: "Could not delete article",
        description: (e as { message?: string })?.message ?? "Please try again.",
        variant: "error",
      }),
  });

  const handleSave = () => {
    const s = (slug || slugSuggestion).trim().toLowerCase().replace(/\s+/g, "-");
    if (!title.trim()) {
      toast.toast({ title: "Enter a title", variant: "error" });
      return;
    }
    if (!s) {
      toast.toast({ title: "Enter a slug (URL part)", variant: "error" });
      return;
    }
    const payload: ArticleUpsertPayload = {
      title: title.trim(),
      description: description.trim() || undefined,
      slug: s,
      date: date.trim() || new Date().toISOString().slice(0, 10),
      content: content.trim(),
    };
    if (editingId != null) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

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
  const isFormOpen = showAdd || editingId != null;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="app-page min-h-screen">
      <SiteHeader />
      <main className="app-main space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href="/admin">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back to Admin
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/articles" target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1 h-4 w-4" />
                View public page
              </Link>
            </Button>
          </div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Articles</h1>
        </div>

        <Card className="border-ink-200 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand-600" />
              {editingId != null ? "Edit article" : showAdd ? "New article" : "All articles"}
            </CardTitle>
            <p className="text-sm font-normal text-ink-600">
              Add or edit articles. They appear on the public Articles page. No code required.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {!isFormOpen && (
              <Button onClick={() => { setShowAdd(true); setEditingId(null); }}>
                <Plus className="mr-1 h-4 w-4" />
                Add article
              </Button>
            )}

            {isFormOpen && (
              <div className="space-y-4 rounded-xl border border-ink-200 bg-ink-50 p-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label>Title *</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. How to Lease a Car in Los Angeles"
                    />
                  </div>
                  <div>
                    <Label>URL slug *</Label>
                    <Input
                      value={slug || (title ? slugSuggestion : "")}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="e.g. how-to-lease-a-car"
                    />
                    <p className="mt-1 text-xs text-ink-500">Used in the link: /articles/[slug]</p>
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Short description (for list page and SEO)</Label>
                    <Input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="One line summary"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Content (you can use simple formatting)</Label>
                    <Textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Write your article here. You can use **bold** and [links](https://...)."
                      className="min-h-[200px] font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleSave} disabled={isSaving}>
                    {editingId != null ? "Save changes" : "Create article"}
                  </Button>
                  <Button variant="outline" onClick={resetForm} disabled={isSaving}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {listQuery.isLoading && <p className="text-sm text-ink-500">Loading articles…</p>}
            {!listQuery.isLoading && items.length === 0 && !isFormOpen && (
              <p className="text-sm text-ink-500">No articles yet. Click “Add article” to create one.</p>
            )}
            {items.length > 0 && (
              <ul className="space-y-3">
                {items.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink-200 bg-white p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink-900">{a.title}</p>
                      <p className="text-xs text-ink-500">/articles/{a.slug} · {a.date}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fillForm(a as ArticleRecord & { content?: string })}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete “${a.title}”?`)) deleteMutation.mutate(a.id);
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/articles/${a.slug}`} target="_blank" rel="noreferrer">
                          View
                        </Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
