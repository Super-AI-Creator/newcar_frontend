"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type User } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

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
      setEditing(null);
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

  const startEditing = (user: User) => {
    setEditing(user);
    setEditName(user.name ?? "");
    setEditPhone(user.phone ?? "");
    setEditRole(user.role);
    setEditEmailVerified(user.is_email_verified);
    setEditPhoneVerified(user.is_phone_verified);
  };

  const handleSave = () => {
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
        {isLoading && <p className="text-sm text-ink-500">Loading users…</p>}
        {isError && !isLoading && (
          <p className="text-sm text-red-600">Could not load users.</p>
        )}
        {!isLoading && filtered.length === 0 && (
          <p className="text-sm text-ink-500">No users found.</p>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-200 bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
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
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-ink-100 last:border-0">
                    <td className="px-2 py-1.5 text-ink-900">
                      {u.name || "(no name)"}
                    </td>
                    <td className="px-2 py-1.5 text-ink-700">{u.email}</td>
                    <td className="px-2 py-1.5 text-ink-700">
                      {u.phone || "—"}
                    </td>
                    <td className="px-2 py-1.5 text-xs font-semibold uppercase text-ink-700">
                      {u.role}
                    </td>
                    <td className="px-2 py-1.5 text-xs">
                      {u.is_email_verified ? "Yes" : "No"}
                    </td>
                    <td className="px-2 py-1.5 text-xs">
                      {u.is_phone_verified ? "Yes" : "No"}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEditing(u)}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                  <option value="customer">Customer</option>
                  <option value="dealer">Dealer</option>
                  <option value="broker_admin">Broker admin</option>
                  <option value="super_admin">Super admin</option>
                  <option value="credit_union">Credit union</option>
                </select>
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
                onClick={() => setEditing(null)}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Saving…" : "Save user"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

