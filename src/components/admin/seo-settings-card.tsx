"use client";

import { ExternalLink, Flag } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { SEO_JSON_LD_STARTERS, SEO_PRESET_PAGE_KEYS } from "@/components/admin/admin-seo-constants";
import type { SeoJsonLdStarter } from "@/components/admin/admin-seo-constants";

export type SeoSettingsCardProps = {
  seoPageKey: string;
  setSeoPageKey: (value: string) => void;
  normalizedSeoPageKey: string;
  isValidSeoPageKey: boolean;

  seoSettingQueryIsFetching: boolean;
  seoSettingErrorStatus: number | null;

  seoTitle: string;
  setSeoTitle: (value: string) => void;
  seoKeywords: string;
  setSeoKeywords: (value: string) => void;
  seoCanonicalUrl: string;
  setSeoCanonicalUrl: (value: string) => void;
  seoRobots: string;
  setSeoRobots: (value: string) => void;
  seoOgTitle: string;
  setSeoOgTitle: (value: string) => void;
  seoOgDescription: string;
  setSeoOgDescription: (value: string) => void;
  seoOgImageUrl: string;
  setSeoOgImageUrl: (value: string) => void;
  seoDescription: string;
  setSeoDescription: (value: string) => void;

  seoJsonLdPresetId: string;
  setSeoJsonLdPresetId: (value: string) => void;
  seoJsonLd: string;
  setSeoJsonLd: (value: string) => void;

  seoIsActive: boolean;
  setSeoIsActive: (value: boolean) => void;

  seoSettings: Array<{ page_key: string }>;
  upsertSeoSettingMutationIsPending: boolean;
  deleteSeoSettingMutationIsPending: boolean;

  onLoad: () => void;
  onSave: () => void;
  onClearForm: () => void;
  onDelete: () => void;
};

function getStarterTemplate(id: string): SeoJsonLdStarter | undefined {
  return SEO_JSON_LD_STARTERS.find((s) => s.id === id);
}

export function SeoSettingsCard(props: SeoSettingsCardProps) {
  return (
    <Card className="border-ink-200 bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flag className="h-4 w-4 text-brand-600" />
          SEO Settings (Super Admin)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-ink-600">
          Manage page metadata manually. `site_default` applies globally; page-specific keys (like `home`) override it.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {SEO_PRESET_PAGE_KEYS.map((key) => (
            <Button
              key={key}
              size="sm"
              variant={props.normalizedSeoPageKey === key ? "default" : "outline"}
              onClick={() => props.setSeoPageKey(key)}
            >
              {key}
            </Button>
          ))}
        </div>

        <div className="grid gap-2 md:grid-cols-[1fr_auto_auto_auto_auto]">
          <Input
            value={props.seoPageKey}
            onChange={(e) => props.setSeoPageKey(e.target.value.toLowerCase())}
            placeholder="page key (e.g. home, search, site_default)"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={!props.isValidSeoPageKey || props.seoSettingQueryIsFetching}
            onClick={props.onLoad}
          >
            Load
          </Button>
          <Button
            size="sm"
            disabled={!props.isValidSeoPageKey || props.upsertSeoSettingMutationIsPending}
            onClick={props.onSave}
          >
            Save SEO
          </Button>
          <Button size="sm" variant="outline" onClick={props.onClearForm}>
            Clear Form
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!props.isValidSeoPageKey || props.deleteSeoSettingMutationIsPending}
            onClick={props.onDelete}
          >
            Delete
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge
            className={
              props.isValidSeoPageKey
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }
          >
            {props.isValidSeoPageKey ? "Valid page key" : "Invalid page key"}
          </Badge>
          {props.seoSettingQueryIsFetching && <Badge>Loading setting...</Badge>}
          {props.seoSettingErrorStatus === 404 && (
            <Badge className="border-amber-200 bg-amber-50 text-amber-700">New setting</Badge>
          )}
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <Input value={props.seoTitle} onChange={(e) => props.setSeoTitle(e.target.value)} placeholder="Title" />
          <Input
            value={props.seoKeywords}
            onChange={(e) => props.setSeoKeywords(e.target.value)}
            placeholder="Keywords (comma-separated)"
          />
          <Input
            value={props.seoCanonicalUrl}
            onChange={(e) => props.setSeoCanonicalUrl(e.target.value)}
            placeholder="Canonical URL"
          />
          <Input value={props.seoRobots} onChange={(e) => props.setSeoRobots(e.target.value)} placeholder="Robots (e.g. index,follow)" />
          <Input value={props.seoOgTitle} onChange={(e) => props.setSeoOgTitle(e.target.value)} placeholder="OG title" />
          <Input
            value={props.seoOgImageUrl}
            onChange={(e) => props.setSeoOgImageUrl(e.target.value)}
            placeholder="OG image URL"
          />
        </div>

        <Textarea
          value={props.seoDescription}
          onChange={(e) => props.setSeoDescription(e.target.value)}
          placeholder="Meta description"
          className="min-h-[84px]"
        />
        <Textarea
          value={props.seoOgDescription}
          onChange={(e) => props.setSeoOgDescription(e.target.value)}
          placeholder="OG description"
          className="min-h-[84px]"
        />

        <div className="space-y-2 rounded-lg border border-ink-200 bg-ink-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-ink-800">JSON-LD (structured data)</span>
            <a
              href="https://search.google.com/test/rich-results"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
            >
              Test in Google Rich Results
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <p className="text-xs text-ink-600">
            Start from a template, edit placeholders (name, URL, address), then save. Shoppers and Google use this with
            your meta tags.
          </p>
          <label className="sr-only" htmlFor="seo-jsonld-preset">
            JSON-LD starter template
          </label>
          <select
            id="seo-jsonld-preset"
            className="h-9 w-full max-w-lg rounded-lg border border-ink-200 bg-white px-2 text-sm"
            value={props.seoJsonLdPresetId}
            onChange={(e) => {
              const id = e.target.value;
              props.setSeoJsonLdPresetId(id);
              const row = getStarterTemplate(id);
              props.setSeoJsonLd(row?.template ?? "");
            }}
          >
            {SEO_JSON_LD_STARTERS.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </select>
        </div>

        <Textarea
          value={props.seoJsonLd}
          onChange={(e) => props.setSeoJsonLd(e.target.value)}
          placeholder="JSON-LD structured data"
          className="min-h-[160px] font-mono text-xs"
        />

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-ink-700">Active:</span>
          <Button size="sm" variant={props.seoIsActive ? "default" : "outline"} onClick={() => props.setSeoIsActive(true)}>
            Yes
          </Button>
          <Button size="sm" variant={!props.seoIsActive ? "default" : "outline"} onClick={() => props.setSeoIsActive(false)}>
            No
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-ink-800">Existing SEO Keys</p>
          <div className="flex flex-wrap gap-2">
            {props.seoSettings.map((item) => (
              <Button
                key={item.page_key}
                size="sm"
                variant={props.normalizedSeoPageKey === item.page_key ? "default" : "outline"}
                onClick={() => props.setSeoPageKey(item.page_key)}
              >
                {item.page_key}
              </Button>
            ))}
            {props.seoSettings.length === 0 && <p className="text-sm text-ink-600">No SEO settings saved yet.</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

