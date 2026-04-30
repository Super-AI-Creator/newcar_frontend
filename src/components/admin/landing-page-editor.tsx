"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_FALLING_PHRASES } from "@/components/hero-falling-phrases";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast-provider";
import { FOOTER_DISCLOSURE_DEFAULT } from "@/content/footer-disclosure-default";
import { api, type LandingPageUpdatePayload } from "@/lib/api";
import { Layout, Save } from "lucide-react";

const DEFAULT_HERO = {
  kicker: "SHOP,  GET APPROVED AND GET THE CAR DELIVERED TO YOUR DOOR WITH A RED BOW",
  headline: "Buy Any New Car in California Without the Dealership",
  subtext: "SHOP, GET APPROVED AND GET THE CAR DELIVERED TO YOUR DOOR WITH A RED BOW.",
  slide_urls: [
    "/images/landing-1.jpg",
    "/images/landing-2.jpg",
    "/images/landing-3.jpg",
    "/images/landing-4.jpg",
  ],
  slide_focus: ["center", "center", "center", "center"] as string[],
};
const DEFAULT_LEASE = {
  title: "Current Lease Specials Los Angeles",
  subtitle: "Shop and compare hundreds of lease offers, if they make it, we have it! 818-705-9200",
};
const DEFAULT_HOW = [
  { image_url: "/images/hero-cars.jpg", label: "Browse Statewide Inventory", image_focus: "center" },
  { image_url: "/images/deal-1.jpg", label: "Get Your Best Rate", image_focus: "center" },
  { image_url: "/images/panel-cars.jpg", label: "Home Delivery With a Bow", image_focus: "center" },
];

const DEFAULT_FOOTER = {
  facebook_url: "https://www.facebook.com/newcarsuperstore/",
  twitter_url: "https://twitter.com/autobrokerla",
  google_plus_url: "https://plus.google.com/101810114903929491113",
  instagram_url: "https://www.instagram.com/newcarsuperstore/",
  youtube_url: "https://www.youtube.com/channel/UCfnPH7n_x1cHc5WXDb0zMJQ",
  address_line: "2671 Ventura Blvd Suite Oxnard CA 93036",
  phone_line: "818.705.9200, 818.705.9202",
  footer_disclosure: FOOTER_DISCLOSURE_DEFAULT,
  copyright_line: "",
  link_lease_label: "Lease Specials Los Angeles",
  link_lease_url: "/lease-specials",
  link_broker_label: "Auto Broker Los Angeles",
  link_broker_url: "/most-reviewed-auto-broker-los-angeles",
};

export function LandingPageEditor({ embedded }: { embedded?: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [heroKicker, setHeroKicker] = useState(DEFAULT_HERO.kicker);
  const [heroHeadline, setHeroHeadline] = useState(DEFAULT_HERO.headline);
  const [heroSubtext, setHeroSubtext] = useState(DEFAULT_HERO.subtext);
  const [slideUrls, setSlideUrls] = useState<string[]>(DEFAULT_HERO.slide_urls);
  const [slideFocus, setSlideFocus] = useState<string[]>(DEFAULT_HERO.slide_focus);
  const [leaseTitle, setLeaseTitle] = useState(DEFAULT_LEASE.title);
  const [leaseSubtitle, setLeaseSubtitle] = useState(DEFAULT_LEASE.subtitle);
  const [howSteps, setHowSteps] = useState<Array<{ image_url: string; label: string; image_focus?: string }>>(DEFAULT_HOW);

  const [facebookUrl, setFacebookUrl] = useState(DEFAULT_FOOTER.facebook_url);
  const [twitterUrl, setTwitterUrl] = useState(DEFAULT_FOOTER.twitter_url);
  const [googlePlusUrl, setGooglePlusUrl] = useState(DEFAULT_FOOTER.google_plus_url);
  const [instagramUrl, setInstagramUrl] = useState(DEFAULT_FOOTER.instagram_url);
  const [youtubeUrl, setYoutubeUrl] = useState(DEFAULT_FOOTER.youtube_url);
  const [footerAddress, setFooterAddress] = useState(DEFAULT_FOOTER.address_line);
  const [footerPhoneLine, setFooterPhoneLine] = useState(DEFAULT_FOOTER.phone_line);
  const [footerDisclosure, setFooterDisclosure] = useState(DEFAULT_FOOTER.footer_disclosure);
  const [footerCopyright, setFooterCopyright] = useState(DEFAULT_FOOTER.copyright_line);
  const [footerLeaseLabel, setFooterLeaseLabel] = useState(DEFAULT_FOOTER.link_lease_label);
  const [footerLeaseUrl, setFooterLeaseUrl] = useState(DEFAULT_FOOTER.link_lease_url);
  const [footerBrokerLabel, setFooterBrokerLabel] = useState(DEFAULT_FOOTER.link_broker_label);
  const [footerBrokerUrl, setFooterBrokerUrl] = useState(DEFAULT_FOOTER.link_broker_url);

  const [fallingEnabled, setFallingEnabled] = useState(true);
  const [fallingPhrasesText, setFallingPhrasesText] = useState(DEFAULT_FALLING_PHRASES.join("\n"));
  const [fallingDurMin, setFallingDurMin] = useState(19);
  const [fallingDurMax, setFallingDurMax] = useState(26);
  const [fallingMaxPhrases, setFallingMaxPhrases] = useState(8);
  const [fallingStagger, setFallingStagger] = useState(2.4);

  const query = useQuery({
    queryKey: ["admin-landing-page"],
    queryFn: () => api.getAdminLandingPage(),
    enabled: user?.role === "super_admin",
  });

  const uploadImageMutation = useMutation({
    mutationFn: (vars: { file: File; target: { type: "hero" | "how"; index: number } }) =>
      api.uploadAdminManualVehiclePhoto(vars.file),
    onSuccess: (result, vars) => {
      const uploadedUrl = (result.url ?? "").trim();
      if (!uploadedUrl) {
        toast({ variant: "error", title: "Upload failed", description: "No image URL was returned." });
        return;
      }
      const { type, index } = vars.target;
      if (type === "hero") {
        setSlideUrls((prev) => {
          const next = [...prev];
          while (next.length <= index) next.push("");
          next[index] = uploadedUrl;
          return next;
        });
      } else {
        setHowSteps((prev) => {
          const next = [...prev];
          while (next.length <= index) next.push({ image_url: "", label: "" });
          next[index] = { ...next[index], image_url: uploadedUrl };
          return next;
        });
      }
      toast({ variant: "success", title: "Image uploaded", description: "We filled in the image URL for you." });
    },
    onError: (e: unknown) => {
      const message = (e as { message?: string })?.message ?? "Could not upload image.";
      toast({ variant: "error", title: "Upload failed", description: message });
    },
  });

  useEffect(() => {
    if (!query.data) return;
    const d = query.data;
    if (d.hero) {
      if (d.hero.kicker != null) setHeroKicker(d.hero.kicker);
      if (d.hero.headline != null) setHeroHeadline(d.hero.headline);
      if (d.hero.subtext != null) setHeroSubtext(d.hero.subtext);
      if (d.hero.slide_urls?.length) setSlideUrls(d.hero.slide_urls);
      if (d.hero.slide_focus?.length) setSlideFocus(d.hero.slide_focus);
      const f = d.hero.falling;
      if (f) {
        setFallingEnabled(f.enabled !== false);
        if (f.phrases?.length) setFallingPhrasesText(f.phrases.join("\n"));
        if (f.duration_min != null) setFallingDurMin(f.duration_min);
        if (f.duration_max != null) setFallingDurMax(f.duration_max);
        if (f.max_phrases != null) setFallingMaxPhrases(f.max_phrases);
        if (f.stagger != null) setFallingStagger(f.stagger);
      }
    }
    if (d.lease) {
      if (d.lease.title != null) setLeaseTitle(d.lease.title);
      if (d.lease.subtitle != null) setLeaseSubtitle(d.lease.subtitle);
    }
    if (d.how_it_works?.length)
      setHowSteps(
        d.how_it_works.map((s) => ({
          image_url: s.image_url ?? "",
          label: s.label ?? "",
          image_focus: s.image_focus ?? "center",
        }))
      );

    if (d.footer) {
      setFacebookUrl(d.footer.facebook_url ?? DEFAULT_FOOTER.facebook_url);
      setTwitterUrl(d.footer.twitter_url ?? DEFAULT_FOOTER.twitter_url);
      setGooglePlusUrl(d.footer.google_plus_url ?? DEFAULT_FOOTER.google_plus_url);
      setInstagramUrl(d.footer.instagram_url ?? DEFAULT_FOOTER.instagram_url);
      setYoutubeUrl(d.footer.youtube_url ?? DEFAULT_FOOTER.youtube_url);
      setFooterAddress(d.footer.address_line ?? DEFAULT_FOOTER.address_line);
      setFooterPhoneLine(d.footer.phone_line ?? DEFAULT_FOOTER.phone_line);
      setFooterDisclosure((d.footer.footer_disclosure ?? "").trim() || FOOTER_DISCLOSURE_DEFAULT);
      setFooterCopyright(d.footer.copyright_line ?? DEFAULT_FOOTER.copyright_line);
      setFooterLeaseLabel(d.footer.link_lease_label ?? DEFAULT_FOOTER.link_lease_label);
      setFooterLeaseUrl(d.footer.link_lease_url ?? DEFAULT_FOOTER.link_lease_url);
      setFooterBrokerLabel(d.footer.link_broker_label ?? DEFAULT_FOOTER.link_broker_label);
      setFooterBrokerUrl(d.footer.link_broker_url ?? DEFAULT_FOOTER.link_broker_url);
    }
  }, [query.data]);

  const updateMutation = useMutation({
    mutationFn: (payload: LandingPageUpdatePayload) => api.updateLandingPage(payload),
    onSuccess: () => {
      query.refetch();
      void queryClient.invalidateQueries({ queryKey: ["landing-page"] });
      toast({ variant: "success", title: "Live homepage updated" });
    },
    onError: (e: unknown) => {
      toast({ variant: "error", title: "Save failed", description: (e as { message?: string })?.message });
    },
  });

  const handleSave = () => {
    if (typeof window !== "undefined") {
      const ok = window.confirm(
        "Save to the live homepage now? Visitors will see hero, falling phrases, lease section, how-it-works, and footer changes immediately."
      );
      if (!ok) return;
    }
    updateMutation.mutate({
      hero: {
        kicker: heroKicker,
        headline: heroHeadline,
        subtext: heroSubtext,
        slide_urls: slideUrls.filter(Boolean),
        slide_focus: slideFocus.slice(0, slideUrls.length),
        falling: {
          enabled: fallingEnabled,
          phrases: fallingPhrasesText
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          duration_min: Math.max(8, Math.min(90, Math.round(Number(fallingDurMin) || 19))),
          duration_max: Math.max(8, Math.min(120, Math.round(Number(fallingDurMax) || 26))),
          max_phrases: Math.max(1, Math.min(24, Math.round(Number(fallingMaxPhrases) || 8))),
          stagger: Math.max(0.8, Math.min(5, Number(fallingStagger) || 2.4))
        }
      },
      lease: { title: leaseTitle, subtitle: leaseSubtitle },
      how_it_works: howSteps.map((s) => ({ image_url: s.image_url, label: s.label, image_focus: s.image_focus ?? "center" })),
      footer: {
        facebook_url: facebookUrl.trim(),
        twitter_url: twitterUrl.trim(),
        google_plus_url: googlePlusUrl.trim(),
        instagram_url: instagramUrl.trim(),
        youtube_url: youtubeUrl.trim(),
        address_line: footerAddress.trim(),
        phone_line: footerPhoneLine.trim(),
        footer_disclosure: footerDisclosure.trim(),
        copyright_line: footerCopyright.trim(),
        link_lease_label: footerLeaseLabel.trim(),
        link_lease_url: footerLeaseUrl.trim(),
        link_broker_label: footerBrokerLabel.trim(),
        link_broker_url: footerBrokerUrl.trim(),
      },
    });
  };

  const setHowStep = (index: number, field: "image_url" | "label" | "image_focus", value: string) => {
    setHowSteps((prev) => {
      const next = [...prev];
      while (next.length <= index) next.push({ image_url: "", label: "", image_focus: "center" });
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {!embedded && (
        <>
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-ink-900">
            <Layout className="h-5 w-5 text-brand-600" />
            Landing Page Content
          </h2>
          <p className="text-sm text-ink-600">
            Kicker = small line above the headline. Subtext = paragraph under it. Saving updates the live homepage.
          </p>
        </>
      )}
      {embedded ? (
        <p className="text-sm text-ink-600">
          Kicker vs subtext: use kicker for a short uppercase line; subtext for the longer supporting sentence under the headline.
        </p>
      ) : null}
      {query.isLoading && <p className="text-sm text-ink-500">Loading…</p>}

      <Card className="border-ink-200 bg-white">
        <CardHeader>
          <CardTitle className="text-lg">Hero section</CardTitle>
          <p className="text-sm font-normal text-ink-600">Headline and background carousel images.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Kicker (small text above headline)</Label>
            <Input value={heroKicker} onChange={(e) => setHeroKicker(e.target.value)} placeholder="e.g. SHOP, GET APPROVED..." className="mt-1" />
          </div>
          <div>
            <Label>Headline</Label>
            <Input value={heroHeadline} onChange={(e) => setHeroHeadline(e.target.value)} placeholder="Main headline" className="mt-1" />
          </div>
          <div>
            <Label>Subtext</Label>
            <Textarea value={heroSubtext} onChange={(e) => setHeroSubtext(e.target.value)} placeholder="Short description" rows={2} className="mt-1" />
          </div>
          <div className="space-y-2">
            <Label>Hero images</Label>
            <p className="text-xs text-ink-600">
              Pick images from your computer. We&apos;ll upload and show a small preview.
            </p>
            <div className="flex flex-wrap gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col items-start gap-2 text-xs">
                  <span className="text-ink-700">Hero image {i + 1}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      uploadImageMutation.mutate({ file, target: { type: "hero", index: i } });
                      e.target.value = "";
                    }}
                  />
                  {slideUrls[i] && (
                    <img
                      src={slideUrls[i]}
                      alt={`Hero image ${i + 1}`}
                      className="mt-1 h-16 w-24 rounded border border-ink-200 object-cover"
                    />
                  )}
                  <div className="space-y-1 text-xs">
                    <span className="text-ink-700">Image focus</span>
                    <select
                      className="mt-1 w-full rounded border border-ink-200 bg-white px-2 py-1 text-xs"
                      value={slideFocus[i] ?? "center"}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSlideFocus((prev) => {
                          const next = [...prev];
                          while (next.length <= i) next.push("center");
                          next[i] = value;
                          return next;
                        });
                      }}
                    >
                      <option value="center">Center</option>
                      <option value="top">Top</option>
                      <option value="bottom">Bottom</option>
                      <option value="left">Left</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
            {uploadImageMutation.isPending && (
              <p className="text-xs text-ink-500">Uploading image… please wait a moment.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-ink-200 bg-white">
        <CardHeader>
          <CardTitle className="text-lg">Hero falling phrases</CardTitle>
          <p className="text-sm font-normal text-ink-600">
            Decorative text that drifts behind the headline (left column). One phrase per line. Speed = how long each line takes to fall;
            max phrases = how many lines run at once; stagger = spacing in the loop (higher = fewer on screen).
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-ink-100 bg-ink-50/50 px-3 py-2">
            <div>
              <Label htmlFor="falling-enabled" className="text-sm font-medium text-ink-900">
                Enable falling phrases
              </Label>
              <p className="text-xs text-ink-500">Turn off to hide the animation on the public homepage.</p>
            </div>
            <Switch id="falling-enabled" checked={fallingEnabled} onCheckedChange={setFallingEnabled} />
          </div>
          <div>
            <Label>Phrases (one per line)</Label>
            <Textarea
              value={fallingPhrasesText}
              onChange={(e) => setFallingPhrasesText(e.target.value)}
              rows={10}
              className="mt-1 font-mono text-sm"
              placeholder={"The #1 Dealer Site\nIt's Very Easy"}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="fall-dur-min">Fall duration — min (seconds)</Label>
              <Input
                id="fall-dur-min"
                type="number"
                min={8}
                max={90}
                value={fallingDurMin}
                onChange={(e) => setFallingDurMin(Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="fall-dur-max">Fall duration — max (seconds)</Label>
              <Input
                id="fall-dur-max"
                type="number"
                min={8}
                max={120}
                value={fallingDurMax}
                onChange={(e) => setFallingDurMax(Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="fall-max">Max phrases at once (1–24)</Label>
              <Input
                id="fall-max"
                type="number"
                min={1}
                max={24}
                value={fallingMaxPhrases}
                onChange={(e) => setFallingMaxPhrases(Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="fall-stagger">Stagger (0.8–5)</Label>
              <Input
                id="fall-stagger"
                type="number"
                min={0.8}
                max={5}
                step={0.1}
                value={fallingStagger}
                onChange={(e) => setFallingStagger(Number(e.target.value))}
                className="mt-1"
              />
              <p className="mt-1 text-xs text-ink-500">Higher values spread phrases apart in time.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-ink-200 bg-white">
        <CardHeader>
          <CardTitle className="text-lg">Lease specials section</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Section title</Label>
            <Input value={leaseTitle} onChange={(e) => setLeaseTitle(e.target.value)} placeholder="Current Lease Specials Los Angeles" className="mt-1" />
          </div>
          <div>
            <Label>Subtitle (e.g. phone or tagline)</Label>
            <Input value={leaseSubtitle} onChange={(e) => setLeaseSubtitle(e.target.value)} placeholder="Shop and compare..." className="mt-1" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-ink-200 bg-white">
        <CardHeader>
          <CardTitle className="text-lg">How it works (3 steps)</CardTitle>
          <p className="text-sm font-normal text-ink-600">Image and label for each step.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-lg border border-ink-200 bg-ink-50/50 p-4 space-y-2">
              <Label>Step {i + 1}</Label>
              <Input
                value={howSteps[i]?.label ?? ""}
                onChange={(e) => setHowStep(i, "label", e.target.value)}
                placeholder="Label (e.g. Browse Statewide Inventory)"
                className="mt-1"
              />
              <div className="space-y-1 text-xs">
                <span className="text-ink-700">Step image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    uploadImageMutation.mutate({ file, target: { type: "how", index: i } });
                    e.target.value = "";
                  }}
                />
                {howSteps[i]?.image_url && (
                  <img
                    src={howSteps[i].image_url}
                    alt={`Step ${i + 1}`}
                    className="mt-1 h-16 w-24 rounded border border-ink-200 object-cover"
                  />
                )}
              </div>
              <div className="space-y-1 text-xs">
                <span className="text-ink-700">Image focus</span>
                <select
                  className="mt-1 w-full rounded border border-ink-200 bg-white px-2 py-1 text-xs"
                  value={howSteps[i]?.image_focus ?? "center"}
                  onChange={(e) => setHowStep(i, "image_focus", e.target.value)}
                >
                  <option value="center">Center</option>
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                </select>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-ink-200 bg-white">
        <CardHeader>
          <CardTitle className="text-lg">Footer contact & disclosure</CardTitle>
          <p className="text-sm font-normal text-ink-600">
            Address, phones, legal/pricing disclosure (bottom of site footer), copyright line, and footer nav links.
            Leave copyright blank to use the default (© current year, PTI WebTech). Use {"{year}"} in a custom line for the
            current year. Clear the disclosure field entirely and save to restore the built-in default text.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Address line</Label>
              <Input value={footerAddress} onChange={(e) => setFooterAddress(e.target.value)} placeholder="Street, city, state ZIP" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Phone line</Label>
              <Input
                value={footerPhoneLine}
                onChange={(e) => setFooterPhoneLine(e.target.value)}
                placeholder="818.705.9200, 818.705.9202"
              />
              <p className="text-xs text-ink-500">Comma-separated numbers become clickable tel: links.</p>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Footer disclosure (legal / pricing)</Label>
              <Textarea
                value={footerDisclosure}
                onChange={(e) => setFooterDisclosure(e.target.value)}
                placeholder="Long-form disclaimer; URLs become clickable links on the site."
                rows={12}
                className="mt-1 min-h-[200px] font-mono text-xs leading-relaxed"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Copyright line (optional)</Label>
              <Input
                value={footerCopyright}
                onChange={(e) => setFooterCopyright(e.target.value)}
                placeholder="Leave empty for default © … PTI WebTech"
              />
            </div>
            <div className="space-y-2">
              <Label>Footer link — label</Label>
              <Input value={footerLeaseLabel} onChange={(e) => setFooterLeaseLabel(e.target.value)} placeholder="Lease Specials Los Angeles" />
            </div>
            <div className="space-y-2">
              <Label>Footer link — URL</Label>
              <Input value={footerLeaseUrl} onChange={(e) => setFooterLeaseUrl(e.target.value)} placeholder="/lease-specials" />
            </div>
            <div className="space-y-2">
              <Label>Second footer link — label</Label>
              <Input value={footerBrokerLabel} onChange={(e) => setFooterBrokerLabel(e.target.value)} placeholder="Auto Broker Los Angeles" />
            </div>
            <div className="space-y-2">
              <Label>Second footer link — URL</Label>
              <Input value={footerBrokerUrl} onChange={(e) => setFooterBrokerUrl(e.target.value)} placeholder="/most-reviewed-auto-broker-los-angeles" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-ink-200 bg-white">
        <CardHeader>
          <CardTitle className="text-lg">Footer social links</CardTitle>
          <p className="text-sm font-normal text-ink-600">These links appear in the site footer.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Facebook URL</Label>
              <Input value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="https://facebook.com/..." />
            </div>
            <div className="space-y-2">
              <Label>Twitter URL</Label>
              <Input value={twitterUrl} onChange={(e) => setTwitterUrl(e.target.value)} placeholder="https://twitter.com/..." />
            </div>
            <div className="space-y-2">
              <Label>Google+ URL</Label>
              <Input value={googlePlusUrl} onChange={(e) => setGooglePlusUrl(e.target.value)} placeholder="https://plus.google.com/..." />
            </div>
            <div className="space-y-2">
              <Label>Instagram URL</Label>
              <Input value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/..." />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>YouTube URL</Label>
              <Input value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/..." />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          <Save className="mr-2 h-4 w-4" />
          {updateMutation.isPending ? "Saving…" : "Save landing page"}
        </Button>
        <Button asChild variant="outline">
          <a href="/" target="_blank" rel="noreferrer">
            View home page
          </a>
        </Button>
      </div>
    </div>
  );
}
