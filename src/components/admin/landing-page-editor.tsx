"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast-provider";
import { api, type LandingPageContentRecord } from "@/lib/api";
import { Layout, Save } from "lucide-react";

const DEFAULT_HERO = {
  kicker: "SHOP,  GET APPROVED AND GET THE CAR DELIVERED TO YOUR DOOR WITH A RED BOW",
  headline: "Buy Any New Car in California Without the Dealership",
  subtext: "SHOP, GET APPROVED AND GET THE CAR DELIVERED TO YOUR DOOR WITH A RED BOW.",
  slide_urls: ["/images/landing_img (1).jpg", "/images/landing_img (2).jpg", "/images/landing_img (3).jpg", "/images/landing_img (4).jpg"],
  slide_focus: ["center", "center", "center", "center"] as string[],
};
const DEFAULT_LEASE = {
  title: "Current Lease Specials Los Angeles",
  subtitle: "Shop and compare hundreds of lease offers, if they make it, we have it! 818-705-9200",
};
const DEFAULT_HOW = [
  { image_url: "/images/hero-cars.jpg", label: "Browse Statewide Inventory", image_focus: "center" },
  { image_url: "/images/deal-1.jpg", label: "Get Your Best Rate", image_focus: "center" },
  { image_url: "/images/landing_img (1).jpg", label: "Home Delivery With a Bow", image_focus: "center" },
];

const DEFAULT_FOOTER = {
  facebook_url: "https://www.facebook.com/newcarsuperstore/",
  twitter_url: "https://twitter.com/autobrokerla",
  google_plus_url: "https://plus.google.com/101810114903929491113",
  instagram_url: "https://www.instagram.com/newcarsuperstore/",
  youtube_url: "https://www.youtube.com/channel/UCfnPH7n_x1cHc5WXDb0zMJQ",
};

export function LandingPageEditor({ embedded }: { embedded?: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
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
    }
  }, [query.data]);

  const updateMutation = useMutation({
    mutationFn: (payload: LandingPageContentRecord) => api.updateLandingPage(payload),
    onSuccess: () => {
      query.refetch();
      toast({ variant: "success", title: "Landing page content saved" });
    },
    onError: (e: unknown) => {
      toast({ variant: "error", title: "Save failed", description: (e as { message?: string })?.message });
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      hero: {
        kicker: heroKicker,
        headline: heroHeadline,
        subtext: heroSubtext,
        slide_urls: slideUrls.filter(Boolean),
        slide_focus: slideFocus.slice(0, slideUrls.length),
      },
      lease: { title: leaseTitle, subtitle: leaseSubtitle },
      how_it_works: howSteps.map((s) => ({ image_url: s.image_url, label: s.label, image_focus: s.image_focus ?? "center" })),
      footer: {
        facebook_url: facebookUrl.trim(),
        twitter_url: twitterUrl.trim(),
        google_plus_url: googlePlusUrl.trim(),
        instagram_url: instagramUrl.trim(),
        youtube_url: youtubeUrl.trim(),
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
          <h2 className="font-display text-xl font-semibold text-ink-900 flex items-center gap-2">
            <Layout className="h-5 w-5 text-brand-600" />
            Landing Page Content
          </h2>
          <p className="text-sm text-ink-600">Edit the text and image URLs shown on the home (landing) page. Save to publish.</p>
        </>
      )}
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
