"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type User } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ELEVATED_ROLES = new Set(["super_admin", "broker_admin"]);
const ROLE_GROUPS: Array<{ key: string; label: string; roles?: string[] }> = [
  { key: "admins", label: "Admins", roles: ["super_admin", "broker_admin"] },
  { key: "customers", label: "Customers", roles: ["customer"] },
  { key: "dealers", label: "Dealers", roles: ["dealer"] },
  { key: "credit_unions", label: "Credit Unions", roles: ["credit_union"] },
  { key: "other", label: "Other roles" },
];

function roleRequiresConfirm(nextRole: string, previousRole: string) {
  return ELEVATED_ROLES.has(nextRole) && nextRole !== previousRole;
}

export default function UserManagement() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-users"],
    queryFn: api.adminUsers,
  });

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState("customer");
  const [editEmailVerified, setEditEmailVerified] = useState(false);
  const [editPhoneVerified, setEditPhoneVerified] = useState(false);
  const [roleConfirmOpen, setRoleConfirmOpen] = useState(false);
  const [roleConfirmInput, setRoleConfirmInput] = useState("");
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const [passwordResetOpen, setPasswordResetOpen] = useState(false);
  const [passwordResetInput, setPasswordResetInput] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");

  const updateMutation = useMutation({
    mutationFn: (payload: {
      id: number;
      name: string;
      phone: string;
      role: string;
      is_email_verified: boolean;
      is_phone_verified: boolean;
    }) =>
      api.adminUpdateUser(payload.id, {
        name: payload.name,
        phone: payload.phone || null,
        role: payload.role,
        is_email_verified: payload.is_email_verified,
        is_phone_verified: payload.is_phone_verified,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setAdminMessage("User updated.");
      setEditing(null);
    },
    onError: (error: any) => {
      setAdminMessage(error?.message ?? "Could not update user.");
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (payload: { id: number; new_password: string }) =>
      api.adminResetUserPassword(payload.id, { new_password: payload.new_password }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setAdminMessage("Password reset saved.");
      setPasswordResetInput("");
      setPasswordResetOpen(false);
    },
    onError: (error: any) => {
      setAdminMessage(error?.message ?? "Could not reset password.");
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) => api.adminDeleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setAdminMessage("User deleted.");
      setDeleteConfirmInput("");
      setDeleteConfirmOpen(false);
      setEditing(null);
    },
    onError: (error: any) => {
      setAdminMessage(error?.message ?? "Could not delete user.");
    },
  });

  const users: User[] = data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const name = (u.name ?? "").toLowerCase();
      return u.email.toLowerCase().includes(q) || name.includes(q);
    });
  }, [users, search]);

  const groupedFiltered = useMemo(() => {
    return ROLE_GROUPS.map((group) => {
      const items = filtered.filter((u) => {
        if (!group.roles) {
          return !ROLE_GROUPS.some((g) => g.roles?.includes(u.role));
        }
        return group.roles.includes(u.role);
      });
      return { ...group, items };
    }).filter((group) => group.items.length > 0);
  }, [filtered]);

  const startEditing = (user: User) => {
    setAdminMessage(null);
    setEditing(user);
    setEditName(user.name ?? "");
    setEditPhone(user.phone ?? "");
    setEditRole(user.role);
    setEditEmailVerified(user.is_email_verified);
    setEditPhoneVerified(user.is_phone_verified);
  };

  const commitSave = () => {
    if (!editing) return;
    updateMutation.mutate({
      id: editing.id,
      name: editName.trim(),
      phone: editPhone.trim(),
      role: editRole,
      is_email_verified: editEmailVerified,
      is_phone_verified: editPhoneVerified,
    });
  };

  const handleSave = () => {
    if (!editing) return;
    if (roleRequiresConfirm(editRole, editing.role)) {
      setRoleConfirmInput("");
      setRoleConfirmOpen(true);
      return;
    }
    commitSave();
  };

  const handleConfirmElevatedRole = () => {
    if (!editing) return;
    const typed = roleConfirmInput.trim();
    const ok =
      typed.toUpperCase() === "CONFIRM" || typed.toLowerCase() === editing.email.trim().toLowerCase();
    if (!ok) return;
    setRoleConfirmOpen(false);
    commitSave();
  };

  const handleResetPassword = () => {
    if (!editing) return;
    const newPassword = passwordResetInput.trim();
    if (newPassword.length < 8) {
      setAdminMessage("New password must be at least 8 characters.");
      return;
    }
    resetPasswordMutation.mutate({ id: editing.id, new_password: newPassword });
  };

  const handleDeleteUser = () => {
    if (!editing) return;
    const typed = deleteConfirmInput.trim();
    const matches =
      typed.toUpperCase() === "DELETE" || typed.toLowerCase() === editing.email.trim().toLowerCase();
    if (!matches) return;
    deleteUserMutation.mutate(editing.id);
  };

  return (
    <Card className="bg-white border-ink-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <span>User Management</span>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email"
            className="h-8 max-w-xs text-sm"
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {adminMessage && (
          <p className="rounded-md bg-ink-50 px-3 py-2 text-sm text-ink-800">{adminMessage}</p>
        )}
        {isLoading && <p className="text-sm text-ink-500">Loading users…</p>}
        {isError && !isLoading && (
          <p className="text-sm text-red-600">Could not load users.</p>
        )}
        {!isLoading && filtered.length === 0 && (
          <p className="text-sm text-ink-500">No users found.</p>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="space-y-4">
            {groupedFiltered.map((group) => (
              <div key={group.key} className="rounded-xl border border-ink-200">
                <div className="flex items-center justify-between border-b border-ink-200 bg-ink-50 px-3 py-2">
                  <p className="text-sm font-semibold text-ink-900">{group.label}</p>
                  <p className="text-xs text-ink-600">
                    {group.items.length} user{group.items.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-ink-200 bg-white text-xs uppercase tracking-wide text-ink-500">
                        <th className="px-2 py-2">Name</th>
                        <th className="px-2 py-2">Email</th>
                        <th className="px-2 py-2">Phone</th>
                        <th className="px-2 py-2">Role</th>
                        <th className="px-2 py-2">Email verified</th>
                        <th className="px-2 py-2">Phone verified</th>
                        <th className="px-2 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((u) => (
                        <tr key={u.id} className="border-b border-ink-100 last:border-0">
                          <td className="px-2 py-1.5 text-ink-900">{u.name || "(no name)"}</td>
                          <td className="px-2 py-1.5 text-ink-700">{u.email}</td>
                          <td className="px-2 py-1.5 text-ink-700">{u.phone || "—"}</td>
                          <td className="px-2 py-1.5 text-xs font-semibold uppercase text-ink-700">{u.role}</td>
                          <td className="px-2 py-1.5 text-xs">{u.is_email_verified ? "Yes" : "No"}</td>
                          <td className="px-2 py-1.5 text-xs">{u.is_phone_verified ? "Yes" : "No"}</td>
                          <td className="px-2 py-1.5 text-right">
                            <Button size="sm" variant="outline" onClick={() => startEditing(u)}>
                              Edit
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {editing && (
          <div className="mt-4 rounded-xl border border-ink-200 bg-ink-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-ink-900">Edit user</p>
                <p className="text-xs text-ink-600">{editing.email}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditing(null)}
              >
                Close
              </Button>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-ink-700">
                  Name
                </label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-ink-700">
                  Phone
                </label>
                <Input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-ink-700">
                  Role
                </label>
                <select
                  className="h-10 w-full rounded-lg border border-ink-200 bg-white px-2 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                >
                  <optgroup label="Standard roles">
                    <option value="customer">Customer</option>
                    <option value="dealer">Dealer</option>
                    <option value="credit_union">Credit union</option>
                  </optgroup>
                  <optgroup label="Elevated / admin">
                    <option value="broker_admin">Broker admin</option>
                    <option value="super_admin">Super admin</option>
                  </optgroup>
                </select>
                <p className="text-[11px] text-ink-500">
                  Broker admin and super admin unlock full admin tools. Saving those roles requires confirmation.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <label className="flex items-center justify-between text-xs font-medium text-ink-700">
                  <span>Email verified</span>
                  <Switch
                    checked={editEmailVerified}
                    onCheckedChange={(v) =>
                      setEditEmailVerified(Boolean(v))
                    }
                  />
                </label>
                <label className="flex items-center justify-between text-xs font-medium text-ink-700">
                  <span>Phone verified</span>
                  <Switch
                    checked={editPhoneVerified}
                    onCheckedChange={(v) =>
                      setEditPhoneVerified(Boolean(v))
                    }
                  />
                </label>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setAdminMessage(null);
                  setPasswordResetInput("");
                  setPasswordResetOpen(true);
                }}
                disabled={updateMutation.isPending || resetPasswordMutation.isPending || deleteUserMutation.isPending}
              >
                Reset password
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-red-200 text-red-700 hover:bg-red-50"
                onClick={() => {
                  setAdminMessage(null);
                  setDeleteConfirmInput("");
                  setDeleteConfirmOpen(true);
                }}
                disabled={updateMutation.isPending || resetPasswordMutation.isPending || deleteUserMutation.isPending}
              >
                Delete user
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing(null)}
                disabled={updateMutation.isPending || resetPasswordMutation.isPending || deleteUserMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateMutation.isPending || resetPasswordMutation.isPending || deleteUserMutation.isPending}
              >
                {updateMutation.isPending ? "Saving…" : "Save user"}
              </Button>
            </div>
          </div>
        )}

        <Dialog open={roleConfirmOpen} onOpenChange={setRoleConfirmOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm elevated role</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-ink-600">
              You are about to set <span className="font-medium text-ink-900">{editing?.email}</span> to{" "}
              <span className="font-mono text-xs">{editRole}</span>. Type <span className="font-semibold">CONFIRM</span> or the
              user&apos;s email to continue.
            </p>
            <Input
              value={roleConfirmInput}
              onChange={(e) => setRoleConfirmInput(e.target.value)}
              placeholder="CONFIRM or email"
              autoComplete="off"
            />
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setRoleConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmElevatedRole}
                disabled={
                  updateMutation.isPending ||
                  !roleConfirmInput.trim() ||
                  !(
                    roleConfirmInput.trim().toUpperCase() === "CONFIRM" ||
                    roleConfirmInput.trim().toLowerCase() === (editing?.email ?? "").trim().toLowerCase()
                  )
                }
              >
                Apply role change
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={passwordResetOpen} onOpenChange={setPasswordResetOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Reset user password</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-ink-600">
              Set a new password for <span className="font-medium text-ink-900">{editing?.email}</span>. The user can use it
              immediately after you save it.
            </p>
            <Input
              type="password"
              value={passwordResetInput}
              onChange={(e) => setPasswordResetInput(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setPasswordResetOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleResetPassword}
                disabled={resetPasswordMutation.isPending || passwordResetInput.trim().length < 8}
              >
                {resetPasswordMutation.isPending ? "Saving…" : "Save password"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete user</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-ink-600">
              This tries to permanently delete <span className="font-medium text-ink-900">{editing?.email}</span>. Type{" "}
              <span className="font-semibold">DELETE</span> or the user&apos;s email to continue.
            </p>
            <Input
              value={deleteConfirmInput}
              onChange={(e) => setDeleteConfirmInput(e.target.value)}
              placeholder="DELETE or email"
              autoComplete="off"
            />
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-red-600 text-white hover:bg-red-500"
                onClick={handleDeleteUser}
                disabled={
                  deleteUserMutation.isPending ||
                  !deleteConfirmInput.trim() ||
                  !(
                    deleteConfirmInput.trim().toUpperCase() === "DELETE" ||
                    deleteConfirmInput.trim().toLowerCase() === (editing?.email ?? "").trim().toLowerCase()
                  )
                }
              >
                {deleteUserMutation.isPending ? "Deleting…" : "Delete user"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

