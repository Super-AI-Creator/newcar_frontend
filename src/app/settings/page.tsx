"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "@/components/site-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";

export default function SettingsPage() {
  const { user, refresh } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace("/login?returnUrl=/settings");
      return;
    }
    setName(user.name ?? "");
    setPhone(user.phone ?? "");
  }, [user, router]);

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      setProfileMessage("Name is required.");
      return;
    }
    setProfileMessage(null);
    setSavingProfile(true);
    try {
      await api.updateProfile({ name: name.trim(), phone: phone.trim() || undefined });
      await refresh();
      setProfileMessage("Profile updated.");
    } catch (error: any) {
      setProfileMessage(error?.message ?? "Could not update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      setPasswordMessage("Fill both password fields.");
      return;
    }
    setPasswordMessage(null);
    setSavingPassword(true);
    try {
      await api.changePassword({ current_password: currentPassword, new_password: newPassword });
      setPasswordMessage("Password changed.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (error: any) {
      setPasswordMessage(error?.message ?? "Could not change password.");
    } finally {
      setSavingPassword(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="app-page min-h-screen">
      <SiteHeader />
      <main className="app-main space-y-8">
        <section className="flex flex-col gap-4 rounded-2xl border border-ink-200 bg-gradient-to-r from-ink-900 via-ink-800 to-ink-900 px-6 py-5 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-200">
              Account
            </p>
            <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
              {user.name || "Your profile"}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-zinc-200">
              Update your personal details and keep your login secure. Changes apply across the
              admin workspace.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-700 text-lg font-semibold">
              {(user.name || user.email || "?").charAt(0).toUpperCase()}
            </div>
            <div className="space-y-1 text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-brand-200">
                {user.role}
              </p>
              <p className="text-xs text-zinc-300">
                {user.is_email_verified ? "Email verified" : "Email not verified"}
                {user.is_phone_verified ? " · Phone verified" : ""}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Card className="border-ink-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink-900">Profile details</p>
                  <p className="mt-1 text-xs text-ink-500">
                    These details are used on deals, messages, and internal tools.
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {profileMessage && (
                <p className="rounded-md bg-ink-50 px-3 py-2 text-xs text-ink-800">
                  {profileMessage}
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="How should we address you?"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Optional mobile number"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user.email ?? ""} disabled />
                <p className="text-xs text-ink-500">
                  Email is used for login and system notifications.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <p className="text-xs text-ink-500">
                  Make sure your name and phone match what customers will see.
                </p>
                <Button onClick={handleSaveProfile} disabled={savingProfile} size="sm">
                  {savingProfile ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-ink-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle>
                <div>
                  <p className="text-sm font-semibold text-ink-900">Password & security</p>
                  <p className="mt-1 text-xs text-ink-500">
                    Choose a strong password to keep your workspace secure.
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {passwordMessage && (
                <p className="rounded-md bg-ink-50 px-3 py-2 text-xs text-ink-800">
                  {passwordMessage}
                </p>
              )}
              <div className="space-y-2">
                <Label>Current password</Label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                />
              </div>
              <div className="space-y-2">
                <Label>New password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
                <p className="text-xs text-ink-500">
                  Use a mix of letters, numbers, and symbols. Avoid reusing passwords.
                </p>
              </div>
              <div className="flex justify-end pt-1">
                <Button onClick={handleChangePassword} disabled={savingPassword} size="sm">
                  {savingPassword ? "Saving…" : "Change password"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}

