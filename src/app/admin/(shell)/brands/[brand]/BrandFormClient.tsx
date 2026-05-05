"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Entry = Record<string, unknown>;

const KNOWN_FIELDS = [
  "name",
  "image",
  "url",
  "group",
  "editorial",
  "awards",
  "events",
] as const;

type Status = { kind: "ok" | "err"; message: string } | null;

export default function BrandFormClient({
  isNew,
  initialCode,
  initialEntry,
  existingCodes,
  allEntries,
}: {
  isNew: boolean;
  initialCode: string;
  initialEntry: Entry;
  existingCodes: string[];
  allEntries: Record<string, Entry>;
}) {
  const router = useRouter();

  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState(asString(initialEntry.name));
  const [image, setImage] = useState(asString(initialEntry.image));
  const [url, setUrl] = useState(asString(initialEntry.url));
  const [group, setGroup] = useState(asString(initialEntry.group));
  const [editorial, setEditorial] = useState(Boolean(initialEntry.editorial));
  const [awards, setAwards] = useState(Boolean(initialEntry.awards));
  const [events, setEvents] = useState(Boolean(initialEntry.events));

  const initialAdvanced = useMemo(() => {
    const extras: Entry = {};
    for (const [k, v] of Object.entries(initialEntry)) {
      if (!(KNOWN_FIELDS as readonly string[]).includes(k)) extras[k] = v;
    }
    return Object.keys(extras).length ? JSON.stringify(extras, null, 2) : "{}";
  }, [initialEntry]);
  const [advancedJson, setAdvancedJson] = useState(initialAdvanced);

  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);

  function buildEntry(): { ok: true; entry: Entry } | { ok: false; error: string } {
    let advanced: Entry = {};
    try {
      const parsed = JSON.parse(advancedJson || "{}");
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        advanced = parsed as Entry;
      } else {
        return { ok: false, error: "Advanced JSON must be an object" };
      }
    } catch (e) {
      return { ok: false, error: `Advanced JSON invalid: ${(e as Error).message}` };
    }
    const out: Entry = { ...advanced };
    if (name.trim()) out.name = name.trim();
    if (image.trim()) out.image = image.trim();
    if (url.trim()) out.url = url.trim();
    if (group.trim()) out.group = group.trim();
    if (editorial) out.editorial = true;
    if (awards) out.awards = true;
    if (events) out.events = true;
    return { ok: true, entry: out };
  }

  async function save() {
    setStatus(null);
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setStatus({ kind: "err", message: "Code is required" });
      return;
    }
    if (isNew && existingCodes.includes(trimmedCode)) {
      setStatus({ kind: "err", message: `Code "${trimmedCode}" already exists` });
      return;
    }
    const built = buildEntry();
    if (!built.ok) {
      setStatus({ kind: "err", message: built.error });
      return;
    }

    const next: Record<string, Entry> = { ...allEntries };
    if (!isNew && trimmedCode !== initialCode) {
      delete next[initialCode];
    }
    next[trimmedCode] = built.entry;

    setBusy(true);
    try {
      const res = await fetch(
        "/api/json-provider/dashboard-config/brand-all-properties",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      setStatus({ kind: "ok", message: "Saved." });
      if (isNew || trimmedCode !== initialCode) {
        router.replace(`/admin/brands/${encodeURIComponent(trimmedCode)}`);
      }
      router.refresh();
    } catch (e) {
      setStatus({ kind: "err", message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function deleteBrand() {
    if (isNew) return;
    if (!confirm(`Delete brand "${initialCode}"? This cannot be undone.`)) return;
    setBusy(true);
    setStatus(null);
    try {
      const next: Record<string, Entry> = { ...allEntries };
      delete next[initialCode];
      const res = await fetch(
        "/api/json-provider/dashboard-config/brand-all-properties",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      router.replace("/admin/brands");
      router.refresh();
    } catch (e) {
      setStatus({ kind: "err", message: (e as Error).message });
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Field label="Code (URL slug)">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={!isNew}
          className="w-full border border-neutral-300 rounded px-3 py-2 text-sm font-mono disabled:bg-neutral-100"
          placeholder="e.g. sbr"
        />
      </Field>
      <Field label="Name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
        />
      </Field>
      <Field label="Image">
        <input
          value={image}
          onChange={(e) => setImage(e.target.value)}
          className="w-full border border-neutral-300 rounded px-3 py-2 text-sm font-mono"
          placeholder="logo/SBR.png"
        />
      </Field>
      <Field label="URL">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
          placeholder="https://…"
        />
      </Field>
      <Field label="Group">
        <input
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          className="w-full border border-neutral-300 rounded px-3 py-2 text-sm font-mono"
          placeholder="qsr_media_group"
        />
      </Field>

      <div className="flex flex-wrap gap-4 pt-2">
        <Toggle label="Editorial" checked={editorial} onChange={setEditorial} />
        <Toggle label="Awards" checked={awards} onChange={setAwards} />
        <Toggle label="Events" checked={events} onChange={setEvents} />
      </div>

      <Field label="Advanced (JSON — extra fields like ga4_filter)">
        <textarea
          value={advancedJson}
          onChange={(e) => setAdvancedJson(e.target.value)}
          rows={8}
          className="w-full border border-neutral-300 rounded px-3 py-2 text-xs font-mono"
        />
      </Field>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="px-3 py-1.5 text-sm bg-neutral-900 text-white rounded hover:bg-neutral-800 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        {!isNew && (
          <button
            type="button"
            onClick={deleteBrand}
            disabled={busy}
            className="px-3 py-1.5 text-sm text-red-700 border border-red-200 rounded hover:bg-red-50"
          >
            Delete brand
          </button>
        )}
        {status && (
          <span
            className={`text-sm ${
              status.kind === "ok" ? "text-green-700" : "text-red-700"
            }`}
          >
            {status.message}
          </span>
        )}
      </div>
    </div>
  );
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs text-neutral-600 mb-1">{label}</div>
      {children}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
