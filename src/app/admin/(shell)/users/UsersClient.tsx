"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminUserPublic } from "@/lib/adminUsers";

type Status = { kind: "ok" | "err"; message: string } | null;

export default function UsersClient({
  initial,
  currentUsername,
}: {
  initial: AdminUserPublic[];
  currentUsername: string;
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initial);
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [pwTarget, setPwTarget] = useState<string | null>(null);
  const [pwValue, setPwValue] = useState("");

  async function refresh() {
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    setUsers(data.users ?? []);
  }

  async function createUser() {
    setStatus(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername, password: newPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      setStatus({ kind: "ok", message: `Created ${newUsername}` });
      setNewUsername("");
      setNewPassword("");
      await refresh();
    } catch (e) {
      setStatus({ kind: "err", message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function changePassword() {
    if (!pwTarget) return;
    setStatus(null);
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/users/${encodeURIComponent(pwTarget)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: pwValue }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      setStatus({ kind: "ok", message: `Password updated for ${pwTarget}` });
      setPwTarget(null);
      setPwValue("");
    } catch (e) {
      setStatus({ kind: "err", message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser(username: string) {
    if (!confirm(`Delete admin user "${username}"?`)) return;
    setStatus(null);
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/users/${encodeURIComponent(username)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      setStatus({ kind: "ok", message: `Deleted ${username}` });
      await refresh();
      router.refresh();
    } catch (e) {
      setStatus({ kind: "err", message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="border border-neutral-200 rounded bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-3 py-2 text-left">Username</th>
              <th className="px-3 py-2 text-left">Created</th>
              <th className="px-3 py-2 text-left">Last login</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.username} className="border-t border-neutral-100">
                <td className="px-3 py-2 font-mono">
                  {u.username}
                  {u.username === currentUsername && (
                    <span className="ml-2 text-xs text-neutral-500">(you)</span>
                  )}
                </td>
                <td className="px-3 py-2 text-neutral-600 text-xs">
                  {fmt(u.createdAt)}
                </td>
                <td className="px-3 py-2 text-neutral-600 text-xs">
                  {u.lastLoginAt ? fmt(u.lastLoginAt) : "—"}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => {
                      setPwTarget(u.username);
                      setPwValue("");
                    }}
                    className="text-xs text-blue-700 hover:underline"
                  >
                    Change password
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteUser(u.username)}
                    disabled={u.username === currentUsername}
                    className="ml-3 text-xs text-red-600 hover:text-red-800 disabled:text-neutral-300"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {pwTarget && (
        <section className="border border-neutral-200 rounded bg-white p-4">
          <h2 className="text-sm font-semibold mb-2">
            Change password for <span className="font-mono">{pwTarget}</span>
          </h2>
          <div className="flex flex-wrap items-end gap-2">
            <input
              type="password"
              value={pwValue}
              onChange={(e) => setPwValue(e.target.value)}
              placeholder="New password (min 6)"
              className="border border-neutral-300 rounded px-3 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={changePassword}
              disabled={busy || pwValue.length < 6}
              className="px-3 py-1.5 text-sm bg-neutral-900 text-white rounded hover:bg-neutral-800 disabled:opacity-50"
            >
              Update
            </button>
            <button
              type="button"
              onClick={() => setPwTarget(null)}
              className="px-3 py-1.5 text-sm border border-neutral-300 rounded hover:bg-neutral-50"
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      <section className="border border-neutral-200 rounded bg-white p-4">
        <h2 className="text-sm font-semibold mb-2">Add admin user</h2>
        <div className="flex flex-wrap items-end gap-2">
          <input
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="username"
            className="border border-neutral-300 rounded px-3 py-1.5 text-sm font-mono"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="password (min 6)"
            className="border border-neutral-300 rounded px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={createUser}
            disabled={busy || !newUsername.trim() || newPassword.length < 6}
            className="px-3 py-1.5 text-sm bg-neutral-900 text-white rounded hover:bg-neutral-800 disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </section>

      {status && (
        <div
          className={`text-sm ${
            status.kind === "ok" ? "text-green-700" : "text-red-700"
          }`}
        >
          {status.message}
        </div>
      )}
    </div>
  );
}

function fmt(ms: number): string {
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return String(ms);
  }
}
