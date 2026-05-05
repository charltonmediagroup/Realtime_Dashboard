"use client";

import { useState } from "react";

type Status = { kind: "ok" | "err"; message: string } | null;

export default function DocEditorClient({
  collection,
  document,
  initialJson,
  isCacheDoc,
}: {
  collection: string;
  document: string;
  initialJson: string;
  isCacheDoc: boolean;
}) {
  const [text, setText] = useState(initialJson);
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);

  async function put(payload: unknown, msg: string) {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch(
        `/api/json-provider/${encodeURIComponent(collection)}/${encodeURIComponent(document)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      setStatus({ kind: "ok", message: msg });
    } catch (e) {
      setStatus({ kind: "err", message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      setStatus({ kind: "err", message: `Invalid JSON: ${(e as Error).message}` });
      return;
    }
    await put(parsed, "Saved.");
  }

  async function invalidate() {
    if (!confirm("Reset this cache document to {} ? Next read rebuilds it.")) return;
    setText("{}");
    await put({}, "Cache invalidated. Next read will rebuild it.");
  }

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={24}
        className="w-full border border-neutral-300 rounded px-3 py-2 text-xs font-mono bg-white"
        spellCheck={false}
      />
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="px-3 py-1.5 text-sm bg-neutral-900 text-white rounded hover:bg-neutral-800 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        {isCacheDoc && (
          <button
            type="button"
            onClick={invalidate}
            disabled={busy}
            className="px-3 py-1.5 text-sm border border-amber-300 text-amber-800 bg-amber-50 rounded hover:bg-amber-100 disabled:opacity-50"
          >
            Invalidate cache
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
