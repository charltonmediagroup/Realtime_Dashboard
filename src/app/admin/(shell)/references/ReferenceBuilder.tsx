"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_PRIMARY_COLOR,
  PUBLISH_PARENTS,
  PUBLISH_PARENT_LABEL,
  slugify,
  makeUniqueId,
  type PublishParent,
  type ReferenceColumn,
  type ReferenceTemplate,
  type SavedReference,
} from "@/lib/savedReferencesShared";

type Status = { kind: "ok" | "err"; message: string } | null;

const TEMPLATES: { value: ReferenceTemplate; label: string; desc: string }[] = [
  { value: "light", label: "Light", desc: "Light background, dark text" },
  { value: "dark", label: "Dark", desc: "Dark background, light text" },
];

type Tab = { sheetId: number | null; title: string; index: number };

export default function ReferenceBuilder({
  mode,
  existingIds,
  existingList,
  initial,
}: {
  mode: "new" | "edit";
  existingIds: string[];
  existingList: SavedReference[];
  initial?: SavedReference;
}) {
  const router = useRouter();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [url, setUrl] = useState(initial?.spreadsheetUrl ?? "");
  const [resolvedSheetId, setResolvedSheetId] = useState(
    initial?.spreadsheetId ?? "",
  );
  const [resolvedSheetTitle, setResolvedSheetTitle] = useState("");
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [tabName, setTabName] = useState(initial?.tabName ?? "");
  const [columns, setColumns] = useState<ReferenceColumn[]>(initial?.columns ?? []);
  const [template, setTemplate] = useState<ReferenceTemplate>(
    initial?.template ?? "light",
  );
  const [primaryColor, setPrimaryColor] = useState<string>(
    initial?.primaryColor ?? DEFAULT_PRIMARY_COLOR,
  );
  const [rowsPerPage, setRowsPerPage] = useState<number>(initial?.rowsPerPage ?? 25);
  const [published, setPublished] = useState<boolean>(initial?.published ?? false);
  const [publishParent, setPublishParent] = useState<PublishParent>(
    initial?.publishParent ?? "",
  );
  const [publishSlug, setPublishSlug] = useState<string>(
    initial?.publishSlug ?? "",
  );

  const [tabsBusy, setTabsBusy] = useState(false);
  const [headersBusy, setHeadersBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  // Auto-load tabs in edit mode
  useEffect(() => {
    if (mode === "edit" && initial?.spreadsheetUrl) {
      void loadTabs(initial.spreadsheetUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadTabs(forUrl?: string) {
    const u = (forUrl ?? url).trim();
    if (!u) {
      setStatus({ kind: "err", message: "Enter a Google Sheet URL or ID" });
      return;
    }
    setTabsBusy(true);
    setStatus(null);
    try {
      const res = await fetch(
        `/api/admin/sheets/tabs?id=${encodeURIComponent(u)}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setResolvedSheetId(data.spreadsheetId);
      setResolvedSheetTitle(data.title || "");
      setTabs(data.tabs as Tab[]);
      // Pre-select previous tab if still present, else first tab
      const prev = tabName;
      const next =
        prev && (data.tabs as Tab[]).some((t) => t.title === prev)
          ? prev
          : (data.tabs[0]?.title ?? "");
      if (next && next !== tabName) setTabName(next);
      else if (next === tabName) await loadHeaders(data.spreadsheetId, next);
    } catch (e) {
      setStatus({ kind: "err", message: (e as Error).message });
    } finally {
      setTabsBusy(false);
    }
  }

  // Reload headers when tab changes
  useEffect(() => {
    if (resolvedSheetId && tabName) {
      void loadHeaders(resolvedSheetId, tabName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabName, resolvedSheetId]);

  async function loadHeaders(id: string, tab: string) {
    setHeadersBusy(true);
    setStatus(null);
    try {
      const res = await fetch(
        `/api/admin/sheets/headers?id=${encodeURIComponent(id)}&tab=${encodeURIComponent(tab)}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      const headers: string[] = (data.headers ?? []).filter(Boolean);
      // Merge with existing column config: keep visible/label for matching sources
      const prevByName = new Map(columns.map((c) => [c.source, c]));
      const merged: ReferenceColumn[] = headers.map((h) => {
        const prev = prevByName.get(h);
        return {
          source: h,
          label: prev?.label ?? "",
          visible: prev ? prev.visible : true,
        };
      });
      setColumns(merged);
    } catch (e) {
      setStatus({ kind: "err", message: (e as Error).message });
    } finally {
      setHeadersBusy(false);
    }
  }

  function updateColumn(i: number, patch: Partial<ReferenceColumn>) {
    setColumns((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }
  function moveColumn(i: number, dir: -1 | 1) {
    setColumns((cs) => {
      const j = i + dir;
      if (j < 0 || j >= cs.length) return cs;
      const out = cs.slice();
      [out[i], out[j]] = [out[j], out[i]];
      return out;
    });
  }
  function setAllVisible(v: boolean) {
    setColumns((cs) => cs.map((c) => ({ ...c, visible: v })));
  }

  async function save() {
    setStatus(null);
    if (!title.trim()) {
      setStatus({ kind: "err", message: "Title is required" });
      return;
    }
    if (!resolvedSheetId) {
      setStatus({ kind: "err", message: "Load the sheet first" });
      return;
    }
    if (!tabName) {
      setStatus({ kind: "err", message: "Pick a tab" });
      return;
    }
    if (!columns.some((c) => c.visible)) {
      setStatus({ kind: "err", message: "Check at least one column to display" });
      return;
    }

    const id =
      mode === "edit" && initial
        ? initial.id
        : makeUniqueId(slugify(title.trim()), existingIds);

    const finalSlug = published
      ? slugify(publishSlug.trim() || title.trim() || id)
      : "";
    if (published) {
      if (!finalSlug) {
        setStatus({ kind: "err", message: "Publish slug is required" });
        return;
      }
      // Check slug uniqueness within the chosen parent
      const collision = existingList.find(
        (r) =>
          r.id !== id &&
          r.published &&
          r.publishParent === publishParent &&
          r.publishSlug === finalSlug,
      );
      if (collision) {
        setStatus({
          kind: "err",
          message: `Another reference already publishes to /dashboard/${
            publishParent ? publishParent + "/" : ""
          }${finalSlug}`,
        });
        return;
      }
    }

    const now = Date.now();
    const ref: SavedReference = {
      id,
      title: title.trim(),
      spreadsheetId: resolvedSheetId,
      spreadsheetUrl: url.trim(),
      tabName,
      columns: columns.map((c) => ({
        source: c.source,
        label: c.label.trim(),
        visible: c.visible,
      })),
      template,
      primaryColor,
      rowsPerPage,
      published,
      publishParent,
      publishSlug: finalSlug,
      createdAt: mode === "edit" && initial ? initial.createdAt : now,
      updatedAt: now,
    };

    const updated =
      mode === "edit"
        ? existingList.map((r) => (r.id === id ? ref : r))
        : [...existingList, ref];

    setSaving(true);
    try {
      const res = await fetch(
        "/api/json-provider/dashboard-config/saved-references",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updated),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      router.replace(`/admin/references/${encodeURIComponent(id)}`);
      router.refresh();
    } catch (e) {
      setStatus({ kind: "err", message: (e as Error).message });
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Field label="Title">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
          placeholder="e.g. Sales pipeline"
        />
      </Field>

      <Field label="Google Sheet URL or ID">
        <div className="flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 border border-neutral-300 rounded px-3 py-2 text-sm font-mono text-xs"
            placeholder="https://docs.google.com/spreadsheets/d/…"
          />
          <button
            type="button"
            onClick={() => loadTabs()}
            disabled={tabsBusy || !url.trim()}
            className="px-3 py-1.5 text-sm border border-neutral-300 rounded hover:bg-neutral-50 disabled:opacity-50 whitespace-nowrap"
          >
            {tabsBusy ? "Loading…" : "Load tabs"}
          </button>
        </div>
        {resolvedSheetTitle && (
          <div className="text-xs text-neutral-500 mt-1">
            Sheet: <span className="font-medium">{resolvedSheetTitle}</span>
          </div>
        )}
      </Field>

      {tabs.length > 0 && (
        <Field label="Tab">
          <select
            value={tabName}
            onChange={(e) => setTabName(e.target.value)}
            className="w-full border border-neutral-300 rounded px-3 py-2 text-sm bg-white"
          >
            <option value="">Select a tab…</option>
            {tabs.map((t) => (
              <option key={t.title} value={t.title}>
                {t.title}
              </option>
            ))}
          </select>
        </Field>
      )}

      {tabName && (
        <Field
          label={
            <span className="flex items-center gap-3">
              <span>Columns</span>
              {headersBusy ? (
                <span className="text-xs text-neutral-500">Loading…</span>
              ) : columns.length > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={() => setAllVisible(true)}
                    className="text-xs text-blue-700 hover:underline"
                  >
                    Check all
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllVisible(false)}
                    className="text-xs text-neutral-500 hover:underline"
                  >
                    Uncheck all
                  </button>
                </>
              ) : null}
            </span>
          }
        >
          {columns.length === 0 && !headersBusy && (
            <div className="text-xs text-neutral-400">
              No headers found in row 1 of this tab.
            </div>
          )}
          {columns.length > 0 && (
            <div className="border border-neutral-200 rounded bg-white divide-y divide-neutral-100">
              {columns.map((c, i) => (
                <div
                  key={`${c.source}-${i}`}
                  className="flex items-center gap-3 px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked={c.visible}
                    onChange={(e) => updateColumn(i, { visible: e.target.checked })}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-mono truncate">{c.source}</div>
                  </div>
                  {c.visible && (
                    <input
                      value={c.label}
                      onChange={(e) => updateColumn(i, { label: e.target.value })}
                      placeholder={`Display as… (default: ${c.source})`}
                      className="w-56 border border-neutral-200 rounded px-2 py-1 text-xs"
                    />
                  )}
                  <div className="text-neutral-400">
                    <button
                      type="button"
                      onClick={() => moveColumn(i, -1)}
                      disabled={i === 0}
                      className="px-1 hover:text-neutral-700 disabled:opacity-30"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveColumn(i, 1)}
                      disabled={i === columns.length - 1}
                      className="px-1 hover:text-neutral-700 disabled:opacity-30"
                      title="Move down"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Field>
      )}

      <Field label="Template">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TEMPLATES.map((t) => (
            <label
              key={t.value}
              className={`border rounded px-3 py-2 cursor-pointer text-sm ${
                template === t.value
                  ? "border-neutral-900 bg-neutral-50"
                  : "border-neutral-200 hover:border-neutral-400"
              }`}
            >
              <input
                type="radio"
                className="mr-2"
                checked={template === t.value}
                onChange={() => setTemplate(t.value)}
              />
              <span className="font-medium">{t.label}</span>
              <div className="text-xs text-neutral-500 mt-0.5">{t.desc}</div>
            </label>
          ))}
        </div>
      </Field>

      <Field label="Theme color">
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="h-9 w-14 border border-neutral-300 rounded cursor-pointer"
          />
          <input
            type="text"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="w-32 border border-neutral-300 rounded px-2 py-1.5 text-xs font-mono"
            placeholder="#1d4ed8"
          />
          <span
            className="inline-block px-3 py-1 text-xs text-white rounded"
            style={{ backgroundColor: primaryColor }}
          >
            preview
          </span>
        </div>
        <div className="text-xs text-neutral-500 mt-1">
          Used for the header bar, title, and accents on the public page.
        </div>
      </Field>

      <Field label="Rows per page">
        <input
          type="number"
          min={1}
          max={500}
          value={rowsPerPage}
          onChange={(e) => setRowsPerPage(Math.max(1, Number(e.target.value) || 1))}
          className="w-32 border border-neutral-300 rounded px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Publish to dashboard">
        <div className="border border-neutral-200 rounded bg-white p-3 space-y-3">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            Make this reference visible at a public dashboard URL
          </label>
          {published && (
            <div className="space-y-2 pl-6">
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-neutral-600 w-20">Section</label>
                <select
                  value={publishParent}
                  onChange={(e) =>
                    setPublishParent(e.target.value as PublishParent)
                  }
                  className="border border-neutral-300 rounded px-2 py-1 text-sm bg-white"
                >
                  {PUBLISH_PARENTS.map((p) => (
                    <option key={p} value={p}>
                      {PUBLISH_PARENT_LABEL[p]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-neutral-600 w-20">Slug</label>
                <input
                  value={publishSlug}
                  onChange={(e) => setPublishSlug(e.target.value)}
                  placeholder={
                    title ? slugify(title) : "custom-page"
                  }
                  className="flex-1 min-w-[200px] border border-neutral-300 rounded px-2 py-1 text-sm font-mono"
                />
              </div>
              <div className="text-xs text-neutral-500 pl-1">
                Will be visible at:{" "}
                <code className="font-mono bg-neutral-100 px-1 rounded">
                  /dashboard
                  {publishParent ? `/${publishParent}` : ""}/
                  {slugify(publishSlug || title || "custom-page")}
                </code>
              </div>
            </div>
          )}
        </div>
      </Field>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-4 py-2 text-sm bg-neutral-900 text-white rounded hover:bg-neutral-800 disabled:opacity-50"
        >
          {saving ? "Saving…" : mode === "edit" ? "Save changes" : "Create reference"}
        </button>
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

function Field({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-xs text-neutral-600 mb-1">{label}</div>
      {children}
    </label>
  );
}

